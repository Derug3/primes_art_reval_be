import { Module } from '@nestjs/common';
import { NftService } from './nft.service';
import { NftResolver } from './nft.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Nft } from './entity/nft.entity';
import { NftRepository } from './repository/nft_repository';
import { ConfigModule } from '@nestjs/config';
import { StatisticsModule } from 'src/statistics/statistics.module';
import { SharedModule } from 'src/shared/shared.module';
import { SlackWebhookAdminService } from '../shared/slack-webhook-admin.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forFeature([Nft]),
    StatisticsModule,
    SharedModule,
  ],

  providers: [NftResolver, NftService, NftRepository, SlackWebhookAdminService],
  exports: [NftService],
})
export class NftModule {}
