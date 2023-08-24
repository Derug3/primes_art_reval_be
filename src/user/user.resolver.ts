import { Logger } from '@nestjs/common';
import { Mutation, Resolver, Query, Args, Subscription } from '@nestjs/graphql';
import { PubSub } from 'graphql-subscriptions';
import { User } from './entity/user.entity';
import { UserService } from './user.service';

@Resolver()
export class UserResolver {
  pubSub: PubSub = new PubSub();
  logger = new Logger(UserResolver.name);
  constructor(private readonly userService: UserService) {}

  @Mutation(() => Boolean)
  storeUsers() {
    return this.userService.storeUsers();
  }

  @Query(() => User, { nullable: true })
  async getUserByWallet(@Args('wallet') wallet: string) {
    const user = await this.userService.getUserByWallet(wallet);

    return user;
  }

  @Query(() => [User], { nullable: true })
  async getAllUsers() {
    const users = await this.userService.getAllUsers();

    return users;
  }
}
