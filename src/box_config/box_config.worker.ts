import { Logger } from '@nestjs/common';

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
import * as dayjs from 'dayjs';
import { NftService } from 'src/nft/nft.service';
import { Nft } from 'src/nft/entity/nft.entity';

export class BoxConfigWorker {
  box: BoxConfig;
  activeNft: Nft;
  bidsCount: number;
  boxTimingState: BoxTimigState;

  logger = new Logger(BoxConfigWorker.name);

  constructor(
    private readonly subscriberService: SubscriberService,
    private readonly boxConfigRepo: BoxConfigRepository,
    boxConfig: BoxConfig,
    private readonly redisService: Redis,
    private readonly nftService: NftService,
  ) {
    this.box = boxConfig;
    this.bidsCount = 0;
    this.start();
  }

  async start() {
    this.logger.debug(`Starting box ${this.box.boxId}`);
    if (this.box.initialDelay && this.box.executionsCount === 0) {
      this.boxTimingState = {
        endsAt: dayjs().add(this.box.initialDelay, 'seconds').unix(),
        startedAt: dayjs().unix(),
        state: BoxState.Paused,
      };
      await this.publishBox(this.boxTimingState);
      this.logger.log(`Initial delay of ${this.box.initialDelay} seconds`);
      await sleep(this.box.initialDelay * 1000);
    }
    if (this.box.boxId) {
      const newBoxState = await this.boxConfigRepo.getBuyId(this.box.boxId);
      if (newBoxState.boxState === BoxState.Removed) {
        this.logger.debug(`Stopping box with id ${this.box.boxId}`);
        this.boxTimingState = {
          endsAt: -1,
          startedAt: dayjs().unix(),
          state: BoxState.Removed,
        };
        await this.publishBox(this.boxTimingState);
        return;
      }
      if (newBoxState.boxState === BoxState.Paused) {
        this.boxTimingState = {
          endsAt: dayjs().add(newBoxState.boxPause, 'seconds').unix(),
          startedAt: dayjs().unix(),
          state: BoxState.Paused,
        };
        await this.publishBox(this.boxTimingState);
        await sleep(newBoxState.boxPause);
      }
      this.box = newBoxState;
    }

    await this.setupBox();
    this.boxTimingState = {
      endsAt: dayjs().add(this.box.boxDuration, 'seconds').unix(),
      startedAt: dayjs().unix(),
      state: BoxState.Active,
    };
    await this.publishBox(this.boxTimingState);

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
      await this.publishBox(this.boxTimingState);
      await sleep(this.box.cooldownDuration * 1000);
    }

    await this.start();
  }

  async resolveBox() {
    this.logger.log('Resolved box');
    await this.redisService.del(this.activeNft.nftId);
    this.activeNft = undefined;
    this.box.executionsCount += 1;
    await this.boxConfigRepo.save(this.box);
  }

  async setupBox() {
    try {
      this.logger.log('Box setup');
      const nfts = await this.nftService.getNonMinted();

      let acknowledged = 0;

      do {
        const rand = Math.round(Math.random() * nfts.length) + 1;
        console.log(rand);

        const randomNft = nfts[rand];
        acknowledged = await this.redisService.setnx(
          randomNft.nftId,
          JSON.stringify(randomNft),
        );
        this.activeNft = randomNft;
      } while (acknowledged <= 0);
    } catch (error) {}
  }

  async publishBox(boxTimingState: BoxTimigState) {
    await this.subscriberService.pubSub.publish('boxConfig', {
      boxConfig: this.mapToDto(),
    });
  }

  mapToDto(): BoxConfigOutput {
    return {
      ...this.box,
      boxTimingState: this.boxTimingState,
      bidsCount: this.bidsCount,
      activeNft: this.activeNft,
    };
  }
}
