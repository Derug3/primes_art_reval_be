import { Resolver, Query, Mutation, Args, Subscription } from '@nestjs/graphql';
import { BoxConfigService } from './box_config.service';
import { BoxConfigInput, BoxConfigOutput } from './types/box_config.types';

@Resolver()
export class BoxConfigResolver {
  constructor(private readonly boxConfigService: BoxConfigService) {}

  @Query(() => String)
  query() {
    return 'ThePrimes';
  }

  @Mutation(() => Boolean)
  async saveOrUpdateBoxConfig(
    @Args('boxConfig') boxConfig: BoxConfigInput,
    @Args('signedMessage') signedMessage: string,
  ) {
    await this.boxConfigService.saveOrUpdateBoxHandler(boxConfig);
    return true;
  }

  @Query(() => [BoxConfigOutput])
  getBoxConfigs() {
    return this.boxConfigService.getActiveBoxes();
  }

  @Mutation(() => Boolean)
  deleteBox(@Args('boxId') boxId: string) {
    return this.boxConfigService.deleteBox(boxId);
  }

  @Mutation(() => Boolean)
  placeBid(
    @Args('serializedTransaction') serializedTransaction: string,
    @Args('boxId') boxId: string,
  ) {
    return this.boxConfigService.placeBid(serializedTransaction, boxId);
  }

  @Mutation(() => Boolean)
  claimNft(@Args('serializedTx') serializedTx: string) {
    return this.boxConfigService.claimBoxNft(serializedTx);
  }

  @Mutation(() => Boolean)
  deleteAllBoxes() {
    return this.boxConfigService.deleteAllBoxes();
  }
}
