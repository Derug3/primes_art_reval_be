import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';
import * as dotenv from 'dotenv';
export const typeormConfig = (): TypeOrmModuleOptions => {
  dotenv.config();

  return {
    type: 'postgres',
    host: process.env.DB_HOST!,
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME!,
    username: process.env.DB_USERNAME!,
    password: process.env.DB_PASSWORD!,
    entities: [join(__dirname, 'src/**/*.entity{.js,.ts}')],
    //TODO:only in dev mode!
    dropSchema: true,
    synchronize: true,
  };
};
