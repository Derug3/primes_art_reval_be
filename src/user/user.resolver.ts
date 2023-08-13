import { Mutation, Resolver, Query, Args } from '@nestjs/graphql';
import { User } from './entity/user.entity';
import { UserService } from './user.service';

@Resolver()
export class UserResolver {
  constructor(private readonly userService: UserService) {}

  @Mutation(() => Boolean)
  storeUsers() {
    return this.userService.storeUsers();
  }

  @Query(() => User, { nullable: true })
  getUserByWallet(@Args('wallet') wallet: string) {
    return this.userService.getUserByWallet(wallet);
  }
}
