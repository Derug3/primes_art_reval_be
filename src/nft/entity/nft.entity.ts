import { BoxType } from 'src/box_config/types/box_config.types';
import { PrimaryGeneratedColumn, Entity, Column } from 'typeorm';

@Entity()
export class Nft {
  @PrimaryGeneratedColumn('uuid')
  nftId: string;
  @Column()
  nftUri: string;
  @Column({ default: false })
  minted?: boolean;
  @Column({ nullable: true })
  owner?: string;
  @Column({ nullable: true })
  mintedFor?: number;
  @Column({ nullable: true })
  mintedAt?: string;
  @Column({ nullable: true, type: 'enum', enum: BoxType })
  boxType?: BoxType;
  @Column({ default: 0 })
  reshuffleCount: number;
}
