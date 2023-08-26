import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppService } from './app.service';
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
          playground: true,
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
  ],

  providers: [AppService],
})
export class AppModule {}
