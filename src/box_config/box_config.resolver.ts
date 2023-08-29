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
    @Args('authority') authority: string,
  ) {
    await this.boxConfigService.saveOrUpdateBoxHandler(
      boxConfig,
      signedMessage,
      authority,
    );
    return true;
  }

  @Query(() => [BoxConfigOutput])
  getBoxConfigs() {
    return this.boxConfigService.getActiveBoxes();
  }

  @Mutation(() => Boolean)
  deleteBox(
    @Args('boxId') boxId: string,
    @Args('signedMessage') signedMessage: string,
    @Args('authority') authority: string,
  ) {
    return this.boxConfigService.deleteBox(+boxId, signedMessage, authority);
  }

  @Mutation(() => Boolean, { nullable: true })
  placeBid(
    @Args('serializedTransaction') serializedTransaction: string,
    @Args('boxId') boxId: string,
    @Args('nftId') nftId: string,
  ) {
    return this.boxConfigService.placeBid(serializedTransaction, boxId, nftId);
  }

  @Mutation(() => Boolean)
  claimNft(@Args('serializedTx') serializedTx: string) {
    return this.boxConfigService.claimBoxNft(serializedTx);
  }

  @Mutation(() => Boolean)
  deleteAllBoxes(
    @Args('signedMessage') signedMessage: string,
    @Args('authority') authority: string,
  ) {
    return this.boxConfigService.deleteAllBoxes(signedMessage, authority);
  }
}
