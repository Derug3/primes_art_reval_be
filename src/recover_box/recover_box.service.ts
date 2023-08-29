import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { recoverBox } from 'src/box_config/utilities/helpers';
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

  @Cron('* * * * *')
  async recoverFailedBoxes() {
    this.logger.log(`Executing failed boxes cron.`);
    try {
      const failedBoxes = await this.recoverBoxRepo.find();
      this.logger.log(`Got ${failedBoxes.length} failed boxes from DB`);

      if (!failedBoxes || failedBoxes.length === 0) return;
      for (const fb of failedBoxes) {
        const connection = this.sharedService.getRpcConnection();
        const hasRecovered = await recoverBox(fb, connection);
        if (hasRecovered) await this.recoverBoxRepo.delete({ id: fb.id });
      }
    } catch (error) {
      this.logger.error(error.message);
    }
  }
}
