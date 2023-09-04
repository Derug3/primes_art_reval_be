import { Module } from '@nestjs/common';
import { SharedService } from './shared.service';
import { SlackWebhookAdminService } from './slack-webhook-admin.service';

@Module({
  providers: [SharedService, SlackWebhookAdminService],
  exports: [SharedService, SlackWebhookAdminService],
})
export class SharedModule {}
