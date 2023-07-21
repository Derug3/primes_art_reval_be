import { Args, Resolver, Subscription } from '@nestjs/graphql';
import { BoxConfigOutput } from 'src/box_config/types/box_config.types';
import { SubscriberService } from './subscriber.service';

@Resolver()
export class SubscriberResolver {
  constructor(private readonly subscriberService: SubscriberService) {}

  @Subscription(() => BoxConfigOutput)
  boxConfig() {
    return this.subscriberService.pubSub.asyncIterator('boxConfig');
  }

  @Subscription(() => BoxConfigOutput, {
    filter: (payload, variable) =>
      (payload.wonNft.bidder = variable.userAddress),
  })
  wonNft(@Args('userAddress') userAddress: string) {
    return this.subscriberService.pubSub.asyncIterator('wonNft');
  }
}
