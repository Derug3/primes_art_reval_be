import { Logger } from '@nestjs/common';
import { RedisService } from 'nestjs-redis';
import { SubscriberService } from 'src/subscriber/subscriber.service';
import { BoxConfig } from './entity/box_config.entity';
import { BoxConfigRepository } from './repository/box.config.repository';
import { BoxState } from './types/box_config.types';
import { sleep } from './utilities/helpers';
import Redis from 'ioredis';
export class BoxConfigWorker {
  box: BoxConfig;

  logger = new Logger(BoxConfigWorker.name);

  constructor(
    private readonly subscriberService: SubscriberService,
    private readonly boxConfigRepo: BoxConfigRepository,
    boxConfig: BoxConfig,
    private readonly redisService: Redis,
  ) {
    this.box = boxConfig;
    this.start();
  }

  async start() {
    this.logger.debug(`Starting box ${this.box.boxId}`);
    await this.publishBox();
    if (this.box.initialDelay && this.box.executionsCount === 0) {
      this.logger.log(`Initial delay of ${this.box.initialDelay} seconds`);
      await sleep(this.box.initialDelay * 1000);
    }
    if (this.box.boxId) {
      const newBoxState = await this.boxConfigRepo.getBuyId(this.box.boxId);
      if (newBoxState.boxState === BoxState.Removed) {
        this.logger.debug(`Stopping box with id ${this.box.boxId}`);
        await this.publishBox();
        return;
      }
      if (newBoxState.boxState === BoxState.Paused) {
        await this.publishBox();
        await sleep(newBoxState.boxPause);
      }
      this.box = newBoxState;
    }

    await this.setupBox();
    await this.publishBox();

    this.logger.log('Box emitted');

    await sleep(this.box.boxDuration * 1000);

    await this.cooldown();
  }

  async cooldown() {
    await this.resolveBox();

    if (this.box.cooldownDuration > 0) {
      this.logger.log('Cooldown started');
      await this.publishBox();
      await sleep(this.box.cooldownDuration * 1000);
      await this.publishBox();
    }

    await this.start();
  }

  async resolveBox() {
    this.logger.log('Resolved box');
    await this.publishBox();
  }

  async setupBox() {
    this.logger.log('Box setup');
    await this.publishBox();
  }

  async publishBox() {
    await this.subscriberService.pubSub.publish('boxConfig', {
      boxConfig: this.box,
    });
  }
}
