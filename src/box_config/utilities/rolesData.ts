import { BoxPool } from '../types/box_config.types';

export interface UserDiscordRole {
  roleId: string;
  boxPool: BoxPool;
}

export const roles: UserDiscordRole[] = [
  {
    boxPool: BoxPool.PreSale,
    roleId: '1125850903535157260',
  },
  {
    boxPool: BoxPool.PrimeList,
    roleId: '1126839979147010168',
  },
  {
    boxPool: BoxPool.PreSale,
    roleId: '1105088854500843521',
  },
  {
    boxPool: BoxPool.OG,
    roleId: '1085502139796815983',
  },
];
