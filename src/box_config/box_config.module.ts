import { Module } from '@nestjs/common';
import { BoxConfigService } from './box_config.service';
import { BoxConfigResolver } from './box_config.resolver';
import { SubscriberModule } from 'src/subscriber/subscriber.module';

@Module({
  imports: [SubscriberModule],
  providers: [BoxConfigResolver, BoxConfigService],
})
export class BoxConfigModule {}
