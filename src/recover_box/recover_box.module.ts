import { Module } from '@nestjs/common';
import { RecoverBoxService } from './recover_box.service';
import { RecoverBoxResolver } from './recover_box.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecoverBox } from './entity/recover_box.entity';
import { RecoverBoxRepository } from './recover_box.repository';

@Module({
  imports: [TypeOrmModule.forFeature([RecoverBox])],
  providers: [RecoverBoxResolver, RecoverBoxService, RecoverBoxRepository],
})
export class RecoverBoxModule {}
