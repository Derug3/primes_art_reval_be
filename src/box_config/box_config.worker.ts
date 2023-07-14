import { Logger } from '@nestjs/common';
import { RedisService } from 'nestjs-redis';
import { SubscriberService } from 'src/subscriber/subscriber.service';
import { BoxConfig } from './entity/box_config.entity';
import { BoxConfigRepository } from './repository/box.config.repository';
import {
  BoxConfigOutput,
  BoxState,
  BoxTimigState,
} from './types/box_config.types';
import { sleep } from './utilities/helpers';
import Redis from 'ioredis';
import dayjs from 'dayjs';
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
    if (this.box.initialDelay && this.box.executionsCount === 0) {
      await this.publishBox({
        endsAt: dayjs().add(this.box.initialDelay, 'seconds').unix(),
        startedAt: dayjs().unix(),
        state: BoxState.Paused,
      });
      this.logger.log(`Initial delay of ${this.box.initialDelay} seconds`);
      await sleep(this.box.initialDelay * 1000);
    }
    if (this.box.boxId) {
      const newBoxState = await this.boxConfigRepo.getBuyId(this.box.boxId);
      if (newBoxState.boxState === BoxState.Removed) {
        this.logger.debug(`Stopping box with id ${this.box.boxId}`);
        await this.publishBox({
          endsAt: -1,
          startedAt: dayjs().unix(),
          state: BoxState.Removed,
        });
        return;
      }
      if (newBoxState.boxState === BoxState.Paused) {
        await this.publishBox({
          endsAt: dayjs().add(newBoxState.boxPause, 'seconds').unix(),
          startedAt: dayjs().unix(),
          state: BoxState.Paused,
        });
        await sleep(newBoxState.boxPause);
      }
      this.box = newBoxState;
    }

    await this.setupBox();
    await this.publishBox({
      endsAt: dayjs().add(this.box.boxDuration, 'seconds').unix(),
      startedAt: dayjs().unix(),
      state: BoxState.Active,
    });

    this.logger.log('Box emitted');

    await sleep(this.box.boxDuration * 1000);

    await this.cooldown();
  }

  async cooldown() {
    await this.resolveBox();

    if (this.box.cooldownDuration > 0) {
      this.logger.log('Cooldown started');
      await this.publishBox({
        startedAt: dayjs().unix(),
        endsAt: dayjs().add(this.box.cooldownDuration, 'seconds').unix(),
        state: BoxState.Cooldown,
      });
      await sleep(this.box.cooldownDuration * 1000);
    }

    await this.start();
  }

  async resolveBox() {
    this.logger.log('Resolved box');
  }

  async setupBox() {
    this.logger.log('Box setup');
  }

  async publishBox(boxTimingState: BoxTimigState) {
    await this.subscriberService.pubSub.publish('boxConfig', {
      boxConfig: this.mapToDto(boxTimingState),
    });
  }

  mapToDto(boxTimingState: BoxTimigState): BoxConfigOutput {
    return {
      ...this.box,
      boxTimingState,
    };
  }
}
