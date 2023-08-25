import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import { AnchorProvider, BN, Program, Wallet } from '@project-serum/anchor';
import { IDL, ArtReveal } from './idl';
export const primeBoxSeed = Buffer.from('prime-box');
export const primeBoxTreasurySeed = Buffer.from('prime-box-treasury');
export const primeBoxWinnerSeed = Buffer.from('prime-box-winner');
import * as dotenv from 'dotenv';
import { decode } from 'bs58';
import { BoxConfig } from '../entity/box_config.entity';
import { Nft } from 'src/nft/entity/nft.entity';
import { BoxType } from 'src/enum/enums';
import { Bidders, BoxPool, BoxTimigState } from '../types/box_config.types';
import { BadRequestException } from '@nestjs/common';
import { User } from 'src/user/entity/user.entity';
import { roles } from './rolesData';

dotenv.config();
export const sleep = async (ms: number): Promise<NodeJS.Timeout> => {
  return new Promise((resolve) => {
    return setTimeout(resolve, ms);
  });
};

export const programId = process.env.PROGRAM_ID!;

const authority = process.env.AUTHORITY!;

export const rolesEndpoint = process.env.ROLES_API_ENDPOINT!;

const webhookUrl = process.env.WEBHOOK_URL!;

const treasury = process.env.TREASURY!;

export const getAuthorityAsSigner = () => {
  const decodedAuthority = Keypair.fromSecretKey(decode(authority));

  return decodedAuthority;
};
export const connection = new Connection(process.env.SOLANA_RPC_ENDPOINT!, {
  commitment: 'confirmed',
});
export const program = new Program<ArtReveal>(
  IDL,
  programId,
  new AnchorProvider(
    new Connection(process.env.SOLANA_RPC_ENDPOINT, {
      commitment: 'processed',
    }),
    new Wallet(getAuthorityAsSigner()),
    {
      commitment: 'processed',
    },
  ),
);

export const parseAndValidatePlaceBidTx = async (
  tx: any,
  bidders: Bidders[],
  hasResolved: boolean,
  user: User | null,
  boxTimingState: BoxTimigState,
): Promise<string | null> => {
  try {
    const transaction = Transaction.from(tx.data);
    let existingBidProofAuthority: string | null = null;

    const instructionsWithoutCb = transaction.instructions.filter(
      (ix) =>
        ix.programId.toString() !== ComputeBudgetProgram.programId.toString(),
    );
    const bidder = instructionsWithoutCb[0].keys[1].pubkey.toString();

    if (instructionsWithoutCb[0].programId.toString() !== programId) {
      throw new Error('Invalid program id');
    }

    if (instructionsWithoutCb[0].keys[5]) {
      existingBidProofAuthority =
        instructionsWithoutCb[0].keys[5].pubkey.toString();
    }

    const authority = getAuthorityAsSigner();

    transaction.partialSign(authority);

    const txSig = await connection.sendRawTransaction(
      transaction.serialize({ requireAllSignatures: false }),
    );
    await connection.confirmTransaction(txSig);
    if (instructionsWithoutCb.length > 1) {
      hasResolved = true;
    }
    const box = await program.account.boxData.fetch(
      instructionsWithoutCb[0].keys[0].pubkey,
    );
    bidders.push({
      bidAmount: box.activeBid.toNumber() / LAMPORTS_PER_SOL,
      walletAddress: bidder.toString(),
      username: user?.discordUsername ?? bidder.slice(0, 6) + '...',
    });
    try {
      const bidAmount = instructionsWithoutCb[0].data
        .subarray(9, 17)
        .readBigUInt64LE();
      emitToWebhook({
        message: 'Placed bid',
        bidder: user.discordUsername ?? bidder.toString(),
        nftUri: box.nftUri,
        nftId: box.nftId,
        bidders,
        boxState: boxTimingState.state,
        secondsRemaining: boxTimingState.endsAt - boxTimingState.startedAt,
        bidAmount: Number(bidAmount) / LAMPORTS_PER_SOL,
      });
    } catch (error) {}
    return existingBidProofAuthority;
  } catch (error) {
    console.log(error);

    throw new BadRequestException(parseTransactionError(error));
  }
};

