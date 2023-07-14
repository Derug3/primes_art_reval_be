import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RedisService } from 'nestjs-redis';
import { SubscriberService } from 'src/subscriber/subscriber.service';
import { BoxConfigWorker } from './box_config.worker';
import { BoxConfigRepository } from './repository/box.config.repository';
import { SaveOrUpdateBoxConfig } from './so/save_update.so';
import { BoxConfigInput, BoxState } from './types/box_config.types';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import * as dayjs from 'dayjs';
import Redis from 'ioredis';
import { NftService } from 'src/nft/nft.service';
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
    if (!box.boxId) {
      const newWorker = new BoxConfigWorker(
        this.subscriptionService,
        this.boxConfigRepo,
        saved,
        this.redisService,
        this.nftService,
      );
      this.workers.push(newWorker);
    }
    //TODO:think if we should do this?
    // if (saved.boxState === BoxState.Removed) {
    //   const index = this.workers.findIndex(
    //     (box) => box.box.boxId === saved.boxId,
    //   );
    //   this.workers.splice(index, 1);
    // }
  }

  getActiveBoxes() {
    return this.workers.map((w) => w.mapToDto());
  }
}
