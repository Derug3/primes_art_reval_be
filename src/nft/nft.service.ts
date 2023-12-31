import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, MoreThan } from 'typeorm';
import { BoxNfts, Nft } from './entity/nft.entity';
import { NftRepository } from './repository/nft_repository';

import {
  checkIfMessageIsSigned,
  fromBoxPoolString,
  primeBoxWinnerSeed,
  program,
} from 'src/box_config/utilities/helpers';
import { BoxPool } from 'src/box_config/types/box_config.types';
import { StatisticsService } from 'src/statistics/statistics.service';
import { PublicKey } from '@solana/web3.js';
import { SharedService } from 'src/shared/shared.service';
import { IncomingWebhookSendArguments } from '@slack/webhook';
import { SlackWebhookAdminService } from '../shared/slack-webhook-admin.service';
@Injectable()
export class NftService implements OnModuleInit {
  logger: Logger = new Logger(NftService.name);
  constructor(
    @InjectRepository(NftRepository)
    private readonly nftRepository: NftRepository,
    private readonly configService: ConfigService,
    private readonly statsService: StatisticsService,
    private readonly sharedService: SharedService,
    private readonly slackAdminWebhook: SlackWebhookAdminService,
  ) {}
  async onModuleInit() {
    try {
      const inBoxNfts = (
        await this.nftRepository.find({
          where: { isInBox: true },
        })
      ).map((nft) => ({ ...nft, isInBox: false }));
      await this.nftRepository.save(inBoxNfts);
    } catch (error) {
      console.log(error);
    }
  }
  async storeNfts(signedMessage: string, authority: string) {
    try {
      const cdnUrl = this.configService.get<string>('NFT_CND_URL');
      const isVerified = checkIfMessageIsSigned(
        signedMessage,
        'Update Primes Mint',
        authority,
      );
      if (!isVerified) throw new UnauthorizedException();
      this.logger.log(`Started inserting of nfts!`);
      const cdnNfts = await (await fetch(cdnUrl, { method: 'GET' })).json();
      if (cdnNfts.error) {
        throw new BadRequestException(cdnNfts.error_message);
      }

      const items = cdnNfts.data.result;

      if (items === null) {
        this.logger.error('Received an empty NFT list.', {
          response: cdnNfts,
          cdnUrl,
          authority,
        });
        throw new BadRequestException('Received an empty NFT list.');
      }

      this.logger.log(`Got ${items.length} NFTs`);
      const nfts: Nft[] = await Promise.all(
        items.map(async (item: any, index: number) => {
          try {
            const nft = new Nft();

            nft.nftId = item.nftId.toString();
            nft.nftUri = item.nftUri;
            nft.nftName = item.nftName;
            nft.boxId =
              item.boxId === '' || item.boxId === null ? null : item.boxId;
            nft.nftImage = item.imageUri;
            nft.boxPool = fromBoxPoolString(item.box);
            return nft;
          } catch (error) {
            console.error(error);
            this.logger.error(
              `Error create NFT #${item.nftId}: ${error.message}`,
              error.stack,
            );
            return null;
          }
        }),
      );
      const validNfts = nfts.filter((n) => n !== null);
      await this.nftRepository.save(validNfts, { chunk: 100 });

      this.emitAdminWebhookNfts(validNfts, authority, 'Save NFTs');

      return true;
    } catch (error) {
      console.log(error);
      this.logger.error(`Error store NFTs: ${error.message}`, error.stack);
      throw new BadRequestException(error.message);
    }
  }

  async getNonMinted(boxId: number, boxPool: BoxPool) {
    const boxNfts = await this.nftRepository.find({
      where: { minted: false, isInBox: false, boxPool: boxPool as number },
    });

    if (!boxNfts || boxNfts.length === 0) {
      const publicNfts = await this.nftRepository.find({
        where: { minted: false, isInBox: false, boxPool: IsNull() },
      });
      return publicNfts;
    } else {
      const boxIdNfts = boxNfts.filter((nft) => nft.boxId == boxId.toString());

      if (boxIdNfts.length > 0) {
        return boxIdNfts;
      } else {
        const filteredPoolNfts = boxNfts.filter(
          (b) => b.boxId === null || b.boxId == '0',
        );

        if (filteredPoolNfts.length > 0) return filteredPoolNfts;
        else
          return await this.nftRepository.find({
            where: { minted: false, isInBox: false, boxPool: IsNull() },
          });
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
      this.logger.verbose(`NFT with id:${nftId} is minted: ${hasMinted}`);
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

  async deleteAllNfts(signedMessage: string, authority: string) {
    try {
      //TODO:comment in
      const isVerified = checkIfMessageIsSigned(
        signedMessage,
        'Update Primes Mint',
        authority,
      );
      if (!isVerified) throw new UnauthorizedException();
      const allNFts = await this.nftRepository.find();

      await this.nftRepository.remove(allNFts);

      this.emitAdminWebhookNfts(allNFts, authority, 'Delete all NFTs');
      return true;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async syncData() {
    try {
      const allProofs = (await program.account.winningProof.all()).map(
        (acc) => acc.account.nftId,
      );

      const allNfts = await this.nftRepository.find({
        where: { nftId: In(allProofs) },
      });

      const nonMinted = allNfts.filter((n) => !n.minted);

      this.logger.warn(`Found ${nonMinted.length} non-synced NFTs!`);

      const mapped = [...nonMinted].map((nft) => ({ ...nft, minted: true }));

      await this.nftRepository.save(mapped);
      return true;
    } catch (error) {
      console.log(error);
      this.logger.error(`Error sync data: ${error.message}`, error.stack);
      throw new BadRequestException('Error');
    }
  }

  private emitAdminWebhookNfts(nfts: Nft[], authority: string, title: string) {
    this.slackAdminWebhook
      .sendMessage({
        blocks: [
          {
            type: 'header',
            text: {
              text: SlackWebhookAdminService.getEmojiRuntime() + ' ' + title,
              type: 'plain_text',
              emoji: true,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*NFTs count*\n${nfts.length}`,
              },
            ],
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Authority*\n<https://solscan.io/account/${authority}|${authority}>`,
              },
              {
                type: 'mrkdwn',
                text: `*Program*\n<https://solscan.io/account/${
                  process.env.PROGRAM_ID as string
                }|${process.env.PROGRAM_ID as string}>`,
              },
            ],
          },
        ],
      } as IncomingWebhookSendArguments)
      .then(() => {
        this.logger.debug('Sent webhook admin event "Save NFTs"');
      })
      .catch((e) => {
        this.logger.error(
          'Error send webhook admin event "Save NFTs"',
          e.stack,
        );
      });
  }
}
