import { Logger } from '@nestjs/common';
import { SubscriberService } from 'src/subscriber/subscriber.service';
import { BoxConfig } from './entity/box_config.entity';
import { BoxConfigRepository } from './repository/box.config.repository';
import { sleep } from './utilities/helpers';

export class BoxConfigWorker {
  box: BoxConfig;

  logger = new Logger(BoxConfigWorker.name);

  constructor(
    private readonly subscriberService: SubscriberService,
    private readonly boxConfigRepo: BoxConfigRepository,
    boxConfig: BoxConfig,
  ) {
    this.box = boxConfig;
    this.start();
  }

  async start() {
    if (this.box.initialDelay && this.box.executionsCount === 0) {
      this.logger.log(`Initial delay of ${this.box.initialDelay} seconds`);
      await sleep(this.box.initialDelay * 1000);
    }
    if (this.box.boxId) {
      this.box = await this.boxConfigRepo.getBuyId(this.box.boxId);
    }

    await this.subscriberService.pubSub.publish('boxConfig', {
      boxConfig: this.box,
    });

    this.logger.log('Box emitted');

    await sleep(this.box.boxDuration * 1000);

    await this.cooldown();
  }

  async cooldown() {
    await this.resolveBox();
    this.subscriberService.pubSub.publish('boxConfig', { boxConfig: this.box });
    if (this.box.cooldownDuration > 0) {
      this.logger.log('Cooldown started');
      await sleep(this.box.cooldownDuration * 1000);
    }

    await this.start();
  }

  async resolveBox() {
    this.logger.log('Resolved box');
  }
}
