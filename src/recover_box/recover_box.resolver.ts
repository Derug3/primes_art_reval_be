import { Resolver } from '@nestjs/graphql';
import { RecoverBoxService } from './recover_box.service';

@Resolver()
export class RecoverBoxResolver {
  constructor(private readonly recoverBoxService: RecoverBoxService) {}
}
