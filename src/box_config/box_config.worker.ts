import { BoxConfig } from './entity/box_config.entity';

export class BoxConfigWorker {
  box: BoxConfig;

  constructor(boxConfig: BoxConfig) {
    this.box = boxConfig;
  }

  start() {}

  cooldown() {}
}
