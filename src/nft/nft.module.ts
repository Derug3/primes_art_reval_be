import { Module } from '@nestjs/common';
import { NftService } from './nft.service';
import { NftResolver } from './nft.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Nft } from './entity/nft.entity';
import { NftRepository } from './repository/nft_repository';
import { ConfigModule } from '@nestjs/config';

import { StatisticsModule } from 'src/statistics/statistics.module';
@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forFeature([Nft]),
    StatisticsModule,
  ],

  providers: [NftResolver, NftService, NftRepository],
  exports: [NftService],
})
export class NftModule {}
