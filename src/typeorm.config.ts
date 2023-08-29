import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';
import * as dotenv from 'dotenv';
import { BoxConfig } from './box_config/entity/box_config.entity';
import { Nft } from './nft/entity/nft.entity';
import { RecoverBox } from './recover_box/entity/recover_box.entity';
import { User } from './user/entity/user.entity';
import { StatsEntity } from './statistics/entity/stats.entity';
import { PoolsConfig } from './statistics/entity/pools_config.entity';
export const typeormConfig = (): TypeOrmModuleOptions => {
  dotenv.config();

  return {
    type: 'postgres',
    host: process.env.DB_HOST!,
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME!,
    username: process.env.DB_USERNAME!,
    password: process.env.DB_PASSWORD!,
    entities: [BoxConfig, Nft, RecoverBox, User, StatsEntity, PoolsConfig],
    synchronize: true,
  };
};
