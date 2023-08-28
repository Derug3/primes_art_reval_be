import { Module } from '@nestjs/common';
import { BoxConfigService } from './box_config.service';
import { BoxConfigResolver } from './box_config.resolver';
import { SubscriberModule } from 'src/subscriber/subscriber.module';
import { BoxConfigRepository } from './repository/box.config.repository';
import { NftModule } from 'src/nft/nft.module';
import { RecoverBoxModule } from 'src/recover_box/recover_box.module';
import { UserModule } from 'src/user/user.module';
import { StatisticsModule } from 'src/statistics/statistics.module';
import { SharedModule } from 'src/shared/shared.module';

@Module({
  imports: [
    SubscriberModule,
    NftModule,
    RecoverBoxModule,
    UserModule,
    StatisticsModule,
    SharedModule,
  ],
  providers: [BoxConfigResolver, BoxConfigService, BoxConfigRepository],
})
export class BoxConfigModule {}
