import { BoxType } from 'src/enum/enums';
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { BoxPool, BoxState } from '../types/box_config.types';

@Entity()
export class BoxConfig {
  @PrimaryGeneratedColumn('increment')
  boxId: number;
  @Column({ type: 'enum', enum: BoxPool })
  boxPool: BoxPool;
  @Column({ nullable: true })
  executionsCount: number;
  @Column({ type: 'float' })
  boxDuration: number;
  @Column({ nullable: true, type: 'float' })
  initialDelay?: number;
  @Column({ nullable: true, type: 'float' })
  buyNowPrice?: number;
  @Column({ nullable: true, type: 'float' })
  bidStartPrice?: number;
  @Column({ nullable: true, type: 'float' })
  bidIncrease: number;
  @Column({ type: 'float' })
  boxPause: number;
  @Column({ type: 'float' })
  cooldownDuration: number;
  @Column({ type: 'enum', enum: BoxState })
  boxState: BoxState;
  @Column({ type: 'enum', enum: BoxType })
  boxType: BoxType;
}
