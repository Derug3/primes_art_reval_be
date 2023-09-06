import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { v4 } from 'uuid';
import { InjectRepository } from '@nestjs/typeorm';
import { StatsEntity } from './entity/stats.entity';
import { StatsRepository } from './repository/stats.repository';
import { SubscriberService } from 'src/subscriber/subscriber.service';
import { PoolsConfigRepository } from './repository/pools_config.repository';
import { BoxPool } from 'src/box_config/types/box_config.types';
import { checkIfMessageIsSigned } from 'src/box_config/utilities/helpers';
import { SlackWebhookAdminService } from '../shared/slack-webhook-admin.service';
import { IncomingWebhookSendArguments } from '@slack/webhook';

@Injectable()
export class StatisticsService implements OnModuleInit {
  logger = new Logger(StatisticsService.name);
  constructor(
    @InjectRepository(StatsRepository)
    private readonly statsRepo: StatsRepository,
    private readonly subscriberService: SubscriberService,
    @InjectRepository(PoolsConfigRepository)
    private readonly poolConfigRepo: PoolsConfigRepository,
    private readonly slackAdminWebhook: SlackWebhookAdminService,
  ) {}

  async onModuleInit() {
    try {
      this.logger.log(`Statistics inserting`);
      const stats = await this.statsRepo.findOne({ where: {} });

      const poolsConfig = await this.poolConfigRepo.find();

      if (!poolsConfig || poolsConfig.length === 0) {
        await this.poolConfigRepo.save([
          { boxPool: BoxPool.Public, isVisible: true, isVisibleStats: true },
          { boxPool: BoxPool.PreSale, isVisible: true, isVisibleStats: true },
          { boxPool: BoxPool.OG, isVisible: true, isVisibleStats: true },
          { boxPool: BoxPool.PrimeList, isVisible: true, isVisibleStats: true },
        ]);
      }

      if (!stats) {
        const stats: StatsEntity = {
          connectedUsersCount: 0,
          highestSale: 0,
          id: v4(),
          secondsExtending: 15,
          totalBids: 0,
          totalSales: 0,
        };
        await this.statsRepo.save(stats);
      }
    } catch (error) {
      this.logger.error(
        `Error init statistics module: ${error.message}`,
        error.stack,
      );
      console.error(error);
    }
  }

  async increaseBids() {
    try {
      const stats = await this.statsRepo.findOne({ where: {} });
      stats.totalBids += 1;

      await this.statsRepo.save(stats);
      await this.subscriberService.pubSub.publish('getLiveStats', {
        getLiveStats: stats,
      });
    } catch (error) {}
  }

  async increaseSales(salePrice: number) {
    try {
      const stats = await this.statsRepo.findOne({ where: {} });
      stats.totalSales += 1;
      if (stats.highestSale < salePrice) {
        stats.highestSale = salePrice;
      }
      await this.statsRepo.save(stats);
      await this.subscriberService.pubSub.publish('getLiveStats', {
        getLiveStats: stats,
      });
    } catch (error) {
      console.error(error);
      this.logger.error(`Error increase sales: ${error.message}`, error.stack);
    }
  }
  async updateSecondsExtending(
    secondsExtending: number,
    signedMessage: string,
    authority: string,
  ) {
    try {
      //TODO:comment in
      const isVerified = checkIfMessageIsSigned(
        signedMessage,
        'Update Primes Mint',
        authority,
      );
      if (!isVerified) throw new UnauthorizedException();
      const stats = await this.statsRepo.findOne({ where: {} });
      stats.secondsExtending = secondsExtending;
      await this.statsRepo.save(stats);

      this.emitAdminWebhookUpdateSecondsExtending(stats, authority);

      return true;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async getStatsExtending() {
    try {
      return (await this.statsRepo.findOne({ where: {} })).secondsExtending;
    } catch (error) {
      return 15;
    }
  }
  getStats() {
    try {
      return this.statsRepo.findOne({ where: {} });
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  getPoolsConfig() {
    return this.poolConfigRepo.find();
  }

  async updatePoolConfig(
    boxPool: BoxPool,
    isVisible: boolean,
    isVisibleStats: boolean,
    signedMessage: string,
    authority: string,
  ) {
    try {
      const relatedPool = await this.poolConfigRepo.findOne({
        where: { boxPool },
      });
      //TODO:comment in
      const isVerified = checkIfMessageIsSigned(
        signedMessage,
        'Update Primes Mint',
        authority,
      );
      if (!isVerified) throw new UnauthorizedException();
      if (!relatedPool) {
        await this.poolConfigRepo.save({
          boxPool,
          isVisible,
          isVisibleStats,
        });
        this.emitAdminWebhookUpdateBoxPoolVisible(
          boxPool,
          isVisible,
          isVisibleStats,
          authority,
        );
      } else {
        relatedPool.isVisible = isVisible;
        relatedPool.isVisibleStats = isVisibleStats;
        await this.poolConfigRepo.save(relatedPool);
        this.emitAdminWebhookUpdateBoxPoolVisible(
          relatedPool.boxPool,
          isVisible,
          isVisibleStats,
          authority,
        );
      }

      return true;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async deleteStats() {
    try {
      const stats = await this.statsRepo.find();
      stats[0].highestSale = 0;
      stats[0].totalBids = 0;
      stats[0].totalSales = 0;
      await this.statsRepo.save(stats);
      return true;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
  async setStats(totalSales: number) {
    try {
      const stats = await this.statsRepo.find();
      stats[0].totalSales = totalSales;
      await this.statsRepo.save(stats);
    } catch (error) {
      console.error(error);
      this.logger.error(`Error set stats: ${error.message}`, error.stack);
    }
  }

  private emitAdminWebhookUpdateSecondsExtending(
    stats: StatsEntity,
    authority: string,
  ) {
    this.slackAdminWebhook
      .sendMessage({
        blocks: [
          {
            type: 'header',
            text: {
              text:
                SlackWebhookAdminService.getEmojiRuntime() +
                ' Update Seconds Extending',
              type: 'plain_text',
              emoji: true,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Extend bidding duration in seconds*\n${stats.secondsExtending}`,
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
          'Sent webhook admin event "Update Seconds Extending"',
        );
      })
      .catch((e) => {
        this.logger.error(
          'Error send webhook admin event "Update Seconds Extending"',
          e.stack,
        );
      });
  }

  async checkIfPoolIsVisible(pool: BoxPool) {
    try {
      const poolConfig = await this.poolConfigRepo.findOne({
        where: { boxPool: pool },
      });
      return poolConfig.isVisible;
    } catch (error) {
      return false;
    }
  }

  private emitAdminWebhookUpdateBoxPoolVisible(
    boxPool: BoxPool,
    isVisible: boolean,
    isVisibleStats: boolean,
    authority: string,
  ) {
    this.slackAdminWebhook
      .sendMessage({
        blocks: [
          {
            type: 'header',
            text: {
              text:
                SlackWebhookAdminService.getEmojiRuntime() +
                ' Update BoxPool Visible',
              type: 'plain_text',
              emoji: true,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*BoxPool*\n${BoxPool[boxPool]}`,
              },
            ],
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Is Visible Pool*\n${isVisible ? '✅' : '❌'}`,
              },
              {
                type: 'mrkdwn',
                text: `*Is Visible Stats*\n${isVisibleStats ? '✅' : '❌'}`,
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
        this.logger.debug('Sent webhook admin event "Update Box Pool"');
      })
      .catch((e) => {
        this.logger.error(
          'Error send webhook admin event "Update Box Pool"',
          e.stack,
        );
      });
  }
}
