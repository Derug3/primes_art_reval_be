import { BadRequestException, Logger } from '@nestjs/common';
import { SubscriberService } from 'src/subscriber/subscriber.service';
import { BoxConfig } from './entity/box_config.entity';
import { BoxConfigRepository } from './repository/box.config.repository';
import {
  Bidders,
  BoxConfigOutput,
  BoxState,
  BoxTimigState,
} from './types/box_config.types';
import {
  initBoxIx,
  parseAndValidatePlaceBidTx,
  primeBoxSeed,
  primeBoxTreasurySeed,
  program,
  programId,
  resolveBoxIx,
  sleep,
} from './utilities/helpers';
import { v4 } from 'uuid';
import Redis from 'ioredis';
import * as dayjs from 'dayjs';
import { NftService } from 'src/nft/nft.service';
import { Nft } from 'src/nft/entity/nft.entity';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { RecoverBoxService } from 'src/recover_box/recover_box.service';

export class BoxConfigWorker {
  box: BoxConfig;
  activeNft: Nft;
  bidsCount: number;
  boxTimingState: BoxTimigState;
  currentBid: number;
  bidder: string;
  isWon: boolean;
  hasResolved: boolean;
  bidders: Bidders[];

  logger = new Logger(BoxConfigWorker.name);

  constructor(
    private readonly subscriberService: SubscriberService,
    private readonly boxConfigRepo: BoxConfigRepository,
    boxConfig: BoxConfig,
    private readonly redisService: Redis,
    private readonly nftService: NftService,
    private readonly recoverBoxService: RecoverBoxService,
  ) {
    this.box = boxConfig;
    this.bidsCount = 0;
    this.isWon = false;
    this.currentBid = 0;
    this.bidders = [];
    this.hasResolved = false;

    this.start();
  }

  async start() {
    this.logger.debug(`Starting box ${this.box.boxId}`);
    this.currentBid = 0;
    this.bidsCount = 0;
    this.bidder = undefined;
    this.isWon = false;
    this.hasResolved = false;
    this.bidders = [];

    if (this.box.initialDelay && this.box.executionsCount === 0) {
      this.boxTimingState = {
        endsAt: dayjs().add(this.box.initialDelay, 'seconds').unix(),
        startedAt: dayjs().unix(),
        state: BoxState.Paused,
      };
      await this.publishBox();
      await sleep(this.box.initialDelay * 1000);
    }
    if (this.box.boxId) {
      const newBoxState = await this.boxConfigRepo.getBuyId(this.box.boxId);

      if (!newBoxState || newBoxState.boxState === BoxState.Removed) {
        this.logger.debug(`Stopping box with id ${this.box.boxId}`);
        this.boxTimingState = {
          endsAt: -1,
          startedAt: dayjs().unix(),
          state: BoxState.Removed,
        };
        await this.publishBox();
        return;
      }
      if (newBoxState.boxState === BoxState.Paused) {
        this.boxTimingState = {
          endsAt: dayjs().add(newBoxState.boxPause, 'seconds').unix(),
          startedAt: dayjs().unix(),
          state: BoxState.Paused,
        };
        await this.publishBox();

        await this.boxConfigRepo.save({
          ...this.box,
          boxState: BoxState.Active,
        });
        await sleep(newBoxState.boxPause * 1000);
      }
      this.box = newBoxState;
    }

    const boxSetup = await this.setupBox();
    this.logger.debug(boxSetup);
    if (!boxSetup) {
      await this.publishBox();
      return;
    }
    this.boxTimingState = {
      endsAt: dayjs().add(this.box.boxDuration, 'seconds').unix(),
      startedAt: dayjs().unix(),
      state: BoxState.Active,
    };
    await initBoxIx(this.getBoxPda(), this.box.boxId, this.box, this.activeNft);
    await this.getBox();
    this.logger.log('Box emitted');
    await sleep(this.box.boxDuration * 1000);

    await this.cooldown();
  }
  async cooldown() {
    await this.resolveBox();
    if (this.box.cooldownDuration > 0) {
      this.logger.log('Cooldown started');
      this.boxTimingState = {
        startedAt: dayjs().unix(),
        endsAt: dayjs().add(this.box.cooldownDuration, 'seconds').unix(),
        state: BoxState.Cooldown,
      };
      await this.getBox();

      await sleep(this.box.cooldownDuration * 1000);
    }
    await this.start();
  }

