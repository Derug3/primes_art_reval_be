import { BadRequestException, Logger } from '@nestjs/common';
import { SubscriberService } from 'src/subscriber/subscriber.service';
import { BoxConfig } from './entity/box_config.entity';
import { BoxConfigRepository } from './repository/box.config.repository';
import {
  Bidders,
  BoxConfigOutput,
  BoxPool,
  BoxState,
  BoxTimigState,
} from './types/box_config.types';
import {
  checkIfProofPdaExists,
  checkUserRole,
  getProofPda,
  getUserMintPassNfts,
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
import {
  ComputeBudgetProgram,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
} from '@solana/web3.js';
import { RecoverBoxService } from 'src/recover_box/recover_box.service';
import { UserService } from 'src/user/user.service';
import { StatisticsService } from 'src/statistics/statistics.service';
import { writeFileSync } from 'fs';
import { SharedService } from 'src/shared/shared.service';

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
  hasPreResolved: boolean;

  secondsExtending: number;

  logger = new Logger(BoxConfigWorker.name);

  timer;

  additionalTimeout: number;
  cooldownAdditionalTimeout: number;

  constructor(
    private readonly subscriberService: SubscriberService,
    private readonly boxConfigRepo: BoxConfigRepository,
    boxConfig: BoxConfig,
    private readonly redisService: Redis,
    private readonly nftService: NftService,
    private readonly recoverBoxService: RecoverBoxService,
    private readonly userService: UserService,
    private readonly statsService: StatisticsService,
    private readonly sharedService: SharedService,
  ) {
    this.box = boxConfig;
    this.bidsCount = 0;
    this.isWon = false;
    this.currentBid = 0;
    this.bidders = [];
    this.hasResolved = false;
    this.hasPreResolved = false;
    this.additionalTimeout = 0;
    this.secondsExtending = 15;
    this.cooldownAdditionalTimeout = 5;

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
    this.additionalTimeout = 0;
    this.cooldownAdditionalTimeout = 0;

    if (this.box.initialDelay) {
      this.boxTimingState = {
        endsAt: dayjs().add(this.box.initialDelay, 'seconds').unix(),
        startedAt: dayjs().unix(),
        state: BoxState.Paused,
      };
      await this.publishBox();
      await sleep(this.box.initialDelay * 1000);
      await this.boxConfigRepo.save({ ...this.box, initialDelay: null });
    }

    this.secondsExtending = await this.statsService.getStatsExtending();
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
    this.logger.debug(`Box setup successfully:${boxSetup}`);
    if (!boxSetup) {
      this.boxTimingState = {
        endsAt: -1,
        startedAt: -1,
        state: BoxState.Removed,
      };
      await this.publishBox();
      return;
    }
    this.boxTimingState = {
      endsAt: dayjs().add(this.box.boxDuration, 'seconds').unix(),
      startedAt: dayjs().unix(),
      state: BoxState.Active,
    };
    let counter = 0;
    let isInitialized = false;
    while (!isInitialized && counter < 10) {
      const connection = this.sharedService.getRpcConnection();
      isInitialized = await initBoxIx(
        this.getBoxPda(),
        this.box.boxId,
        this.box,
        this.activeNft,
        connection,
        counter,
      );

      counter++;
    }

    if (!isInitialized) {
      this.boxTimingState = {
        endsAt: -1,
        startedAt: dayjs().unix(),
        state: BoxState.Paused,
      };
      await this.publishBox();
      return;
    }

    await this.getBox();

    this.timer = await sleep(this.box.boxDuration * 1000);

    if (!this.hasPreResolved) {
      while (this.additionalTimeout > 0) {
        let sleepAmount = this.additionalTimeout;
        this.additionalTimeout = 0;
        await sleep(sleepAmount * 1000);
      }

      await this.cooldown();
    }
    this.hasPreResolved = false;
  }
  async cooldown() {
    await this.resolveBox();
    if (this.box.cooldownDuration > 0) {
      this.boxTimingState = {
        startedAt: dayjs().unix(),
        endsAt: dayjs().add(this.box.cooldownDuration, 'seconds').unix(),
        state: BoxState.Cooldown,
      };
      await this.getBox();

      await sleep(this.box.cooldownDuration * 1000);
    }
    if (this.cooldownAdditionalTimeout > 0) {
      await sleep((this.cooldownAdditionalTimeout + 1) * 1000);
      this.cooldownAdditionalTimeout = 0;
    }

    await this.start();
  }

  getBoxPda() {
    return PublicKey.findProgramAddressSync(
      [primeBoxSeed, Buffer.from(this.box.boxId.toString())],
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
      await this.nftService.toggleNftBoxState(this.activeNft.nftId, false);
      if ((box.winnerAddress || box.bidder) && !this.isWon) {
        resolved = await resolveBoxIx(
          boxPda,
          this.sharedService.getRpcConnection(),
          this.activeNft,
        );
        hasTriedResolving = true;
        await this.statsService.increaseSales(
          box.activeBid.toNumber() / LAMPORTS_PER_SOL,
        );
      }
      if (!this.isWon && !this.hasResolved && !resolved) {
        this.logger.warn('Non resolved NFT');
        await this.nftService.updateNft(this.activeNft.nftId, false);
      } else {
        this.logger.log('Resolved NFT');
        // await this.nftService.updateNft(this.activeNft.nftId, true);
      }

      await this.getBox();
      if (!resolved && !this.hasResolved && hasTriedResolving) {
        const boxAddress = this.getBoxPda();
        const [boxTreasury] = PublicKey.findProgramAddressSync(
          [primeBoxTreasurySeed, boxAddress.toBuffer()],
          program.programId,
        );

        await this.recoverBoxService.saveFailedBox({
          boxData: boxAddress.toString(),
          failedAt: new Date(),
          id: v4(),
          nftId: this.activeNft.nftId,
          nftUri: this.activeNft.nftUri,
          winner: box.bidder.toString(),
          winningAmount: box.activeBid.toNumber(),
          boxTreasury: boxTreasury.toString(),
        });
      }
    } catch (error) {
      this.logger.error(error);
    }
  }

  async setupBox() {
    try {
      let nfts = await this.nftService.getNonMinted(
        this.box.boxId,
        this.box.boxPool,
      );

      this.logger.log(`Got ${nfts.length} from DB`);

      if (this.activeNft) {
        await this.redisService.del(this.activeNft.nftId);
        this.logger.log(`Deleted key from redis`);
      }

      const storedInRedis = await this.redisService.keys('*');

      nfts = nfts.filter((nft) => !storedInRedis.includes(nft.nftId));

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
      this.logger.log(`Box setup with available NFTs: ${nfts.length}`);
      if (nfts.length === 0) return false;
      do {
        const rand = Math.round(Math.random() * (nfts.length - 1));
        const randomNft = nfts[rand];
        acknowledged = await this.redisService.setnx(
          randomNft.nftId,
          JSON.stringify(randomNft),
        );
        const exists = await checkIfProofPdaExists(
          randomNft.nftId,
          this.sharedService.getRpcConnection(),
        );
        if (exists) continue;

        this.activeNft = randomNft;
      } while (acknowledged === 0);
      await this.nftService.toggleNftBoxState(this.activeNft.nftId, true);

      return true;
    } catch (error) {
      console.log(error);
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
      const placeBidIx = Transaction.from(transaction.data).instructions.filter(
        (ix) => !ix.programId.equals(ComputeBudgetProgram.programId),
      );
      const proofPda = getProofPda(this.activeNft);

      const pdaInfo = await this.sharedService
        .getRpcConnection()
        .getAccountInfo(proofPda);

      if (pdaInfo || pdaInfo?.data) {
        throw new BadRequestException('This NFT is already minted.');
      }

      const wallet = placeBidIx[0].keys[1].pubkey.toString();
      const relatedUser = await this.userService.getUserByWallet(wallet);

      const action = placeBidIx[0].data[8];
      if (
        (action === 2 || action === 3) &&
        this.box.boxPool !== BoxPool.PreSale
      ) {
        throw new BadRequestException(
          "You can't use pre-sale NFTs out of PreSale pool!",
        );
      }

      if (
        (action === 0 || action === 2) &&
        this.boxTimingState.state === BoxState.Cooldown
      ) {
        throw new BadRequestException(
          "Invalid box state. You can't bid during cooldown!",
        );
      }

      if (!relatedUser) {
        const hasMintPass = await getUserMintPassNfts(
          wallet.toString(),
          this.sharedService.getRpcConnection(),
        );
        if (this.box.boxPool !== BoxPool.Public && !hasMintPass)
          throw new BadRequestException(
            "Invalid role. You don't have permissions on this box!",
          );
      }

      const permittedPool = checkUserRole(relatedUser);
      if (
        relatedUser &&
        permittedPool > this.box.boxPool &&
        action !== 2 &&
        action !== 3
      ) {
        throw new BadRequestException(
          "Invalid role. You don't have permission to bid on this box!",
        );
      }
      const remainingSeconds = this.boxTimingState.endsAt - dayjs().unix();
      //HERE
      if ((action === 0 || action === 2) && remainingSeconds <= 2) {
        throw new BadRequestException('Box expired!');
      }
      //HERE
      if (
        this.boxTimingState.state === BoxState.Cooldown &&
        remainingSeconds <= 2
      ) {
        throw new BadRequestException('Box expired');
      }

      this.bidsCount++;

      await this.getBox();
      const rpcConnection = this.sharedService.getRpcConnection();

      const existingAuth = await parseAndValidatePlaceBidTx(
        transaction,
        this.bidders,
        this.hasResolved,
        relatedUser,
        this.boxTimingState,
        rpcConnection,
        this.activeNft,
      );

      if (existingAuth) {
        this.subscriberService.pubSub.publish('overbidden', {
          overbidden: existingAuth,
        });
      }

      await this.getBox();
      if (
        remainingSeconds < this.secondsExtending &&
        this.boxTimingState.state === BoxState.Active &&
        (action === 0 || action === 2)
      ) {
        this.boxTimingState = {
          endsAt:
            this.boxTimingState.endsAt +
            remainingSeconds +
            this.secondsExtending +
            1,
          startedAt: dayjs().unix(),
          state: BoxState.Active,
        };
        this.additionalTimeout = remainingSeconds + this.secondsExtending;
      }
      if (
        remainingSeconds < 5 &&
        this.boxTimingState.state === BoxState.Cooldown
      ) {
        this.cooldownAdditionalTimeout = 5;
        this.boxTimingState = {
          endsAt: this.boxTimingState.endsAt + remainingSeconds + 5,
          startedAt: dayjs().unix(),
          state: BoxState.Cooldown,
        };
      }

      const activeBid = await this.getBox();

      //HERE:
      if (
        (action === 1 || action === 3) &&
        this.boxTimingState.state === BoxState.Active &&
        remainingSeconds >= 5
      ) {
        await this.statsService.increaseSales(
          activeBid.toNumber() / LAMPORTS_PER_SOL,
        );

        this.hasPreResolved = true;
        clearTimeout(this.timer);
        this.cooldown();
      }

      if (action === 0 || action === 2) {
        await this.statsService.increaseBids();
      }

      if (action === 1 || action === 3) {
        await this.nftService.updateNft(this.activeNft.nftId, true);
      }

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

        // await this.nftService.updateNft(this.activeNft.nftId, true);
      }
      await this.publishBox();
      return boxData.activeBid;
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
      boxId: this.box.boxId.toString(),
    };
  }
}
