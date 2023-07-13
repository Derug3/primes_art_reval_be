import { Resolver, Query } from '@nestjs/graphql';
import { BoxConfigService } from './box_config.service';

@Resolver()
export class BoxConfigResolver {
  constructor(private readonly boxConfigService: BoxConfigService) {}

  @Query(() => String)
  query() {
    return 'ThePrimes';
  }
}
