import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { RecoverBox } from './entity/recover_box.entity';

@Injectable()
export class RecoverBoxRepository extends Repository<RecoverBox> {
  constructor(dataSoruce: DataSource) {
    super(RecoverBox, dataSoruce.createEntityManager());
  }

  saveBoxRecoveryData(recoverBox: RecoverBox) {
    return this.save(recoverBox);
  }

  deleteRecoveredBox(boxId: string) {
    return this.delete({ id: boxId });
  }
}
