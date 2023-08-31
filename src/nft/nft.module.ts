import { Module } from '@nestjs/common';
import { NftService } from './nft.service';
import { NftResolver } from './nft.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Nft } from './entity/nft.entity';
import { NftRepository } from './repository/nft_repository';
import { ConfigModule } from '@nestjs/config';
import { StatisticsService } from 'src/statistics/statistics.service';
@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forFeature([Nft]),
    StatisticsService,
  ],
  providers: [NftResolver, NftService, NftRepository],
  exports: [NftService],
})
export class NftModule {}
