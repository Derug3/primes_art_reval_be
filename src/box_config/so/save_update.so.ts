import { BadRequestException } from '@nestjs/common';
import { BoxConfig } from '../entity/box_config.entity';
import { BoxConfigRepository } from '../repository/box.config.repository';
import { BoxConfigInput } from '../types/box_config.types';

export class SaveOrUpdateBoxConfig {
  constructor(private readonly boxConfigRepo: BoxConfigRepository) {}

  async execute(boxConfigDto: BoxConfigInput) {
    try {
      const boxConfig = new BoxConfig();
      if (boxConfigDto.boxId) boxConfig.boxId = +boxConfigDto.boxId;
      boxConfig.bidIncrease = boxConfigDto.bidIncrease;
      boxConfig.boxPool = boxConfigDto.boxPool;
      boxConfig.userBidData = [];
      boxConfig.bidStartPrice = boxConfigDto.bidStartPrice;
      boxConfig.bidIncrease = boxConfigDto.bidIncrease;
      boxConfig.boxState = boxConfigDto.boxState;
      boxConfig.cooldownDuration = boxConfigDto.cooldownDuration;
      boxConfig.buyNowPrice = boxConfigDto.buyNowPrice;
      boxConfig.boxDuration = boxConfigDto.boxDuration;
      boxConfig.boxPause = boxConfigDto.boxPause;
      boxConfig.boxType = boxConfigDto.boxType;

      return await this.boxConfigRepo.saveOrUpdateBoxConfig(boxConfig);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
