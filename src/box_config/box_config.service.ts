import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RedisService } from 'nestjs-redis';
import { SubscriberService } from 'src/subscriber/subscriber.service';
import { BoxConfigWorker } from './box_config.worker';
import { BoxConfigRepository } from './repository/box.config.repository';
import { SaveOrUpdateBoxConfig } from './so/save_update.so';
import { BoxConfigInput, BoxState } from './types/box_config.types';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import Redis from 'ioredis';
import { NftService } from 'src/nft/nft.service';
import { claimNft } from './utilities/helpers';
import { RecoverBoxService } from 'src/recover_box/recover_box.service';
import { BoxType } from 'src/enum/enums';
import { UserService } from 'src/user/user.service';
import { StatisticsService } from 'src/statistics/statistics.service';
@Injectable()
export class BoxConfigService implements OnModuleInit {
  private saveOrUpdateBox: SaveOrUpdateBoxConfig;
  logger = new Logger(BoxConfigService.name);
  workers: BoxConfigWorker[];
  constructor(
    @InjectRepository(BoxConfigRepository)
    private readonly boxConfigRepo: BoxConfigRepository,
    private readonly subscriptionService: SubscriberService,
    private readonly nftService: NftService,
    @InjectRedis()
    private readonly redisService: Redis,
    private readonly recoverBoxService: RecoverBoxService,
    private readonly userService: UserService,
    private readonly statsSerivce: StatisticsService,
  ) {
    this.workers = [];
    this.saveOrUpdateBox = new SaveOrUpdateBoxConfig(boxConfigRepo);
  }
  async onModuleInit() {
    try {
      const boxes = await this.boxConfigRepo.getAllDbBoxes();
      this.logger.debug(`Got ${boxes.length} existing boxes from DB!`);
      boxes
        .filter((b) => b.boxState !== BoxState.Removed)
        .forEach((box) => {
          this.workers.push(
            new BoxConfigWorker(
              this.subscriptionService,
              this.boxConfigRepo,
              box,
              this.redisService,
              this.nftService,
              this.recoverBoxService,
              this.userService,
              this.statsSerivce,
            ),
          );
        });
    } catch (error) {
      this.logger.error(`Failed in BoxConfigService ${error.message}`);
    }
  }

  async saveOrUpdateBoxHandler(box: BoxConfigInput) {
    const saved = await this.saveOrUpdateBox.execute(box);
    this.logger.debug(`Staring box worker with id:${saved.boxId}`);
    if (
      (box.boxType === BoxType.BidBuyNow || box.boxType === BoxType.BuyNow) &&
      !box.buyNowPrice
    ) {
      throw new BadRequestException(
        "Can't create box of type BidBuy and Buy without buy now price defined!",
      );
    }
    if (
      (box.boxType === BoxType.Bid || box.boxType === BoxType.BidBuyNow) &&
      !box.bidStartPrice
    ) {
      throw new BadRequestException(
        "Can't create box of type BidBuy and Bid without bid start price defined!",
      );
    }
    if (box.boxType === BoxType.Bid && box.buyNowPrice > 0) {
      throw new BadRequestException(
        "Can't define buy now price on box that has bid type!",
      );
    }
    if (
      box.boxType === BoxType.BuyNow &&
      (box.bidStartPrice > 0 || box.bidIncrease > 0)
    ) {
      throw new BadRequestException(
        "Can't define bid  price on box that has buy now tyoe type!",
      );
    }
    if (!box.boxId) {
      const newWorker = new BoxConfigWorker(
        this.subscriptionService,
        this.boxConfigRepo,
        saved,
        this.redisService,
        this.nftService,
        this.recoverBoxService,
        this.userService,
        this.statsSerivce,
      );
      this.workers.push(newWorker);
    }
    //TODO:think if we should do this?
    if (saved.boxState === BoxState.Removed) {
      const index = this.workers.findIndex(
        (box) => box.box.boxId === saved.boxId,
      );
      this.workers.splice(index, 1);
    }
  }

  getActiveBoxes() {
    return this.workers.map((w) => w.mapToDto());
  }

  async deleteBox(boxId: string) {
    try {
      const boxIndex = this.workers.findIndex((box) => box.box.boxId === boxId);
      this.workers[boxIndex].box.boxState = BoxState.Removed;
      this.workers.splice(boxIndex, 1);
      const existingBox = await this.boxConfigRepo.findOne({
        where: { boxId },
      });
      if (existingBox) {
        existingBox.boxState = BoxState.Removed;
        await this.boxConfigRepo.save(existingBox);
      }
      return true;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async placeBid(serializedTx: string, boxId: string) {
    const box = this.workers.find((b) => b.box.boxId === boxId);

    if (!box) throw new NotFoundException('Given box not found!');

    return box.placeBid(serializedTx);
  }

  checkBoxExistance(boxId: string) {
    return this.workers.find((w) => w.box.boxId === boxId);
  }

  async claimBoxNft(tx: any) {
    return await claimNft(tx);
  }

  async deleteAllBoxes() {
    await this.boxConfigRepo.delete({});
    this.workers = [];
    return true;
  }
}
