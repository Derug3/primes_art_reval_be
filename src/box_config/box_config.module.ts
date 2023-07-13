import { Module } from '@nestjs/common';
import { BoxConfigService } from './box_config.service';
import { BoxConfigResolver } from './box_config.resolver';
import { SubscriberModule } from 'src/subscriber/subscriber.module';
import { BoxConfigRepository } from './repository/box.config.repository';

@Module({
  imports: [SubscriberModule],
  providers: [BoxConfigResolver, BoxConfigService, BoxConfigRepository],
})
export class BoxConfigModule {}
