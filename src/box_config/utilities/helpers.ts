import {} from '@metaplex-foundation/umi';
import {} from '@metaplex-foundation/mpl-token-metadata';
export const sleep = async (ms: number) => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};
