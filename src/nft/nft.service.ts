import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan } from 'typeorm';
import { Nft } from './entity/nft.entity';
import { NftRepository } from './repository/nft_repository';
import { chunk } from 'lodash';
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
      this.logger.log(`Started inserting of nfts!`);

      const cdnNfts = await (await fetch(cdnUrl, { method: 'GET' })).json();
      if (cdnNfts.error) {
        throw new BadRequestException(cdnNfts.error_message);
      }

      const items = cdnNfts.data.result;

      this.logger.log(`Got ${items.length} NFTs`);

      await this.nftRepository.delete({});

      const nfts: Nft[] = await Promise.all(
        items.map(async (item: any) => {
          try {
            const nft = new Nft();
            nft.nftUri = item.nftUri;
            nft.nftName = item.nftName;
            nft.isInBox = false;
            nft.reshuffleCount = 0;
            nft.boxId = item.boxId === '' ? null : item.boxId;
            nft.nftImage = item.imageUri;
            return nft;
          } catch (error) {
            console.log(error);

            return null;
          }
        }),
      );
      const chunkedNfts = chunk(
        nfts.filter((n) => n !== null),
        200,
      );

      for (const nftsChunk of chunkedNfts) {
        await this.nftRepository.save(nftsChunk);
      }

      return true;
    } catch (error) {
      console.log(error);

      throw new BadRequestException(error.message);
    }
  }

  async getNonMinted(boxId: string) {
    const boxNfts = await this.nftRepository.find({
      where: { minted: false, isInBox: false, boxId },
    });
    if (!boxNfts || boxNfts.length === 0) {
      return this.nftRepository.find({
        where: { minted: false, isInBox: false, boxId: null },
      });
    }

    return boxNfts;
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