  getBoxPda() {
    return PublicKey.findProgramAddressSync(
      [primeBoxSeed, Buffer.from(this.box.boxId.split('-')[0])],
      new PublicKey(programId),
    )[0];
  }
  async resolveBox() {
    try {
      this.logger.log('Resolved box');

      const boxPda = this.getBoxPda();
      const box = await program.account.boxData.fetch(boxPda);
      let resolved = false;
      let hasTriedResolving = false;
      if (box.winnerAddress || box.bidder) {
        resolved = await resolveBoxIx(boxPda);
        hasTriedResolving = true;
      }
      if (!this.isWon && !this.hasResolved && !resolved) {
        this.logger.warn('Non resolved NFT');
        await this.nftService.updateNft(this.activeNft.nftId, false);
      } else {
        this.logger.log('Resolved NFT');
        await this.nftService.updateNft(this.activeNft.nftId, true);
      }
      await this.redisService.del(this.activeNft.nftId);
      await this.nftService.toggleNftBoxState(this.activeNft.nftId, false);
      this.box.executionsCount += 1;
      await this.getBox();
      if (!resolved && !this.hasResolved && hasTriedResolving) {
        const boxAddress = this.getBoxPda();
        const [boxTreasury] = PublicKey.findProgramAddressSync(
          [primeBoxTreasurySeed, boxAddress.toBuffer()],
          program.programId,
        );
        // TODO:check
        await this.recoverBoxService.saveFailedBox({
          boxData: boxAddress.toString(),
          failedAt: new Date(),
          id: v4(),
          nftId: this.activeNft.nftId,
          nftUri: this.activeNft.nftUri,
          winner: this.bidder,
          winningAmount: this.currentBid,
          boxTreasury: boxTreasury.toString(),
        });
      }
    } catch (error) {
      this.logger.error(error);
    }
  }

  async setupBox() {
    try {
      this.logger.log('Box setup');
      let nfts = await this.nftService.getNonMinted();

      if (nfts.length === 0) {
        this.box.boxState = BoxState.Minted;
        this.boxTimingState = {
          endsAt: -1,
          startedAt: -1,
          state: BoxState.Minted,
        };
        await this.boxConfigRepo.save(this.box);
        return false;
      }

      const nonShuffled = nfts.filter((n) => n.reshuffleCount === 0);

      if (nonShuffled.length !== 0) {
        nfts = nonShuffled;
      }
      let acknowledged = 0;
      do {
        const rand = Math.round(Math.random() * (nfts.length - 1));
        const randomNft = nfts[rand];
        acknowledged = await this.redisService.setnx(
          randomNft.nftId,
          JSON.stringify(randomNft),
        );
        this.activeNft = randomNft;
      } while (acknowledged === 0);

      this.logger.debug(`Toggling nft in db with id ${this.activeNft.nftId}`);
      await this.nftService.toggleNftBoxState(this.activeNft.nftId, true);
      return true;
    } catch (error) {
      this.logger.error(error.message);
    }
  }

  async publishBox() {
    await this.subscriberService.pubSub.publish('boxConfig', {
      boxConfig: this.mapToDto(),
    });
  }

  async placeBid(serializedTransaction: string) {
    const transaction = JSON.parse(serializedTransaction);

    try {
      if (this.boxTimingState.state !== BoxState.Active) {
        throw new Error('Invalid box state!');
      }
      this.bidsCount++;
      await this.getBox();
      const existingAuth = await parseAndValidatePlaceBidTx(
        transaction,
        this.bidders,
        this.hasResolved,
      );

      if (existingAuth) {
        this.subscriberService.pubSub.publish('overbidden', {
          overbidden: existingAuth,
        });
      }
      await this.getBox();
      return true;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async getBox() {
    const boxAddress = this.getBoxPda();

    try {
      const boxData = await program.account.boxData.fetch(boxAddress);

      this.bidder =
        boxData.bidder?.toString() ?? boxData.winnerAddress?.toString();

      this.currentBid = boxData.activeBid.toNumber() / LAMPORTS_PER_SOL;
      if (
        boxData.winnerAddress ||
        (boxData.bidder && this.boxTimingState.state === BoxState.Cooldown)
      ) {
        this.isWon = true;
      }
      await this.publishBox();
    } catch (error) {
      console.log(error);
    }
  }
  mapToDto(): BoxConfigOutput {
    return {
      ...this.box,
      boxTimingState: this.boxTimingState,
      bidsCount: this.bidsCount,
      activeNft: this.activeNft,
      activeBid: this.currentBid,
      bidder: this.bidder,
      isWon: this.isWon,
      bidders: this.bidders,
    };
  }
}
