import { Field, ObjectType } from '@nestjs/graphql';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
@ObjectType()
export class StatsEntity {
  @PrimaryGeneratedColumn('uuid')
  @Field()
  id: string;
  @Column({ type: 'float', default: 0 })
  @Field()
  highestSale: number;
  @Column({ default: 0 })
  @Field()
  totalSales: number;
  @Field()
  @Column({ default: 0 })
  totalBids: number;
  @Field()
  @Column({ default: 0 })
  connectedUsersCount: number;
  @Field()
  @Column({ type: 'float', default: 15 })
  secondsExtending: number;
}
