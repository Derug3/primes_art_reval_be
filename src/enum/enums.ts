import { registerEnumType } from '@nestjs/graphql';

export enum BoxType {
  BidBuyNow,
  Bid,
  BuyNow,
}

registerEnumType(BoxType, { name: 'BoxType' });
