import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PubSub } from 'graphql-subscriptions';
import { StatsRepository } from '../statistics/repository/stats.repository';
@Injectable()
export class SubscriberService {
  pubSub: PubSub;

  connectedUsersCount = 0;

  constructor() {
    this.pubSub = new PubSub();
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
