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
import { UserModule } from './user/user.module';

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
      include: [BoxConfigModule, NftModule, UserModule],
      subscriptions: {
        'graphql-ws': {
          onConnect: (ctx) => {
            new SubscriberService().pubSub.publish('userConnected', {});
          },
          onDisconnect: (ctx) => {
            new SubscriberService().pubSub.publish('userDisconnected', {});
          },
        },
        'subscriptions-transport-ws': true,
      },
    }),
    SubscriberModule,
    RedisModule,
    NftModule,
    RecoverBoxModule,
    UserModule,
  ],

  providers: [AppService],
})
export class AppModule {}
