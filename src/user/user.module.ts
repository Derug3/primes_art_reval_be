import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserResolver } from './user.resolver';
import { UserRepository } from './repository/user.repository';
import { SubscriberModule } from 'src/subscriber/subscriber.module';

@Module({
  providers: [UserResolver, UserService, UserRepository],
  exports: [UserService],
  imports: [SubscriberModule],
})
export class UserModule {}
