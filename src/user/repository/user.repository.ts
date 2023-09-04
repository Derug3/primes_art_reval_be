import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, ILike, Repository } from 'typeorm';
import { User } from '../entity/user.entity';

@Injectable()
export class UserRepository extends Repository<User> {
  constructor(dataSource: DataSource) {
    super(User, dataSource.createEntityManager());
  }

  storeUsers(users: User[]) {
    return this.manager.transaction(async (entityManager: EntityManager) => {
      await entityManager.query('TRUNCATE TABLE "user";');
      return entityManager.save(users, { chunk: 100 });
    });
  }

  getUserByWallet(wallet: string) {
    return this.findOne({
      where: {
        wallets: ILike(`%${wallet}%`),
      },
    });
  }
}
