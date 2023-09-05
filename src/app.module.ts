import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BoxConfigModule } from './box_config/box_config.module';
import { typeormConfig } from './typeorm.config';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { GraphQLModule } from '@nestjs/graphql';
import { SubscriberModule } from './subscriber/subscriber.module';
import { RedisModule } from '@liaoliaots/nestjs-redis';
import { NftModule } from './nft/nft.module';
import { RecoverBoxModule } from './recover_box/recover_box.module';
import { UserModule } from './user/user.module';
import { SubscriberService } from './subscriber/subscriber.service';
import { StatisticsModule } from './statistics/statistics.module';
import { SharedModule } from './shared/shared.module';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import Transport from 'winston-transport';
import 'winston-daily-rotate-file';

@Module({
  imports: [
    BoxConfigModule,
    TypeOrmModule.forRoot(typeormConfig()),
    RedisModule.forRoot({
      config: {
        host: process.env.REDIS_HOST!,
        username: process.env.REDIS_USER!,
        password: process.env.REDIS_PASSWORD!,
        port: parseInt(process.env.REDIS_PORT) || 6379,
      },
    }),
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [SubscriberModule],
      inject: [SubscriberService],
      useFactory: (subscriberService: SubscriberService) => {
        return {
          playground: false,
          autoSchemaFile: true,
          include: [BoxConfigModule, NftModule, UserModule, StatisticsModule],
          subscriptions: {
            'graphql-ws': {
              onConnect: () => {
                console.log('Connected');
                subscriberService.setConnected();
              },
              onDisconnect: () => {
                subscriberService.setDisconnected();
              },
            },
            'subscriptions-transport-ws': true,
          },
        };
      },
    }),
    SubscriberModule,
    RedisModule,
    NftModule,
    RecoverBoxModule,
    UserModule,
    StatisticsModule,
    SharedModule,
    WinstonModule.forRootAsync({
      useFactory: () => {
        const transports: Transport[] = [
          new winston.transports.DailyRotateFile({
            filename: `var/log/%DATE%.error.log`,
            datePattern: 'YYYY-MM-DD-HH',
            zippedArchive: true,
            maxSize: '300m',
            maxFiles: 30,
            level: 'error',
          }),
          new winston.transports.Console({
            format: winston.format.simple(),
          }),
        ];

        const options: winston.LoggerOptions = {
          level: 'debug',
          exitOnError: false,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.prettyPrint(),
          ),
          transports: transports,
          exceptionHandlers: [
            new winston.transports.DailyRotateFile({
              filename: 'var/log/%DATE%.exception.log',
              datePattern: 'YYYY-MM-DD-HH',
              zippedArchive: true,
              maxSize: '200m',
              maxFiles: '30d',
            }),
          ],
        };

        return options;
      },
    }),
  ],

  providers: [],
})
export class AppModule {}
