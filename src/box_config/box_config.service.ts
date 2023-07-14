import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RedisService } from 'nestjs-redis';
import { SubscriberService } from 'src/subscriber/subscriber.service';
import { BoxConfigWorker } from './box_config.worker';
import { BoxConfigRepository } from './repository/box.config.repository';
import { SaveOrUpdateBoxConfig } from './so/save_update.so';
import { BoxConfigDto, BoxState } from './types/box_config.types';

@Injectable()
export class BoxConfigService implements OnModuleInit {
  private saveOrUpdateBox: SaveOrUpdateBoxConfig;
  logger = new Logger(BoxConfigService.name);
  workers: BoxConfigWorker[];
  constructor(
    @InjectRepository(BoxConfigRepository)
    private readonly boxConfigRepo: BoxConfigRepository,
    private readonly subscriptionService: SubscriberService,
    private readonly redisService: RedisService,
  ) {
    this.workers = [];
    this.saveOrUpdateBox = new SaveOrUpdateBoxConfig(boxConfigRepo);
  }
  async onModuleInit() {
    try {
      const boxes = await this.boxConfigRepo.getAllDbBoxes();
      this.logger.error(`Got ${boxes.length} existing boxes from DB!`);
      boxes
        .filter((b) => b.boxState !== BoxState.Removed)
        .forEach((box) => {
          this.workers.push(
            new BoxConfigWorker(
              this.subscriptionService,
              this.boxConfigRepo,
              box,
            ),
          );
        });
    } catch (error) {
      this.logger.error(`Failed in BoxConfigService ${error.message}`);
    }
  }

  async saveOrUpdateBoxHandler(box: BoxConfigDto) {
    const saved = await this.saveOrUpdateBox.execute(box);
    if (!box.boxId) {
      const newWorker = new BoxConfigWorker(
        this.subscriptionService,
        this.boxConfigRepo,
        saved,
      );
      this.workers.push(newWorker);
    }
    if (saved.boxState === BoxState.Removed) {
      const index = this.workers.findIndex(
        (box) => box.box.boxId === saved.boxId,
      );
      this.workers.splice(index, 1);
    }
  }
}
