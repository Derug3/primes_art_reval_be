import { SubscriberService } from 'src/subscriber/subscriber.service';
import { BoxConfig } from './entity/box_config.entity';
import { sleep } from './utilities/helpers';

export class BoxConfigWorker {
  box: BoxConfig;

  constructor(
    private readonly subscriberService: SubscriberService,
    boxConfig: BoxConfig,
  ) {
    this.box = boxConfig;
  }

  async start() {
    if (this.box.initialDelay && this.box.executionsCount === 0) {
      sleep(this.box.initialDelay * 1000);
    }

    await this.cooldown();
  }

  async cooldown() {
    if (this.box.cooldownDuration > 0) {
      await sleep(this.box.cooldownDuration * 1000);
    }

    await this.start();
  }
}
