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
  updateSecondsExtending(
    @Args('secondsCount') secondsCount: number,
    @Args('signedMessage') signedMessage: string,
    @Args('authority') authority: string,
  ) {
    return this.statisticsService.updateSecondsExtending(
      secondsCount,
      signedMessage,
      authority,
    );
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
    @Args('signedMessage') signedMessage: string,
    @Args('authority') authority: string,
  ) {
    return this.statisticsService.updatePoolConfig(
      pool,
      isVisible,
      signedMessage,
      authority,
    );
  }

  @Query(() => [PoolsConfig])
  getPoolsConfig() {
    return this.statisticsService.getPoolsConfig();
  }

  @Mutation(() => Boolean)
  deleteStats() {
    return this.statisticsService.deleteStats();
  }
}
