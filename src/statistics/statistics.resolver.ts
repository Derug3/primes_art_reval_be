import { Args, Mutation, Query, Resolver, Subscription } from '@nestjs/graphql';
import { SubscriberService } from 'src/subscriber/subscriber.service';
import { StatsEntity } from './entity/stats.entity';
import { StatisticsService } from './statistics.service';

@Resolver()
export class StatisticsResolver {
  constructor(
    private readonly statisticsService: StatisticsService,
    private readonly subscriberService: SubscriberService,
  ) {}

  @Mutation(() => Boolean)
  updateSecondsExtending(@Args('secondsCount') secondsCount: number) {
    return this.statisticsService.updateSecondsExtending(secondsCount);
  }

  @Query(() => StatsEntity)
  getStats() {
    return this.statisticsService.getStats();
  }

  @Subscription(() => StatsEntity)
  getLiveStats() {
    return this.subscriberService.pubSub.asyncIterator('getLiveStats');
  }
}
