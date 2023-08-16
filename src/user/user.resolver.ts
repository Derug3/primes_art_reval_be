import { Logger } from '@nestjs/common';
import { Mutation, Resolver, Query, Args, Subscription } from '@nestjs/graphql';
import { PubSub } from 'graphql-subscriptions';
import { User } from './entity/user.entity';
import { UserService } from './user.service';

@Resolver()
export class UserResolver {
  pubSub: PubSub = new PubSub();
  connectedCount = 0;
  logger = new Logger(UserResolver.name);
  constructor(private readonly userService: UserService) {}

  @Mutation(() => Boolean)
  storeUsers() {
    return this.userService.storeUsers();
  }

  @Query(() => User, { nullable: true })
  async getUserByWallet(@Args('wallet') wallet: string) {
    const user = await this.userService.getUserByWallet(wallet);
    if (user) {
      this.connectedCount++;
      this.pubSub.publish('userConnectionChanged', {
        userConnectionChanged: true,
      });
    }
    return user;
  }

  handleDisconnect() {
    this.logger.verbose('User disconnected');
    this.connectedCount--;
    this.pubSub.publish('userConnectionChanged', {
      userConnectionChanged: false,
    });
  }

  @Query(() => Number)
  getConnectedUsersCount() {
    return this.connectedCount;
  }

  @Subscription(() => Boolean)
  userConnectionChanged() {
    return this.pubSub.asyncIterator('userConnectionChanged');
  }
}
