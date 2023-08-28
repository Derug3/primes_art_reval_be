import { Injectable } from '@nestjs/common';
import { DataSource, ILike, Repository } from 'typeorm';
import { User } from '../entity/user.entity';

@Injectable()
export class UserRepository extends Repository<User> {
  constructor(dataSource: DataSource) {
    super(User, dataSource.createEntityManager());
  }

  storeUsers(user: User[]) {
    return this.save(user);
  }

  getUserByWallet(wallet: string) {
    return this.findOne({
      where: {
        wallets: ILike(`%${wallet}%`),
      },
    });
  }
}
