import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserResolver } from './user.resolver';
import { UserRepository } from './repository/user.repository';
import { SubscriberModule } from 'src/subscriber/subscriber.module';
import { SlackWebhookAdminService } from '../shared/slack-webhook-admin.service';

@Module({
  providers: [
    UserResolver,
    UserService,
    UserRepository,
    SlackWebhookAdminService,
  ],
  exports: [UserService],
  imports: [SubscriberModule],
})
export class UserModule {}
