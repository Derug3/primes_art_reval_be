import { Args, Mutation, Query, Resolver, Subscription } from '@nestjs/graphql';
import { BoxPool } from 'src/box_config/types/box_config.types';
import { SubscriberService } from 'src/subscriber/subscriber.service';
import { PoolsConfig } from './entity/pools_config.entity';
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

  @Mutation(() => Boolean)
  updatePoolConfig(
    @Args('pool', { type: () => BoxPool }) pool: BoxPool,
    @Args('isVisible') isVisible: boolean,
  ) {
    return this.statisticsService.updatePoolConfig(pool, isVisible);
  }

  @Query(() => [PoolsConfig])
  getPoolsConfig() {
    return this.statisticsService.getPoolsConfig();
  }
}
