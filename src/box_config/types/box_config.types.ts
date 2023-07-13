import {
  Field,
  InputType,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';

@InputType('BoxConfigInput')
@ObjectType('BoxConfigOutput')
export class BoxConfigDto {
  @Field({ nullable: true })
  boxId: string;
  @Field(() => BoxPool)
  boxPool: BoxPool;
  @Field()
  executionsCount: number;
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
  @Field(() => BoxState)
  boxState: BoxState;
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
}

registerEnumType(BoxState, { name: 'BoxState' });
