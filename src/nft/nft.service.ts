import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Nft } from './entity/nft.entity';
import { NftRepository } from './repository/nft_repository';

@Injectable()
export class NftService {
  constructor(
    @InjectRepository(NftRepository)
    private readonly nftRepository: NftRepository,
    private readonly configService: ConfigService,
  ) {}

  async storeNfts() {
    try {
      const cdnUrl = this.configService.get<string>('NFT_CND_URL');

      const cdnNfts = await (await fetch(cdnUrl, { method: 'GET' })).json();

      const nfts: Nft[] = cdnNfts.map((nftUri: any) => {
        const nft = new Nft();
        nft.nftUri = nftUri;
        nft.reshuffleCount = 0;
        return nft;
      });

      await this.nftRepository.save(nfts);

      return true;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  getNonMinted() {
    return this.nftRepository.find({ where: { minted: false } });
  }
}
