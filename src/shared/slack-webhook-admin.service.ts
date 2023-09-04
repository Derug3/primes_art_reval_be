import { Injectable } from '@nestjs/common';
import { IncomingWebhook, IncomingWebhookSendArguments } from '@slack/webhook';

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
}
