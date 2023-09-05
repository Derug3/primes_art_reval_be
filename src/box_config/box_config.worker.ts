import { BadRequestException, Logger } from '@nestjs/common';
import { SubscriberService } from 'src/subscriber/subscriber.service';
import { ActionType, BoxConfig } from './entity/box_config.entity';
import { BoxConfigRepository } from './repository/box.config.repository';
import {
  Bidder,
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
  tryInitBox,
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
  VersionedTransaction,
} from '@solana/web3.js';
import { RecoverBoxService } from 'src/recover_box/recover_box.service';
import { UserService } from 'src/user/user.service';
import { StatisticsService } from 'src/statistics/statistics.service';
import { SharedService } from 'src/shared/shared.service';
import { bs58 } from '@project-serum/anchor/dist/cjs/utils/bytes';

export class BoxConfigWorker {
  box: BoxConfig;
  activeNft: Nft;
  bidsCount: number;
  boxTimingState: BoxTimigState;
  currentBid: number;
  bidder: string;
  isWon: boolean;
  hasResolved: boolean;
  bidders: Bidder[];
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

    const initBoxData = await tryInitBox(this.getBoxPda());

    this.secondsExtending = await this.statsService.getStatsExtending();
    if (!initBoxData) {
      this.currentBid = 0;
      this.bidsCount = 0;
      this.bidder = undefined;
      this.isWon = false;
      this.hasResolved = false;
      this.bidders = [];
      this.additionalTimeout = 0;
      this.cooldownAdditionalTimeout = 0;

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
        this.box = newBoxState;
      }
      const boxSetup = await this.setupBox();
      if (boxSetup) {
        this.logger.debug(
          `Box #${this.box.boxId} setup successfully: ${boxSetup}`,
        );
      } else {
        this.logger.warn(
          `Box #${this.box.boxId} setup successfully: ${boxSetup}`,
        );
      }
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
          this.logger,
        );

        counter++;
      }

      if (!isInitialized) {
        this.logger.warn(
          `Pausing box with id ${this.box.boxId} - non initialized`,
        );
        this.boxTimingState = {
          endsAt: -1,
          startedAt: dayjs().unix(),
          state: BoxState.Paused,
        };
        await this.publishBox();
        return;
      }

      await this.getBox();

      await this.storeBoxTimingState();
      this.timer = await sleep(this.box.boxDuration * 1000);

      if (!this.hasPreResolved) {
        while (this.additionalTimeout > 0) {
          const sleepAmount = this.additionalTimeout;
          this.additionalTimeout = 0;
          await sleep(sleepAmount * 1000);
        }
        await this.cooldown();
      }
      this.hasPreResolved = false;
    } else {
      try {
        const { activeBid, bidder, nftId, nftUri, winner } = initBoxData;
        const boxTimingState = await this.getBoxTimingState();
        await this.getDbBoxBidders();

        const lastBidAt = this.bidders[this.bidders.length - 1]?.bidAt;

        const endsAt = Math.max(
          300,
          (boxTimingState?.endsAt ?? dayjs(new Date()).unix()) -
            dayjs(lastBidAt ?? new Date()).unix(),
        );

        this.boxTimingState = {
          endsAt: dayjs().add(endsAt, 'seconds').unix(),
          state: BoxState.Active,
          startedAt: dayjs().unix(),
        };
        await this.storeBoxTimingState();
        const jsonNftdata = await (await fetch(nftUri)).json();

        const newBoxState = await this.boxConfigRepo.getBuyId(this.box.boxId);
        this.activeNft = {
          boxId: this.box.boxId.toString(),
          boxPool: this.box.boxPool,
          isInBox: true,
          nftId,
          nftImage: jsonNftdata.image,
          nftName: jsonNftdata.name,
          minted: !!winner,
          nftUri,
          reshuffleCount: 0,
        };
        this.bidder = bidder.toString();
        this.box = { ...newBoxState };
        if (winner) {
          this.isWon = true;
        }
        this.currentBid = activeBid;
        await this.publishBox();
        this.timer = await sleep(
          (this.boxTimingState.endsAt - dayjs().unix()) * 1000,
        );
        this.hasPreResolved = false;
        while (this.additionalTimeout > 0) {
          const sleepAmount = this.additionalTimeout;
          this.additionalTimeout = 0;
          await sleep(sleepAmount * 1000);
        }
        await this.cooldown();
      } catch (error) {
        this.logger.error(error);
      }
    }
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
        await this.nftService.updateNft(this.activeNft.nftId, true);
      }

      await this.getBox();
      await this.deleteBoxBidders();
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

      this.logger.log(`Got ${nfts.length} from DB for box#${this.box.boxId}`);

      if (this.activeNft) {
        await this.redisService.del(this.activeNft.nftId);
        this.logger.log(`Deleted key "${this.activeNft.nftId}" from redis`);
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
      // const nonShuffled = nfts.filter((n) => n.reshuffleCount === 0);
      // if (nonShuffled.length !== 0) {
      //   nfts = nonShuffled;
      // }
      let acknowledged = 0;
      this.logger.log(
        `Box #${this.box.boxId} setup with available NFTs: ${nfts.length}`,
      );
      if (nfts.length === 0) return false;
      let counter = nfts.length;

      do {
        if (counter === 0) {
          return false;
        }
        counter--;
        const rand = Math.round(Math.random() * (nfts.length - 1));
        const randomNft = nfts[rand];
        const exists = await checkIfProofPdaExists(
          randomNft.nftId,
          this.sharedService.getRpcConnection(),
        );
        this.logger.log(
          `Random nft with id ${randomNft.nftId} exist on-chain:${exists}`,
        );

        if (exists) continue;
        acknowledged = await this.redisService.setnx(
          randomNft.nftId,
          JSON.stringify(randomNft),
        );
        this.activeNft = randomNft;
      } while (acknowledged === 0);
      if (this.activeNft) {
        await this.nftService.toggleNftBoxState(this.activeNft.nftId, true);
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error(error);
      this.logger.error(`Error setup box: ${error.message}`, error.stack);
    }
  }
  async publishBox() {
    await this.subscriberService.pubSub.publish('boxConfig', {
      boxConfig: this.mapToDto(),
    });
  }
  async placeBid(serializedTransaction: string) {
    const transaction = bs58.decode(serializedTransaction);

    try {
      const deserializedTransaction =
        VersionedTransaction.deserialize(transaction);
      const computeBudgetProgramId =
        deserializedTransaction.message.staticAccountKeys.findIndex((s) =>
          s.equals(ComputeBudgetProgram.programId),
        );

      const placeBidIx =
        deserializedTransaction.message.compiledInstructions.filter(
          (ix) => ix.programIdIndex !== computeBudgetProgramId,
        );

      const proofPda = getProofPda(this.activeNft);

      const pdaInfo = await this.sharedService
        .getRpcConnection()
        .getAccountInfo(proofPda);

      if (pdaInfo || pdaInfo?.data) {
        throw new BadRequestException('This NFT is already minted.');
      }

      const wallet = deserializedTransaction.message.staticAccountKeys.find(
        (_, index) => index === placeBidIx[0].accountKeyIndexes[1],
      );
      const relatedUser = await this.userService.getUserByWallet(
        wallet.toString(),
      );

      const action = placeBidIx[0].data[8];
      if (
        (action === ActionType.BidMintPass ||
          action === ActionType.BuyMintPass) &&
        this.box.boxPool !== BoxPool.PreSale
      ) {
        throw new BadRequestException(
          "You can't use pre-sale NFTs out of PreSale pool!",
        );
      }

      if (
        (action === ActionType.Bid || action === ActionType.BidMintPass) &&
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
        action !== ActionType.BidMintPass &&
        action !== ActionType.BidMintPass
      ) {
        throw new BadRequestException(
          "Invalid role. You don't have permission to bid on this box!",
        );
      }
      const remainingSeconds = this.boxTimingState.endsAt - dayjs().unix();

      if (
        (action === ActionType.Bid || action === ActionType.BidMintPass) &&
        remainingSeconds <= 2
      ) {
        throw new BadRequestException('Box expired!');
      }

      if (
        this.boxTimingState.state === BoxState.Cooldown &&
        remainingSeconds <= 2
      ) {
        throw new BadRequestException('Box expired');
      }

      this.bidsCount++;

      const rpcConnection = this.sharedService.getRpcConnection();

      const { existingAuth, bidAmount, bidder, username } =
        await parseAndValidatePlaceBidTx(
          serializedTransaction,
          this.bidders,
          this.hasResolved,
          relatedUser,
          this.boxTimingState,
          rpcConnection,
          this.activeNft,
          this.logger,
        );

      if (existingAuth) {
        this.subscriberService.pubSub.publish('overbidden', {
          overbidden: existingAuth,
        });
      }
      await this.addBoxBidder(bidAmount, bidder, username);
      if (
        remainingSeconds < this.secondsExtending &&
        this.boxTimingState.state === BoxState.Active &&
        (action === ActionType.Bid || action === ActionType.BidMintPass)
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
        (action === ActionType.Buy || action === ActionType.BuyMintPass) &&
        this.boxTimingState.state === BoxState.Active &&
        remainingSeconds >= 5
      ) {
        this.hasPreResolved = true;
        clearTimeout(this.timer);
        this.cooldown();
      }

      if (action === ActionType.Bid || action === ActionType.BidMintPass) {
        await this.statsService.increaseBids();
      }

      if (action === ActionType.Buy || action === ActionType.BuyMintPass) {
        await this.statsService.increaseSales(
          activeBid.toNumber() / LAMPORTS_PER_SOL,
        );
        await this.deleteBoxBidders();
        await this.nftService.updateNft(this.activeNft.nftId, true);
      }

      return true;
    } catch (error) {
      this.logger.error(`Error place bid: ${error.message}`, {
        stack: error.stack,
        serializedTransaction,
      });
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
      console.error(error);
      this.logger.error('Error getBox: ' + error.message, error.stack);
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

  async storeUserBidData(
    user: string,
    bidAmount: number,
    usedMintPass?: string,
  ) {
    try {
      const boxData = await this.boxConfigRepo.findOne({
        where: { boxId: this.box.boxId },
      });
      boxData.userBidData.push({
        bidAmount,
        bidAt: new Date(),
        nftId: this.activeNft.nftId,
        nftUri: this.activeNft.nftUri,
        usedMintPass,
        username: '',
        walletAddress: user,
      });
    } catch (error) {
      this.logger.error(error.message);
    }
  }
  async getDbBoxBidders() {
    try {
      const box = await this.boxConfigRepo.findOne({
        where: { boxId: this.box.boxId },
      });
      this.bidders = box.userBidData;
    } catch (error) {
      this.logger.error(error.message);
    }
  }

  async addBoxBidder(bidAmount: number, user: string, username: string) {
    try {
      const box = await this.boxConfigRepo.findOne({
        where: { boxId: this.box.boxId },
      });
      box.userBidData.push({
        bidAmount,
        bidAt: new Date(),
        nftId: this.activeNft.nftId,
        nftUri: this.activeNft.nftUri,
        walletAddress: user,
        username,
      });
      await this.boxConfigRepo.save(box);
    } catch (error) {
      this.logger.error(error.message);
    }
  }
  async deleteBoxBidders() {
    try {
      const box = await this.boxConfigRepo.findOne({
        where: { boxId: this.box.boxId },
      });
      box.userBidData = [];
      await this.boxConfigRepo.save(box);
    } catch (error) {
      this.logger.error(error.message);
    }
  }
  async storeBoxTimingState() {
    try {
      const box = await this.boxConfigRepo.findOne({
        where: { boxId: this.box.boxId },
      });
      box.boxTimingState = this.boxTimingState;
      await this.boxConfigRepo.save(box);
    } catch (error) {
      this.logger.log(error.message);
    }
  }

  async getBoxTimingState() {
    try {
      const box = await this.boxConfigRepo.findOne({
        where: { boxId: this.box.boxId },
      });
      return box.boxTimingState;
    } catch (error) {
      this.logger.log(error.message);
    }
  }
}
