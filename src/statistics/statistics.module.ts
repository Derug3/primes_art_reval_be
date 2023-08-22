import { Module } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { StatisticsResolver } from './statistics.resolver';
import { StatsRepository } from './repository/stats.repository';
import { SubscriberModule } from 'src/subscriber/subscriber.module';
import { PoolsConfigRepository } from './repository/pools_config.repository';

@Module({
  imports: [SubscriberModule],
  providers: [
    StatisticsResolver,
    StatisticsService,
    StatsRepository,
    PoolsConfigRepository,
  ],
  exports: [StatisticsService],
})
export class StatisticsModule {}
