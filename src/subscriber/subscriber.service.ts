import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PubSub } from 'graphql-subscriptions';
import { StatsRepository } from './repository/stats.repository';
@Injectable()
export class SubscriberService implements OnModuleInit {
  pubSub: PubSub;

  static connectedUsersCount = 0;

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
    await this.pubSub.publish('userConnectionChanged', {
      userConnectionChanged: true,
    });
  }

  async setDisconnected() {
    await this.pubSub.publish('userConnectionChanged', {
      userConnectionChanged: false,
    });
  }

  async getConnectedUsersCount() {
    return (await this.statsRepo.findOne({})).connectedUsersCount;
  }
}
