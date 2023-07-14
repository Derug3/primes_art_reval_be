import { Field, ObjectType } from '@nestjs/graphql';
import { BoxType } from 'src/box_config/types/box_config.types';
import { PrimaryGeneratedColumn, Entity, Column } from 'typeorm';

@Entity()
@ObjectType()
export class Nft {
  @Field()
  @PrimaryGeneratedColumn('uuid')
  nftId: string;
  @Field()
  @Column()
  nftUri: string;
  @Field()
  @Column({ default: false })
  minted?: boolean;
  @Field()
  @Column({ nullable: true })
  owner?: string;
  @Field()
  @Column({ nullable: true })
  mintedFor?: number;
  @Field()
  @Column({ nullable: true })
  mintedAt?: string;
  @Field()
  @Column({ nullable: true, type: 'enum', enum: BoxType })
  boxType?: BoxType;
  @Field()
  @Column({ default: 0 })
  reshuffleCount: number;
}
