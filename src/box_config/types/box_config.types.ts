import { InputType, ObjectType, registerEnumType } from '@nestjs/graphql';
import { Column, PrimaryGeneratedColumn } from 'typeorm';

@InputType('BoxConfigInput')
@ObjectType('BoxConfigOutput')
export class BoxConfigDto {
  @PrimaryGeneratedColumn('uuid')
  boxId: string;
  @Column({ type: 'enum' })
  boxPool: BoxPool;
  @Column()
  executionsCount: number;
  @Column({ nullable: true })
  initialDelay?: number;
  @Column({ nullable: true })
  buyNowPrice?: number;
  @Column({ nullable: true })
  bidStartPrice?: number;
  @Column({ nullable: true })
  bidIncrease: number;
  @Column()
  cooldownDuration: number;
  @Column({ type: 'enum' })
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
