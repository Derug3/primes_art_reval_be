import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { BoxConfig } from '../entity/box_config.entity';

@Injectable()
export class BoxConfigRepository extends Repository<BoxConfig> {
  constructor(dataSource: DataSource) {
    super(BoxConfig, dataSource.createEntityManager());
  }

  saveOrUpdateBoxConfig(boxConfig: BoxConfig) {
    return this.save(boxConfig);
  }

  getBuyId(boxId: string) {
    return this.findOne({ where: { boxId } });
  }

  getAllDbBoxes() {
    return this.find();
  }
}