export const resolveBoxIx = async (boxAddress: PublicKey) => {
  const [boxTreasury] = PublicKey.findProgramAddressSync(
    [primeBoxTreasurySeed, boxAddress.toBuffer()],
    program.programId,
  );

  try {
    const authority = getAuthorityAsSigner();

    const boxData = await program.account.boxData.fetch(boxAddress);

    const [winningProof] = PublicKey.findProgramAddressSync(
      [primeBoxWinnerSeed, Buffer.from(boxData.nftId)],
      program.programId,
    );
    const ix = await program.methods
      .resolveBox()
      .accounts({
        boxData: boxAddress,
        winningProof,
        boxTreasury,
        treasury: new PublicKey(treasury),
        payer: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    const tx = new Transaction({
      feePayer: authority.publicKey,
      recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
    });

    tx.add(ix);
    tx.sign(authority);
    const txSig = await connection.sendRawTransaction(tx.serialize());
    await connection.confirmTransaction(txSig);

    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};

export const parseBoxPool = (boxPool: BoxPool) => {
  switch (boxPool) {
    case BoxPool.OG: {
      return { og: {} };
    }
    case BoxPool.PreSale: {
      return { presale: {} };
    }
    case BoxPool.PrimeList: {
      return { primelist: {} };
    }
    case BoxPool.Public: {
      return { public: {} };
    }
  }
};

export const parseBoxType = (boxType: BoxType) => {
  switch (boxType) {
    case BoxType.Bid: {
      return { bid: {} };
    }
    case BoxType.BidBuyNow: {
      return { bidbuy: {} };
    }
    case BoxType.BuyNow: {
      return { buy: {} };
    }
  }
};

export const initBoxIx = async (
  boxAddress: PublicKey,
  boxId: string,
  box: BoxConfig,
  nft: Nft,
) => {
  try {
    const authority = getAuthorityAsSigner();

    const ix = await program.methods
      .initBox(boxId.toString(), {
        bidIncrease: new BN(box.bidIncrease * LAMPORTS_PER_SOL),
        bidStartPrice: new BN(box.bidStartPrice * LAMPORTS_PER_SOL),
        buyNowPrice: box.buyNowPrice
          ? new BN(box.buyNowPrice * LAMPORTS_PER_SOL)
          : null,
        nftId: nft.nftId,
        nftUri: nft.nftUri,
        boxPool: parseBoxPool(box.boxPool),
        boxType: parseBoxType(box.boxType),
      })
      .accounts({
        boxData: boxAddress,
        payer: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    const tx = new Transaction({
      feePayer: authority.publicKey,
      recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
    });

    tx.add(ix);

    tx.sign(authority);

    const txSig = await connection.sendRawTransaction(tx.serialize());

    await connection.confirmTransaction(txSig);
    return true;
  } catch (error) {
    console.log(error);

    return false;
  }
};

export const claimNft = async (tx: any) => {
  try {
    const transaction = Transaction.from(JSON.parse(tx).data);

    if (transaction.instructions[1].programId.toString() !== programId) {
      throw new Error('Invalid program id');
    }

    const signer = getAuthorityAsSigner();

    transaction.partialSign(signer);

    const txSig = await connection.sendRawTransaction(transaction.serialize());
    await connection.confirmTransaction(txSig);
    const nonComputeBudgetIxs = transaction.instructions.filter(
      (ix) => !ix.programId.equals(ComputeBudgetProgram.programId),
    )[0];
    console.log(nonComputeBudgetIxs);

    emitToWebhook({
      message: 'Nft claimed',
      nftMint: nonComputeBudgetIxs.keys[2].pubkey,
      winner: nonComputeBudgetIxs.keys[0].pubkey,
    });
    return true;
  } catch (error) {
    console.log(error);

    throw new BadRequestException(error.message);
  }
};

export const parseTransactionError = (data: any) => {
  const parsedData = JSON.parse(JSON.stringify(data));

  if (
    parsedData.logs?.find(
      (log: any) => log.includes('lamports') || log.includes('NotEnoughSOL'),
    )
  ) {
    return 'Insufficient balance for transaction';
  }

  const log = parsedData.logs.find((log: string) =>
    log.includes('AnchorError'),
  );

  if (log) {
    const slicedData = +log.split('Error Number:')[1].split('.')[0].trim();
    const err = program.idl.errors?.find((err) => err.code === slicedData)?.msg;

    return err;
  }
};

export const checkUserRole = (user: User) => {
  const permittedPools =
    user?.userRoles.map(
      (userRole) => roles.find((r) => r.roleId === userRole.roleId)?.boxPool,
    ) ?? [];
  if (permittedPools.length === 0) {
    return BoxPool.Public;
  }
  return Math.min(...permittedPools);
};

export const fromBoxPoolString = (box: string) => {
  switch (box) {
    case 'Public': {
      return BoxPool.Public;
    }
    case 'OG': {
      return BoxPool.OG;
    }
    case 'PreSale': {
      return BoxPool.PreSale;
    }
    case 'PrimeList': {
      return BoxPool.PrimeList;
    }
    default: {
      return null;
    }
  }
};

export const getProofPda = (nft: Nft) => {
  const [proofPda] = PublicKey.findProgramAddressSync(
    [primeBoxWinnerSeed, Buffer.from(nft.nftId)],
    program.programId,
  );

  return proofPda;
};

export const emitToWebhook = (data: any) => {
  try {
    fetch(webhookUrl, { method: 'POST', body: JSON.stringify(data) });
  } catch (error) {
    console.log('Webhook emit error:', error.message);
  }
};
