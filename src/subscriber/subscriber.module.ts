import { Module } from '@nestjs/common';
import { SubscriberService } from './subscriber.service';
import { SubscriberResolver } from './subscriber.resolver';
import { RedisModule } from 'nestjs-redis';

@Module({
  providers: [SubscriberResolver, SubscriberService, RedisModule],
  exports: [SubscriberService],
})
export class SubscriberModule {}
