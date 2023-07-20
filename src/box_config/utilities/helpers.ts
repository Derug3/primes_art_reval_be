import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import { AnchorProvider, Program, Wallet } from '@project-serum/anchor';
import { IDL, ArtReveal } from './idl';
export const primeBoxSeed = Buffer.from('prime-box');
export const primeBoxTreasurySeed = Buffer.from('prime-box-treasury');
export const primeBoxWinnerSeed = Buffer.from('prime-box-winner');
import * as dotenv from 'dotenv';
import { decode } from 'bs58';

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
    const transaction = Transaction.from(tx);

    if (transaction.instructions.length > 1) {
      throw new Error('Invalid instructions amount!');
    }

    if (transaction.instructions[0].programId.toString() !== programId) {
      throw new Error('Invalid program id');
    }

    //TODO:comment in later
    // const serializedDiscriminator = Buffer.from(
    //   bs58.encode(Buffer.from('global:place_bid')),
    // );

    // if (
    //   transaction.instructions[0].data.subarray(0, 8) !==
    //   serializedDiscriminator
    // ) {
    //   throw new Error('Invalid instruction!');
    // }

    const authority = getAuthorityAsSigner();

    //TODO:get payer from tx and check his user role
    const _payer = transaction.instructions[0].keys[3].pubkey;

    transaction.sign(authority);

    await connection.sendRawTransaction(transaction.serialize());
  } catch (error) {
    throw error;
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
        boxData.winnerAddress?.toBuffer() ?? boxData.bidder.toBuffer(),
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
