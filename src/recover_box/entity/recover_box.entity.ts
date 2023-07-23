import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class RecoverBox {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column()
  boxData: string;
  @Column()
  boxTreasury: string;
  @Column()
  winner: string;
  @Column()
  winningAmount: string;
  @Column()
  nftId: string;
  @Column()
  nftUri: string;
  @Column()
  failedAt: Date;
}
