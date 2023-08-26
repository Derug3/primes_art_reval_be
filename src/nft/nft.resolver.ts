import { Args, Mutation, Resolver, Query } from '@nestjs/graphql';
import { BoxNfts, Nft } from './entity/nft.entity';
import { NftService } from './nft.service';

@Resolver()
export class NftResolver {
  constructor(private readonly nftService: NftService) {}

  @Mutation(() => Boolean)
  insertNfts(
    @Args('signedMessage') signedMessage: string,
    @Args('authority') authority: string,
  ) {
    return this.nftService.storeNfts(signedMessage, authority);
  }

  @Query(() => [Nft])
  getShuffled() {
    return this.nftService.getShuffled();
  }

  @Query(() => [Nft])
  getInBox() {
    return this.nftService.getInBox();
  }

  @Query(() => [Nft])
  getMinted() {
    return this.nftService.getMinted();
  }

  @Query(() => [Nft])
  getAllNfts() {
    return this.nftService.getAllNfts();
  }

  @Query(() => [BoxNfts])
  getBoxNfts() {
    return this.nftService.getBoxNfts();
  }
}
