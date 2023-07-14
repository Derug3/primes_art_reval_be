import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { BoxPool, BoxState, BoxType } from '../types/box_config.types';

@Entity()
export class BoxConfig {
  @PrimaryGeneratedColumn('uuid')
  boxId: string;
  @Column({ type: 'enum', enum: BoxPool })
  boxPool: BoxPool;
  @Column()
  executionsCount: number;
  @Column()
  boxDuration: number;
  @Column({ nullable: true })
  initialDelay?: number;
  @Column({ nullable: true })
  buyNowPrice?: number;
  @Column({ nullable: true })
  bidStartPrice?: number;
  @Column({ nullable: true })
  bidIncrease: number;
  @Column()
  boxPause: number;
  @Column()
  cooldownDuration: number;
  @Column({ type: 'enum', enum: BoxState })
  boxState: BoxState;
  @Column({ type: 'enum', enum: BoxType })
  boxType: BoxType;
}
