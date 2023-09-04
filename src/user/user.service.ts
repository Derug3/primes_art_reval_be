import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  checkIfMessageIsSigned,
  rolesEndpoint,
} from 'src/box_config/utilities/helpers';
import { DiscordRole, User } from './entity/user.entity';
import { UserRepository } from './repository/user.repository';
import { SlackWebhookAdminService } from '../shared/slack-webhook-admin.service';
import { IncomingWebhookSendArguments } from '@slack/webhook';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(UserRepository) private readonly userRepo: UserRepository,
    private readonly slackAdminWebhook: SlackWebhookAdminService,
  ) {}

  async storeUsers(signedMessage: string, authority: string) {
    try {
      const isVerified = checkIfMessageIsSigned(
        signedMessage,
        'Update Primes Mint',
        authority,
      );
      if (!isVerified) throw new UnauthorizedException();
      const users = await (await fetch(rolesEndpoint)).json();
      const existingUsers = await this.userRepo.find();
      if (existingUsers && existingUsers.length > 0)
        await this.userRepo.remove(existingUsers);
      if (!users.data.success) {
        throw new BadRequestException(users.data.error);
      }
      const mappedUsers = this.mapUsers(users.data.result);
      await this.userRepo.storeUsers(mappedUsers);

      this.emitAdminWebhookStoreUsers(mappedUsers, authority);

      return true;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  getUserByWallet(wallet: string) {
    try {
      return this.userRepo.getUserByWallet(wallet);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  getAllUsers() {
    try {
      return this.userRepo.find();
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  mapUsers(roles: any[]): User[] {
    return roles.map((r) => ({
      id: r.id.toString(),
      discordUsername: r.userDiscordName,
      userRoles: this.mapRoles(r),
      userTwitterName: r.userTwitterName ?? null,
      wallets: r.userWallets ?? [],
      discordId: r.userDiscordId,
    }));
  }

  mapRoles(r: any): DiscordRole[] {
    if (!r.userDiscordRoles) {
      return [];
    } else {
      return r.userDiscordRoles.map((r) => {
        const roleData = r.split('@');
        return {
          roleId: roleData[0],
          roleName: roleData[1],
        };
      });
    }
  }

  private emitAdminWebhookStoreUsers(users: User[], authority: string) {
    this.slackAdminWebhook
      .sendMessage({
        blocks: [
          {
            type: 'header',
            text: {
              text: SlackWebhookAdminService.getEmojiRuntime() + ' Store Users',
              type: 'plain_text',
              emoji: true,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Users count*\n${users.length}`,
              },
            ],
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Authority*\n<https://solscan.io/account/${authority}|${authority}>`,
              },
              {
                type: 'mrkdwn',
                text: `*Program*\n<https://solscan.io/account/${
                  process.env.PROGRAM_ID as string
                }|${process.env.PROGRAM_ID as string}>`,
              },
            ],
          },
        ],
      } as IncomingWebhookSendArguments)
      .then(() => {
        this.logger.debug('Sent webhook admin event "Store Users"');
      })
      .catch((e) => {
        this.logger.error(
          'Error send webhook admin event "Store Users"',
          e.stack,
        );
      });
  }
}
