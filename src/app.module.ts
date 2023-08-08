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
import { SubscriberService } from './subscriber/subscriber.service';

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

    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      playground: true,
      autoSchemaFile: true,
      include: [BoxConfigModule, NftModule],
      subscriptions: {
        'graphql-ws': {
          onConnect: (ctx) => {
            SubscriberService.setConnected();
          },
          onDisconnect: (_) => {
            SubscriberService.setDisconnected();
          },
        },
        'subscriptions-transport-ws': true,
      },
    }),
    SubscriberModule,
    RedisModule,
    NftModule,
    RecoverBoxModule,
  ],

  providers: [AppService],
})
export class AppModule {}
