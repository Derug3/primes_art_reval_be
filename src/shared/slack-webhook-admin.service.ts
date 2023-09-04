import { Injectable } from '@nestjs/common';
import { IncomingWebhook, IncomingWebhookSendArguments } from '@slack/webhook';
import * as process from 'process';

@Injectable()
export class SlackWebhookAdminService {
  async sendMessage(message: string | IncomingWebhookSendArguments) {
    if (
      !!process.env.WEBHOOK_ADMIN_URL &&
      process.env.WEBHOOK_ADMIN_URL !== ''
    ) {
      const slackWebhook = new IncomingWebhook(process.env.WEBHOOK_ADMIN_URL);
      await slackWebhook.send(message);
    }
  }

  static getEmojiRuntime() {
    switch (process.env.APP_RUNTIME) {
      case 'stage':
        return '💡';
      case 'prod':
      case 'production':
        return '✅';
      case 'local':
        return '🏗';
      default:
        return `❓ (${process.env.APP_RUNTIME ?? ''})`;
    }
  }
}
