import { Field, ObjectType } from '@nestjs/graphql';
import { BoxPool } from 'src/box_config/types/box_config.types';
import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
@ObjectType()
export class PoolsConfig {
  @PrimaryColumn({ type: 'enum', enum: BoxPool })
  @Field(() => BoxPool)
  boxPool: BoxPool;
  @Field()
  @Column()
  isVisible: boolean;
}
