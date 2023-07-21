import {
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
import { BoxPool } from '../types/box_config.types';
import { BadRequestException } from '@nestjs/common';

dotenv.config();
export const sleep = async (ms: number) => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

export const programId = process.env.PROGRAM_ID!;

const authority = process.env.AUTHORITY!;

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
  new AnchorProvider(connection, new Wallet(getAuthorityAsSigner()), {}),
);

export const parseAndValidatePlaceBidTx = async (tx: any) => {
  try {
    const transaction = Transaction.from(tx.data);

    if (transaction.instructions.length > 1) {
      throw new Error('Invalid instructions amount!');
    }

    if (transaction.instructions[0].programId.toString() !== programId) {
      throw new Error('Invalid program id');
    }

    const authority = getAuthorityAsSigner();

    const _payer = transaction.instructions[0].keys[3].pubkey;

    transaction.sign(authority);

    await connection.sendRawTransaction(transaction.serialize());
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
      [
        primeBoxWinnerSeed,
        boxData.winnerAddress?.toBuffer() ?? boxData.bidder?.toBuffer(),
        Buffer.from(boxData.nftId),
      ],
      program.programId,
    );

    const ix = await program.methods
      .resolveBox()
      .accounts({
        boxData: boxAddress,
        winningProof,
        boxTreasury,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    const tx = new Transaction({
      feePayer: authority.publicKey,
      recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
    });

    tx.add(ix);
    tx.sign(authority);
    await connection.sendRawTransaction(tx.serialize());
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
      .initBox(boxId.split('-')[0], {
        bidIncrease: new BN(box.bidIncrease * LAMPORTS_PER_SOL),
        bidStartPrice: new BN(box.bidStartPrice),
        buyNowPrice: new BN(box.buyNowPrice * LAMPORTS_PER_SOL),
        nftId: nft.nftId.split('-')[0],
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

    console.log(txSig);

    await connection.confirmTransaction(txSig);
    return true;
  } catch (error) {
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

    await connection.sendRawTransaction(
      transaction.serialize({ requireAllSignatures: false }),
    );
    return true;
  } catch (error) {
    console.log(error, 'ERRRROOORR');

    throw new BadRequestException(error.message);
  }
};

export const parseTransactionError = (data: any) => {
  const parsedData = JSON.parse(JSON.stringify(data));

  if (
    parsedData.logs.find(
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
    const err = program.idl.errors.find((err) => err.code === slicedData)?.msg;

    return err;
  }
};
