import { Module } from '@nestjs/common';
import { RecoverBoxService } from './recover_box.service';
import { RecoverBoxResolver } from './recover_box.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecoverBox } from './entity/recover_box.entity';
import { RecoverBoxRepository } from './recover_box.repository';
import { SharedModule } from 'src/shared/shared.module';

@Module({
  imports: [TypeOrmModule.forFeature([RecoverBox]), SharedModule],
  providers: [RecoverBoxResolver, RecoverBoxService, RecoverBoxRepository],
  exports: [RecoverBoxService],
})
export class RecoverBoxModule {}
