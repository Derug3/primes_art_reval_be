import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class RecoverBox {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column()
  boxData: string;
  @Column()
  boxTreasury: string;
  @Column({ nullable: true })
  winner: string;
  @Column({ type: 'float' })
  winningAmount: number;
  @Column()
  nftId: string;
  @Column()
  nftUri: string;
  @Column()
  failedAt: Date;
}
