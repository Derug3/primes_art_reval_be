import { ApolloDriver } from '@nestjs/apollo';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PubSub } from 'graphql-subscriptions';
import { BoxConfigModule } from 'src/box_config/box_config.module';
import { NftModule } from 'src/nft/nft.module';
import { UserModule } from 'src/user/user.module';
import { StatsRepository } from './repository/stats.repository';
@Injectable()
export class SubscriberService implements OnModuleInit {
  pubSub: PubSub;

  connectedUsersCount = 0;

  constructor(
    @InjectRepository(StatsRepository)
    private readonly statsRepo?: StatsRepository,
  ) {
    this.pubSub = new PubSub();
  }
  async onModuleInit() {
    try {
      const stats = await this.statsRepo.find();
      if (!stats || stats.length === 0) {
        await this.statsRepo.save(stats);
      }
    } catch (error) {
      console.log(error);
    }
  }

  async setConnected() {
    this.connectedUsersCount++;
    await this.pubSub.publish('userConnectionChanged', {
      userConnectionChanged: true,
    });
  }

  async setDisconnected() {
    this.connectedUsersCount--;
    await this.pubSub.publish('userConnectionChanged', {
      userConnectionChanged: false,
    });
  }

  async getConnectedUsersCount() {
    return this.connectedUsersCount;
  }
}
