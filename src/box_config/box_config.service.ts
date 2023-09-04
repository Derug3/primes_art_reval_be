import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SubscriberService } from 'src/subscriber/subscriber.service';
import { BoxConfigWorker } from './box_config.worker';
import { BoxConfigRepository } from './repository/box.config.repository';
import { SaveOrUpdateBoxConfig } from './so/save_update.so';
import { BoxConfigInput, BoxPool, BoxState } from './types/box_config.types';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import Redis from 'ioredis';
import { NftService } from 'src/nft/nft.service';
import { checkIfMessageIsSigned, claimNft } from './utilities/helpers';
import { RecoverBoxService } from 'src/recover_box/recover_box.service';
import { BoxType } from 'src/enum/enums';
import { UserService } from 'src/user/user.service';
import { StatisticsService } from 'src/statistics/statistics.service';
import { SharedService } from 'src/shared/shared.service';
import { SlackWebhookAdminService } from '../shared/slack-webhook-admin.service';
import { IncomingWebhookSendArguments } from '@slack/webhook';
import { BoxConfig } from './entity/box_config.entity';

@Injectable()
export class BoxConfigService implements OnModuleInit {
  private saveOrUpdateBox: SaveOrUpdateBoxConfig;
  logger = new Logger(BoxConfigService.name);
  workers: BoxConfigWorker[];
  constructor(
    @InjectRepository(BoxConfigRepository)
    private readonly boxConfigRepo: BoxConfigRepository,
    private readonly subscriptionService: SubscriberService,
    private readonly nftService: NftService,
    @InjectRedis()
    private readonly redisService: Redis,
    private readonly recoverBoxService: RecoverBoxService,
    private readonly userService: UserService,
    private readonly statsSerivce: StatisticsService,
    private readonly sharedService: SharedService,
    private readonly slackAdminWebhook: SlackWebhookAdminService,
  ) {
    this.workers = [];
    this.saveOrUpdateBox = new SaveOrUpdateBoxConfig(boxConfigRepo);
  }
  async onModuleInit() {
    try {
      const boxes = await this.boxConfigRepo.getAllDbBoxes();
      this.logger.debug(`Got ${boxes.length} existing boxes from DB!`);
      boxes
        .filter((b) => b.boxState !== BoxState.Removed)
        .forEach((box) => {
          this.workers.push(
            new BoxConfigWorker(
              this.subscriptionService,
              this.boxConfigRepo,
              box,
              this.redisService,
              this.nftService,
              this.recoverBoxService,
              this.userService,
              this.statsSerivce,
              this.sharedService,
            ),
          );
        });
    } catch (error) {
      this.logger.error(`Failed in BoxConfigService ${error.message}`);
    }
  }

  async saveOrUpdateBoxHandler(
    box: BoxConfigInput,
    signedMessage: string,
    authority: string,
  ) {
    if (
      (box.boxType === BoxType.BidBuyNow || box.boxType === BoxType.BuyNow) &&
      (box.buyNowPrice <= 0 || !box.buyNowPrice)
    ) {
      throw new BadRequestException(
        "Can't create box of type BidBuy and Buy without buy now price defined!",
      );
    }
    if (
      (box.boxType === BoxType.Bid || box.boxType === BoxType.BidBuyNow) &&
      (!box.bidStartPrice ||
        box.bidStartPrice <= 0 ||
        !box.bidIncrease ||
        box.bidIncrease <= 0)
    ) {
      throw new BadRequestException(
        "Can't create box of type BidBuy and Bid without bid start price defined!",
      );
    }
    if (box.boxType === BoxType.Bid && box.buyNowPrice >= 0) {
      throw new BadRequestException(
        "Can't define buy now price on box that has bid type!",
      );
    }
    if (
      box.boxType === BoxType.BuyNow &&
      (box.bidStartPrice >= 0 || box.bidIncrease >= 0)
    ) {
      throw new BadRequestException(
        "Can't define bid  price on box that has buy now type type!",
      );
    }

    const isVerified = checkIfMessageIsSigned(
      signedMessage,
      'Update Primes Mint',
      authority,
    );
    if (!isVerified) throw new UnauthorizedException();
    const saved = await this.saveOrUpdateBox.execute(box);
    this.emitAdminWebhookSaveOrUpdateConfig(saved.boxId, box, authority);
    this.logger.debug(`Staring box worker with id: ${saved.boxId}`);
    if (!box.boxId) {
      const newWorker = new BoxConfigWorker(
        this.subscriptionService,
        this.boxConfigRepo,
        saved,
        this.redisService,
        this.nftService,
        this.recoverBoxService,
        this.userService,
        this.statsSerivce,
        this.sharedService,
      );
      this.workers.push(newWorker);
    }

    if (saved.boxState === BoxState.Removed) {
      const index = this.workers.findIndex(
        (box) => box.box.boxId === saved.boxId,
      );
      this.workers.splice(index, 1);
    }
  }

