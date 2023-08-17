import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { StatsEntity } from '../entity/stats.entity';

@Injectable()
export class StatsRepository extends Repository<StatsEntity> {
  constructor(private readonly dataSource: DataSource) {
    super(StatsEntity, dataSource.createEntityManager());
  }

  async increaseConnectedUsersCount() {
    const stats = await this.find();
    stats[0].connectedUsersCount++;
    await this.save(stats);
  }

  async decreaseConnectedUsersCount() {
    const stats = await this.find();
    stats[0].connectedUsersCount--;
    await this.save(stats);
  }
}
