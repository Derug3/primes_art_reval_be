import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SubscriberService } from 'src/subscriber/subscriber.service';
import { BoxConfigRepository } from './repository/box.config.repository';
import { SaveOrUpdateBoxConfig } from './so/save_update.so';

@Injectable()
export class BoxConfigService {
  private saveOrUpdateBox: SaveOrUpdateBoxConfig;
  constructor(
    @InjectRepository(BoxConfigRepository) boxConfigRepo: BoxConfigRepository,
    private readonly subscriptionService: SubscriberService,
  ) {
    this.saveOrUpdateBox = new SaveOrUpdateBoxConfig(boxConfigRepo);
  }
}
