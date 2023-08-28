import { Injectable } from '@nestjs/common';
import { DataSource, FindOperator, Raw, Repository } from 'typeorm';
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
    return this.createQueryBuilder('user').where(
      ':wallet = ANY(user.wallets)',
      { wallet },
    );
  }

  getAllUsers() {
    return this.find();
  }
}

export const Includes = <T extends string | number>(
  value: T,
): FindOperator<T> =>
  Raw((columnAlias) => `:value = ANY(${columnAlias})`, { value: [value] });
