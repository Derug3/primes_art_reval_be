import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThan } from 'typeorm';
import { BoxNfts, Nft } from './entity/nft.entity';
import { NftRepository } from './repository/nft_repository';
import { chunk } from 'lodash';
import { BoxType } from 'src/enum/enums';
import { fromBoxPoolString } from 'src/box_config/utilities/helpers';
import { BoxPool } from 'src/box_config/types/box_config.types';
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
      const nfts: Nft[] = await Promise.all(
        items.map(async (item: any, index: number) => {
          try {
            const nft = new Nft();
            nft.nftId = item.nftId;
            nft.nftUri = item.nftUri;
            nft.nftName = item.nftName;
            //TODO:return
            nft.boxId = item.boxId === '' ? null : item.boxId;
            nft.nftImage = item.imageUri;
            nft.boxPool = fromBoxPoolString(item.box);
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

  async getNonMinted(boxId: string, boxPool: BoxPool) {
    const boxNfts = await this.nftRepository.find({
      where: { minted: false, isInBox: false, boxPool: boxPool as number },
    });

    if (!boxNfts || boxNfts.length === 0) {
      const publicNfts = await this.nftRepository.find({
        where: { minted: false, isInBox: false, boxPool: IsNull() },
      });
      return publicNfts;
    } else {
      const boxIdNfts = boxNfts.filter((nft) => nft.boxId == boxId);
      if (boxIdNfts.length > 0) {
        return boxIdNfts;
      } else {
        return boxNfts.filter(
          (bNnft) => bNnft.boxId === null || bNnft.boxId === undefined,
        );
      }
    }
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

  getAllNfts() {
    const allNfts = this.nftRepository.find();
    return allNfts.then((nfts) =>
      nfts.sort((a, b) => Number(a.nftId) - Number(b.nftId)),
    );
  }

  async getBoxNfts() {
    const boxNfts: BoxNfts[] = [];
    const allNfts = await this.nftRepository.find();
    allNfts.forEach((nft) => {
      const addedIndex = boxNfts.findIndex(
        (bNft) => bNft.boxPool === nft.boxPool ?? BoxPool.Public,
      );
      if (addedIndex < 0) {
        const mintedCount = allNfts.filter(
          (mNft) =>
            mNft.boxPool === (nft.boxPool ?? BoxPool.Public) && mNft.minted,
        ).length;
        boxNfts.push({
          boxPool: nft.boxPool ?? BoxPool.Public,
          nftsCount: 1,
          mintedCount,
        });
      } else {
        boxNfts[addedIndex] = {
          boxPool: nft.boxPool ?? BoxPool.Public,
          nftsCount: boxNfts[addedIndex].nftsCount + 1,
          mintedCount: boxNfts[addedIndex].mintedCount,
        };
      }
    });

    return boxNfts;
  }
}
