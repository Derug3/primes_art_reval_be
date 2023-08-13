import { Field, ObjectType } from '@nestjs/graphql';
import { BoxType } from 'src/enum/enums';
import { PrimaryGeneratedColumn, Entity, Column } from 'typeorm';

@Entity()
@ObjectType()
export class Nft {
  @Field()
  @PrimaryGeneratedColumn('uuid')
  nftId: string;
  @Field()
  @Column({ nullable: true })
  nftImage: string;
  @Field()
  @Column({ nullable: true })
  nftName: string;
  @Column({ nullable: true })
  boxId: string;
  @Field()
  @Column({ nullable: true })
  nftUri: string;
  @Field()
  @Column({ nullable: true })
  isInBox: boolean;
  @Field()
  @Column({ default: false })
  minted?: boolean;
  @Field({ nullable: true })
  @Column({ nullable: true })
  owner?: string;
  @Field({ nullable: true })
  @Column({ nullable: true })
  mintedFor?: number;
  @Field({ nullable: true })
  @Column({ nullable: true })
  mintedAt?: string;
  @Field(() => BoxType, { nullable: true })
  @Column({ type: 'enum', enum: BoxType, nullable: true })
  boxType?: BoxType;
  @Field()
  @Column({ default: 0 })
  reshuffleCount: number;
}
