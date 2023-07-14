import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { BoxConfigService } from './box_config.service';
import { BoxConfigInput } from './types/box_config.types';

@Resolver()
export class BoxConfigResolver {
  constructor(private readonly boxConfigService: BoxConfigService) {}

  @Query(() => String)
  query() {
    return 'ThePrimes';
  }

  @Mutation(() => Boolean)
  saveOrUpdateBoxConfig(
    @Args('boxConfig') boxConfig: BoxConfigInput,
    @Args('signedMessage') signedMessage: string,
  ) {
    return true;
  }
}
