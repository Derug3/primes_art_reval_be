import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SharedService } from 'src/shared/shared.service';
import { RecoverBox } from './entity/recover_box.entity';
import { RecoverBoxRepository } from './recover_box.repository';

@Injectable()
export class RecoverBoxService {
  logger = new Logger(RecoverBoxService.name);
  constructor(
    @InjectRepository(RecoverBoxRepository)
    private readonly recoverBoxRepo: RecoverBoxRepository,
    private readonly sharedService: SharedService,
  ) {}

  async saveFailedBox(box: RecoverBox) {
    await this.recoverBoxRepo.saveBoxRecoveryData(box);
    this.logger.log(`Saved failed box with box_data: ${box.boxData}`);
  }

  async deleteRecoveredBox(boxId: string) {
    await this.recoverBoxRepo.deleteRecoveredBox(boxId);

    this.logger.log(`Deleted boxRecover data with id: ${boxId}`);
  }
}
