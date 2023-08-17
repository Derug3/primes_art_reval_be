import { Module } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { StatisticsResolver } from './statistics.resolver';
import { StatsRepository } from './repository/stats.repository';
import { SubscriberModule } from 'src/subscriber/subscriber.module';

@Module({
  imports: [SubscriberModule],
  providers: [StatisticsResolver, StatisticsService, StatsRepository],
  exports: [StatisticsService],
})
export class StatisticsModule {}
