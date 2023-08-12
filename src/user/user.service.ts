import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { rolesEndpoint } from 'src/box_config/utilities/helpers';
import { DiscordRole, User } from './entity/user.entity';
import { UserRepository } from './repository/user.repository';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserRepository) private readonly userRepo: UserRepository,
  ) {}
  async storeUsers() {
    try {
      const users = await (await fetch(rolesEndpoint)).json();
      if (!users.data.success) {
        throw new BadRequestException(users.data.error);
      }
      const mappedUsers = this.mapUsers(users.data.result);
      await this.userRepo.storeUsers(mappedUsers);
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

  mapUsers(roles: any[]): User[] {
    return roles.map((r) => ({
      discordId: r.userDiscordId,
      discordUsername: r.userDiscordName,
      userRoles: this.mapRoles(r),
      userTwitterName: r.userTwitterName ?? null,
      wallets: r.userWallets ?? [],
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
}
