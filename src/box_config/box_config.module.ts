import { Module } from '@nestjs/common';
import { BoxConfigService } from './box_config.service';
import { BoxConfigResolver } from './box_config.resolver';
import { SubscriberModule } from 'src/subscriber/subscriber.module';
import { BoxConfigRepository } from './repository/box.config.repository';
import { NftModule } from 'src/nft/nft.module';

@Module({
  imports: [SubscriberModule, NftModule],
  providers: [BoxConfigResolver, BoxConfigService, BoxConfigRepository],
})
export class BoxConfigModule {}
