import { Module } from '@nestjs/common';
import { NftService } from './nft.service';
import { NftResolver } from './nft.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Nft } from './entity/nft.entity';
import { NftRepository } from './repository/nft_repository';
import { ConfigModule } from '@nestjs/config';
@Module({
  imports: [ConfigModule.forRoot(), TypeOrmModule.forFeature([Nft])],
  providers: [NftResolver, NftService, NftRepository],
})
export class NftModule {}
