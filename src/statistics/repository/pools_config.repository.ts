import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { PoolsConfig } from '../entity/pools_config.entity';

@Injectable()
export class PoolsConfigRepository extends Repository<PoolsConfig> {
  constructor(dataSource: DataSource) {
    super(PoolsConfig, dataSource.createEntityManager());
  }
}
