import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';
import * as dotenv from 'dotenv';
import { BoxConfig } from './box_config/entity/box_config.entity';
import { Nft } from './nft/entity/nft.entity';
export const typeormConfig = (): TypeOrmModuleOptions => {
  dotenv.config();

  return {
    type: 'postgres',
    host: process.env.DB_HOST!,
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME!,
    username: process.env.DB_USERNAME!,
    password: process.env.DB_PASSWORD!,
    entities: [BoxConfig, Nft],
    //TODO:only in dev mode!
    dropSchema: true,
    synchronize: true,
  };
};
