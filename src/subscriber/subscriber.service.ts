import { Injectable } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
@Injectable()
export class SubscriberService {
  pubSub: PubSub;

  static connectedUsersCount = 0;

  constructor() {
    this.pubSub = new PubSub();
  }

  static setConnected() {
    this.connectedUsersCount += 1;
  }

  static setDisconnected() {
    this.connectedUsersCount -= 1;
  }
}
