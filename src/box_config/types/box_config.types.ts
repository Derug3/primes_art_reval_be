import {
  Field,
  InputType,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import { BoxType } from 'src/enum/enums';
import { Nft } from 'src/nft/entity/nft.entity';

@ObjectType('BoxTimingStateOutput')
@InputType('BoxTimingStateInput')
export class BoxTimigState {
  @Field()
  startedAt: number;
  @Field()
  endsAt: number;
  @Field(() => BoxState)
  state: BoxState;
}

@InputType('BoxConfigIn')
@ObjectType('BoxConfigOut')
export class BoxConfigInput {
  @Field({ nullable: true })
  boxId: string;
  @Field(() => BoxPool)
  boxPool: BoxPool;
  @Field()
  boxDuration: number;
  @Field({ nullable: true })
  initialDelay?: number;
  @Field({ nullable: true })
  buyNowPrice?: number;
  @Field({ nullable: true })
  bidStartPrice?: number;
  @Field({ nullable: true })
  bidIncrease: number;
  @Field()
  cooldownDuration: number;
  @Field()
  boxPause: number;
  @Field(() => BoxState)
  boxState: BoxState;
  @Field(() => BoxType)
  boxType: BoxType;
}

@ObjectType()
export class BoxConfigOutput extends BoxConfigInput {
  @Field(() => BoxTimigState)
  boxTimingState: BoxTimigState;
  @Field({ nullable: true })
  executionsCount: number;
  @Field()
  bidsCount: number;
  @Field({ nullable: true })
  activeNft?: Nft;
  @Field({ nullable: true })
  activeBid: number;
  @Field({ nullable: true })
  bidder: string;
}

export enum BoxPool {
  PreSale,
  OG,
  PrimeList,
  Public,
}

registerEnumType(BoxPool, {
  name: 'BoxPool',
});

export enum BoxState {
  Active,
  Paused,
  Removed,
  Cooldown,
  Won,
}

registerEnumType(BoxState, { name: 'BoxState' });

export enum BoxStatus {
  Bidding,
  Won,
  Failed,
}

registerEnumType(BoxStatus, { name: 'BoxStatus' });
