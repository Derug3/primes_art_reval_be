import { Resolver, Subscription } from '@nestjs/graphql';
import { BoxConfigDto } from 'src/box_config/types/box_config.types';
import { SubscriberService } from './subscriber.service';

@Resolver()
export class SubscriberResolver {
  constructor(private readonly subscriberService: SubscriberService) {}

  @Subscription(() => BoxConfigDto)
  boxConfig() {
    return this.subscriberService.pubSub.asyncIterator('boxConfig');
  }
}
