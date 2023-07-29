import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan } from 'typeorm';
import { Nft } from './entity/nft.entity';
import { NftRepository } from './repository/nft_repository';

@Injectable()
export class NftService {
  logger: Logger = new Logger(NftService.name);
  constructor(
    @InjectRepository(NftRepository)
    private readonly nftRepository: NftRepository,
    private readonly configService: ConfigService,
  ) {}

  async storeNfts() {
    try {
      const cdnUrl = this.configService.get<string>('NFT_CND_URL');

      const cdnNfts = await (await fetch(cdnUrl, { method: 'GET' })).json();

      await this.nftRepository.delete({});

      const nfts: Nft[] = await Promise.all(
        cdnNfts.slice(0, 500).map(async (nftUri: any) => {
          const nft = new Nft();
          const nftData = await (await fetch(nftUri)).json();
          nft.nftUri = nftUri;
          nft.nftName = nftData.name;
          nft.isInBox = false;
          nft.reshuffleCount = 0;
          nft.nftImage = nftData.image;
          return nft;
        }),
      );

      await this.nftRepository.save(nfts);

      return true;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  getNonMinted() {
    return this.nftRepository.find({
      where: { minted: false, isInBox: false },
    });
  }

  async updateNft(nftId: string, hasMinted: boolean) {
    try {
      const nft = await this.nftRepository.findOne({ where: { nftId } });
      if (!nft) throw new Error(`Nft with id ${nftId} not found in DB!`);
      if (hasMinted) {
        nft.minted = true;
      } else {
        nft.reshuffleCount++;
      }
      this.logger.verbose(`NFT with id:${nftId} is minted:${hasMinted}`);
      await this.nftRepository.save(nft);
    } catch (error) {
      this.logger.error(error.message);
    }
  }

  async toggleNftBoxState(nftId: string, isInBox: boolean) {
    try {
      const nft = await this.nftRepository.findOne({ where: { nftId } });
      if (!nft) throw new Error(`Nft with id ${nftId} not found in DB!`);
      nft.isInBox = isInBox;
      await this.nftRepository.save(nft);
    } catch (error) {
      this.logger.error(error.message);
    }
  }

  getInBox() {
    return this.nftRepository.find({ where: { isInBox: true } });
  }

  getShuffled() {
    return this.nftRepository.find({
      where: { reshuffleCount: MoreThan(0), minted: false },
    });
  }

  getMinted() {
    return this.nftRepository.find({ where: { minted: true } });
  }

  async updateNfts() {
    const nfts = (await this.nftRepository.find()).map((n) => ({
      ...n,
      minted: true,
    }));

    const rand = Math.round(Math.random() * (nfts.length - 1));

    nfts[rand].minted = false;

    await this.nftRepository.save(nfts);
    return true;
  }
}
