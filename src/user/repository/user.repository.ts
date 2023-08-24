import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
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
    const qb = this.createQueryBuilder('user').where(
      'user.wallets IN (:...wallet)',
      {
        wallet: [wallet],
      },
    );

    return qb.getOne();
  }

  getAllUsers() {
    return this.find();
  }
}
