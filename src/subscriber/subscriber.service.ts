import { Injectable, OnModuleInit } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { Redis } from 'ioredis';
import { InjectRedis } from '@liaoliaots/nestjs-redis';

@Injectable()
export class SubscriberService implements OnModuleInit {
  pubSub: PubSub;
  constructor(@InjectRedis() private readonly redisService: Redis) {
    this.pubSub = new PubSub();
    //@ts-ignore
    this.pubSub.ee.setMaxListeners(1500);
  }
  async onModuleInit() {
    this.redisService.set('liveUsersCount', 0);
    this.redisService.flushall();
  }

  async setConnected() {
    await this.redisService.incr('liveUsersCount');
    await this.pubSub.publish('userConnectionChanged', {
      userConnectionChanged: true,
    });
  }
  async setDisconnected() {
    await this.redisService.decr('liveUsersCount');
    await this.pubSub.publish('userConnectionChanged', {
      userConnectionChanged: false,
    });
  }

  async getConnectedUsersCount() {
    const connected = await this.redisService.get('liveUsersCount');
    return connected;
  }
}
