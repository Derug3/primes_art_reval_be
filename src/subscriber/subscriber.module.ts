import { Module } from '@nestjs/common';
import { SubscriberService } from './subscriber.service';
import { SubscriberResolver } from './subscriber.resolver';
import { StatsRepository } from './repository/stats.repository';

@Module({
  providers: [SubscriberResolver, SubscriberService, StatsRepository],
  exports: [SubscriberService],
})
export class SubscriberModule {}
