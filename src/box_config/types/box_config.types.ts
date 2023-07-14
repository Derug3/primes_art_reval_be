import {
  Field,
  InputType,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';

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

@InputType()
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
}

@ObjectType()
export class BoxConfigOutput extends BoxConfigInput {
  @Field(() => BoxTimigState)
  boxTimingState: BoxTimigState;
  @Field()
  executionsCount: number;
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
}

registerEnumType(BoxState, { name: 'BoxState' });
