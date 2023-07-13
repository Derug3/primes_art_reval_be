import { Module } from '@nestjs/common';
import { BoxConfigService } from './box_config.service';
import { BoxConfigResolver } from './box_config.resolver';

@Module({
  providers: [BoxConfigResolver, BoxConfigService]
})
export class BoxConfigModule {}
