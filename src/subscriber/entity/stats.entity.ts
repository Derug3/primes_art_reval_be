import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class StatsEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column({ default: 0 })
  highestSale: number;
  @Column({ default: 0 })
  totalSales: number;
  @Column({ default: 0 })
  totalBids: number;
  @Column({ default: 0 })
  connectedUsersCount: number;
}
