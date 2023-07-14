import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Nft } from '../entity/nft.entity';

@Injectable()
export class NftRepository extends Repository<Nft> {
  constructor(dataSource: DataSource) {
    super(Nft, dataSource.createEntityManager());
  }
}