  async getActiveBoxes() {
    return this.workers.map((w) => w.mapToDto());
  }

  async deleteBox(boxId: number, signedMessage: string, authority: string) {
    try {
      const boxIndex = this.workers.findIndex(
        (box) => box.box.boxId.toString() === boxId.toString(),
      );
      if (boxIndex < 0) {
        throw new BadRequestException('Box not found!');
      }
      //TODO:comment in
      const isVerified = checkIfMessageIsSigned(
        signedMessage,
        'Update Primes Mint',
        authority,
      );
      if (!isVerified) throw new UnauthorizedException();
      this.workers[boxIndex].box.boxState = BoxState.Removed;
      this.workers.splice(boxIndex, 1);
      const existingBox = await this.boxConfigRepo.findOne({
        where: { boxId },
      });
      if (existingBox) {
        existingBox.boxState = BoxState.Removed;
        await this.boxConfigRepo.save(existingBox);
        this.emitAdminWebhookDeleteBox(existingBox, authority);
      }
      return true;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async placeBid(serializedTx: string, boxId: string, nftId: string) {
    const box = this.workers?.find((b) => b.box.boxId.toString() === boxId);

    if (!box) throw new NotFoundException('Given box not found!');
    if (box.activeNft?.nftId !== nftId)
      throw new Error('NFT expired, please try on next shuffle!');
    return box.placeBid(serializedTx);
  }
  checkBoxExistance(boxId: number) {
    return this.workers.find((w) => w.box.boxId === boxId);
  }

  async claimBoxNft(tx: any) {
    return await claimNft(tx, this.sharedService.getRpcConnection());
  }
  async deleteAllBoxes(signedMessage: string, authority: string) {
    //TODO:comment in
    const isVerified = checkIfMessageIsSigned(
      signedMessage,
      'Update Primes Mint',
      authority,
    );
    if (!isVerified) throw new UnauthorizedException();
    await this.boxConfigRepo.delete({});

    this.emitAdminWebhookDeleteAllBoxes(authority);

    this.workers = [];
    return true;
  }

  private emitAdminWebhookSaveOrUpdateConfig(
    boxId: number,
    box: BoxConfigInput,
    authority: string,
  ) {
    this.slackAdminWebhook
      .sendMessage({
        blocks: [
          {
            type: 'header',
            text: {
              text: box.boxId
                ? 'Save or Update Box Config'
                : 'Create new Box Config',
              type: 'plain_text',
              emoji: true,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Box ID*\n${boxId}`,
              },
              {
                type: 'mrkdwn',
                text: `*Box Pool*\n${BoxPool[box.boxPool]}`,
              },
            ],
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Box State*\n${BoxState[box.boxState]}`,
              },
              {
                type: 'mrkdwn',
                text: `*Box Type*\n${BoxType[box.boxType]}`,
              },
            ],
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Buy Price*\n${box.buyNowPrice ?? 'none'}`,
              },
              {
                type: 'mrkdwn',
                text: `*Start Bid Price*\n${box.bidStartPrice ?? 'none'}`,
              },
            ],
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Bid Increase Price*\n${box.bidIncrease ?? 'none'}`,
              },
              {
                type: 'mrkdwn',
                text: `*Box Duration*\n${box.boxDuration} sec`,
              },
            ],
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Cooldown Duration*\n${box.cooldownDuration} sec`,
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
        this.logger.debug(
          'Sent webhook admin event "Save or Update Box Config"',
        );
      })
      .catch((e) => {
        this.logger.error(
          'Error send webhook admin event "Save or Update Box Config"',
          e.stack,
        );
      });
  }

  private emitAdminWebhookDeleteBox(boxConfig: BoxConfig, authority: string) {
    this.slackAdminWebhook
      .sendMessage({
        blocks: [
          {
            type: 'header',
            text: {
              text: 'Delete Box Config',
              type: 'plain_text',
              emoji: true,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Box ID*\n${boxConfig.boxId}`,
              },
              {
                type: 'mrkdwn',
                text: `*Box Pool*\n${BoxPool[boxConfig.boxPool]}`,
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
        this.logger.debug('Sent webhook admin event "Delete Box Config"');
      })
      .catch((e) => {
        this.logger.error(
          'Error send webhook admin event "Delete Box Config"',
          e.stack,
        );
      });
  }

  private emitAdminWebhookDeleteAllBoxes(authority: string) {
    this.slackAdminWebhook
      .sendMessage({
        blocks: [
          {
            type: 'header',
            text: {
              text: 'Delete all Box Configs',
              type: 'plain_text',
              emoji: true,
            },
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
        this.logger.debug('Sent webhook admin event "Delete all Box Configs"');
      })
      .catch((e) => {
        this.logger.error(
          'Error send webhook admin event "Delete all Box Configs"',
          e.stack,
        );
      });
  }
}
