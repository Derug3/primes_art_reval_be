import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { v4 } from 'uuid';
import { InjectRepository } from '@nestjs/typeorm';
import { StatsEntity } from './entity/stats.entity';
import { StatsRepository } from './repository/stats.repository';
import { SubscriberService } from 'src/subscriber/subscriber.service';
import { PoolsConfigRepository } from './repository/pools_config.repository';
import { BoxPool } from 'src/box_config/types/box_config.types';

@Injectable()
export class StatisticsService implements OnModuleInit {
  logger = new Logger(StatisticsService.name);
  constructor(
    @InjectRepository(StatsRepository)
    private readonly statsRepo: StatsRepository,
    private readonly subscriberService: SubscriberService,
    @InjectRepository(PoolsConfigRepository)
    private readonly poolConfigRepo: PoolsConfigRepository,
  ) {}

  async onModuleInit() {
    try {
      this.logger.log(`Statistics inserting`);
      const stats = await this.statsRepo.findOne({ where: {} });

      const poolsConfig = await this.poolConfigRepo.find();

      if (!poolsConfig || poolsConfig.length === 0) {
        await this.poolConfigRepo.save([
          { boxPool: BoxPool.Public, isVisible: true },
          { boxPool: BoxPool.PreSale, isVisible: true },
          { boxPool: BoxPool.OG, isVisible: true },
          { boxPool: BoxPool.PrimeList, isVisible: true },
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
      console.log(error);
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
      console.log(error);
    }
  }
  async updateSecondsExtending(
    secondsExtending: number,
    sugbedMessage: string,
    authority: string,
  ) {
    try {
      //TODO:comment in
      // const isVerified = checkIfMessageIsSigned(
      //   signedMessage,
      //   'Update Primes Mint',
      //   authority,
      // );
      // if(!isVerified) throw new UnauthorizedException()
      const stats = await this.statsRepo.findOne({ where: {} });
      stats.secondsExtending = secondsExtending;
      await this.statsRepo.save(stats);
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
    signedMessage: string,
    authority: string,
  ) {
    try {
      const relatedPool = await this.poolConfigRepo.findOne({
        where: { boxPool },
      });
      //TODO:comment in
      // const isVerified = checkIfMessageIsSigned(
      //   signedMessage,
      //   'Update Primes Mint',
      //   authority,
      // );
      // if(!isVerified) throw new UnauthorizedException()
      if (!relatedPool) {
        await this.poolConfigRepo.save({
          boxPool,
          isVisible,
        });
      } else {
        relatedPool.isVisible = isVisible;
        await this.poolConfigRepo.save(relatedPool);
      }
      return true;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async deleteStats() {
    try {
      const stats = await this.statsRepo.findOne({});
      stats.highestSale = 0;
      stats.totalBids = 0;
      stats.totalSales = 0;
      await this.statsRepo.save(stats);
      return true;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
