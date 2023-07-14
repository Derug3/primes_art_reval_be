import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { NftService } from './nft.service';

@Resolver()
export class NftResolver {
  constructor(private readonly nftService: NftService) {}

  @Mutation(() => Boolean)
  insertNfts(@Args('messgeSignature') messageSignature: string) {
    return this.nftService.storeNfts();
  }
}
