import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import * as bs58 from 'bs58';
import { AnchorProvider, BN, Program, Wallet } from '@project-serum/anchor';
import { IDL, ArtReveal } from './idl';
import * as nacl from 'tweetnacl';
export const primeBoxSeed = Buffer.from('prime-box');
export const primeBoxTreasurySeed = Buffer.from('prime-box-treasury');
export const primeBoxWinnerSeed = Buffer.from('prime-box-winner');
import * as dotenv from 'dotenv';
import { decode } from 'bs58';
import { Metaplex } from '@metaplex-foundation/js';
import { ActionType, BoxConfig } from '../entity/box_config.entity';
import { Nft } from 'src/nft/entity/nft.entity';
import { BoxType } from 'src/enum/enums';
import { Bidder, BoxPool, BoxTimigState } from '../types/box_config.types';
import { BadRequestException, Logger, Version } from '@nestjs/common';
import { User } from 'src/user/entity/user.entity';
import { roles } from './rolesData';
import { TOKEN_PROGRAM_ID } from '@project-serum/anchor/dist/cjs/utils/token';
import { RecoverBox } from 'src/recover_box/entity/recover_box.entity';
import { writeFileSync } from 'fs';
import { chunk } from 'lodash';

dotenv.config();
export const sleep = async (ms: number): Promise<NodeJS.Timeout> => {
  return new Promise((resolve) => {
    return setTimeout(resolve, ms);
  });
};

export const programId = process.env.PROGRAM_ID!;

const mintPassCollection = process.env.MINT_PASS_COLLECTION!;

const authority = process.env.AUTHORITY!;

const webHookErrorUrl = process.env.WEBHOOK_ERROR_URL!;

export const rolesEndpoint = process.env.ROLES_API_ENDPOINT!;

const platformAuths = JSON.parse(process.env.PLATFORM_AUTHORITIES!);

const webhookUrl = process.env.WEBHOOK_URL!;

const treasury = process.env.TREASURY!;

export const getAuthorityAsSigner = () => {
  const decodedAuthority = Keypair.fromSecretKey(decode(authority));

  return decodedAuthority;
};
export const RPC_CONNECTIONS: string[] = JSON.parse(process.env.RPC_ENDPOINTS!);

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
  bidders: Bidder[],
  hasResolved: boolean,
  user: User | null,
  boxTimingState: BoxTimigState,
  connection: Connection,
  nft: Nft,
  logger: Logger,
) => {
  let txSig;
  try {
    const decodedTx = bs58.decode(tx);

    let transaction = VersionedTransaction.deserialize(decodedTx);
    let existingBidProofAuthority: string | null = null;
    const computeBudgetIndex = transaction.message.staticAccountKeys.findIndex(
      (acc) => acc.equals(ComputeBudgetProgram.programId),
    );
    const programIdIndex = transaction.message.staticAccountKeys.findIndex(
      (acc) => acc.equals(program.programId),
    );
    const instructionsWithoutCb =
      transaction.message.compiledInstructions.filter(
        (ix) => ix.programIdIndex !== computeBudgetIndex,
      );

    const bidder = transaction.message.staticAccountKeys
      .find(
        (key, index) => index === instructionsWithoutCb[0].accountKeyIndexes[1],
      )
      .toString();
    if (instructionsWithoutCb[0].programIdIndex !== programIdIndex) {
      throw new Error('Invalid program id');
    }
    if (instructionsWithoutCb[0].accountKeyIndexes[5]) {
      existingBidProofAuthority = transaction.message.staticAccountKeys
        .find(
          (acc, index) =>
            index === instructionsWithoutCb[0].accountKeyIndexes[5],
        )
        .toString();
    }

    const authority = getAuthorityAsSigner();

    transaction.sign([authority]);

    txSig = await connection.sendRawTransaction(transaction.serialize());

    await confirmTransaction(txSig, connection);
    if (instructionsWithoutCb.length > 1) {
      hasResolved = true;
    }

    const box = await program.account.boxData.fetch(
      transaction.message.staticAccountKeys.find(
        (_, index) => index === instructionsWithoutCb[0].accountKeyIndexes[0],
      ),
    );
    let bidAmount = 0;
    const username =
      user?.discordUsername ?? `${bidder.slice(0, 4)}...${bidder.slice(-4)}`;
    bidders.push({
      bidAmount: box.activeBid.toNumber() / LAMPORTS_PER_SOL,
      walletAddress: bidder.toString(),
      username,
      bidAt: new Date(),
      nftId: nft.nftId,
      nftUri: nft.nftImage,
    });
    try {
      bidAmount = Number(
        Buffer.from(
          instructionsWithoutCb[0].data.subarray(9, 17),
        ).readBigUInt64LE(),
      );

      if (
        instructionsWithoutCb[0].data[8] === 0 ||
        instructionsWithoutCb[0].data[8] === 2
      ) {
        emitToWebhook({
          message: 'Placed bid',
          bidder: user?.discordUsername ?? bidder.toString(),
          userId: user?.id ?? '',
          userDiscordId: user?.discordId ?? '',
          bidders,
          boxState: boxTimingState.state,
          secondsRemaining: boxTimingState.endsAt - boxTimingState.startedAt,
          bidAmount: bidAmount / LAMPORTS_PER_SOL,
          nft: {
            nftId: nft.nftId,
            nftImgUrl: nft.nftImage,
            uri: nft.nftUri,
            name: nft.nftName,
          },
        });
      } else {
        emitToWebhook({
          message: 'Minted',
          bidder: user?.discordUsername ?? bidder.toString(),
          userId: user?.id ?? '',
          userDiscordId: user?.discordId ?? '',
          nft: {
            nftId: nft.nftId,
            nftImgUrl: nft.nftImage,
            uri: nft.nftUri,
            name: nft.nftName,
          },
          bidders,
          boxState: boxTimingState.state,
          secondsRemaining: boxTimingState.endsAt - boxTimingState.startedAt,
          mintAmount: bidAmount / LAMPORTS_PER_SOL,
        });
      }
    } catch (error) {
      console.error(error);
      logger.error('Error place bid: ' + error.message, {
        stack: error.stack,
        rpcUrl: connection.rpcEndpoint,
        tx: tx.data,
      });
    }
    return {
      existingAuth: existingBidProofAuthority,
      bidder: bidder.toString(),
      bidAmount: Number(bidAmount) / LAMPORTS_PER_SOL,
      username,
    };
  } catch (error) {
    console.error(error);
    logger.error('Error place bid: ' + error.message, {
      stack: error.stack,
      rpcUrl: connection.rpcEndpoint,
      tx: tx.data,
      txSig,
    });

    emitToWebhook({
      txSig,
      eventName: 'rpc-error',
      rpcUrl: connection.rpcEndpoint,
      rpcResponse: error.message,
      event: 'PlaceBid',
    });
    throw new BadRequestException(error.message);
  }
};

export const resolveBoxIx = async (
  boxAddress: PublicKey,
  connection: Connection,
  nft: Nft,
) => {
  const [boxTreasury] = PublicKey.findProgramAddressSync(
    [primeBoxTreasurySeed, boxAddress.toBuffer()],
    program.programId,
  );
  let txSig;
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
    const txMess = new TransactionMessage({
      instructions: [ix],
      payerKey: authority.publicKey,
      recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
    }).compileToV0Message();
    const versionedTx = new VersionedTransaction(txMess);

    versionedTx.sign([authority]);
    txSig = await connection.sendRawTransaction(versionedTx.serialize());
    await confirmTransaction(txSig, connection);
    emitToWebhook({
      bothEvents: 'Auction Won',
      winner: boxData.winnerAddress?.toString() ?? boxData.bidder?.toString(),
      winningPrice: boxData.activeBid.toNumber(),
      nft: {
        nftId: nft.nftId,
        nftImgUrl: nft.nftImage,
        uri: nft.nftUri,
        name: nft.nftName,
      },
    });
    return true;
  } catch (error) {
    console.log(error);
    emitToWebhook({
      txSig,
      eventName: 'rpc-error',
      rpcUrl: connection.rpcEndpoint,
      rpcResponse: error.message,
      event: 'ResolveBox',
    });
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
  boxId: number,
  box: BoxConfig,
  nft: Nft,
  connection: Connection,
  counter: number,
  logger: Logger,
) => {
  let versionedTx: VersionedTransaction;
  try {
    const authority = getAuthorityAsSigner();

    const ix = await program.methods
      .initBox(boxId.toString(), {
        bidIncrease: new BN(box.bidIncrease * LAMPORTS_PER_SOL),
        bidStartPrice: box.bidStartPrice
          ? new BN(box.bidStartPrice * LAMPORTS_PER_SOL)
          : null,
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
    const txMessage = new TransactionMessage({
      instructions: [ix],
      payerKey: authority.publicKey,
      recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
    }).compileToV0Message();

    versionedTx = new VersionedTransaction(txMessage);
    versionedTx.sign([authority]);

    const txSig = await connection.sendRawTransaction(versionedTx.serialize());
    await confirmTransaction(txSig, connection);
    return true;
  } catch (error: any) {
    console.error(`Error init box #${boxId}`, error);

    logger.error(`Error init box #${boxId}: ${error.message}`, {
      stack: error.stack,
      rpcUrl: connection.rpcEndpoint,
      boxId: box.boxId,
      boxAddress: boxAddress.toString(),
      boxConfig: box,
      counter,
      versionedTx,
    });

    emitToWebhook({
      boxId: box.boxId,
      eventName: 'rpc-error',
      rpcUrl: connection.rpcEndpoint,
      rpcResponse: error.message,
      event: 'InitBox',
      counter,
    });

    return false;
  }
};

export const claimNft = async (tx: any, connection: Connection) => {
  let txSig;
  try {
    const transaction = Transaction.from(JSON.parse(tx).data);

    if (transaction.instructions[1].programId.toString() !== programId) {
      throw new Error('Invalid program id');
    }

    const signer = getAuthorityAsSigner();

    transaction.partialSign(signer);

    txSig = await connection.sendRawTransaction(transaction.serialize());
    await confirmTransaction(txSig, connection);
    const nonComputeBudgetIxs = transaction.instructions.filter(
      (ix) => !ix.programId.equals(ComputeBudgetProgram.programId),
    )[0];

    emitToWebhook({
      message: 'Nft claimed',
      nftMint: nonComputeBudgetIxs.keys[2].pubkey,
      winner: nonComputeBudgetIxs.keys[0].pubkey,
    });
    return true;
  } catch (error) {
    emitToWebhook({
      txSig,
      eventName: 'rpc-error',
      rpcUrl: connection.rpcEndpoint,
      rpcResponse: error.message,
      event: 'ClaimNft',
    });

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
  if (!user) return BoxPool.Public;
  const permittedPools =
    user?.userRoles.map(
      (userRole) => roles?.find((r) => r.roleId === userRole.roleId)?.boxPool,
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
  console.log(`Emitting to webhook data`);
  data.runtime = process.env.APP_RUNTIME ?? '';
  fetch(data.eventName ? webHookErrorUrl : webhookUrl, {
    method: 'POST',
    body: JSON.stringify(data),
  }).catch((error) => {
    console.error('Webhook emit error:', error.message);
  });
  if (data.bothEvents) {
    fetch(webHookErrorUrl, {
      method: 'POST',
      body: JSON.stringify(data),
    }).catch((error) => {
      console.error('Webhook emit error:', error.message);
    });
  }
};

export function checkIfMessageIsSigned(
  signedMessage: string | undefined,
  message: string,
  pubKey: string,
) {
  if (!signedMessage) return false;

  try {
    const publicKey = new PublicKey(pubKey);

    const isOwner = nacl.sign.detached.verify(
      new TextEncoder().encode(message),
      bs58.decode(signedMessage),
      publicKey.toBytes(),
    );
    console.log(isOwner, 'IS OWNER');
    console.log(platformAuths);

    if (!isOwner) return false;
    if (!platformAuths.includes(pubKey)) return false;
    return true;
  } catch (error) {
    console.log(error);

    return false;
  }
}
export const getUserMintPassNfts = async (
  userWallet: string,
  connection: Connection,
) => {
  try {
    const metaplex = new Metaplex(connection);
    const nfts = await metaplex
      .nfts()
      .findAllByOwner({ owner: new PublicKey(userWallet) });

    if (
      nfts.find((n) => n.collection?.address.toString() === mintPassCollection)
    )
      return true;
    return false;
  } catch (error) {
    console.log(error);
    return false;
  }
};

export const recoverBox = async (
  recoverBox: RecoverBox,
  connection: Connection,
) => {
  const [winningProof] = PublicKey.findProgramAddressSync(
    [primeBoxWinnerSeed, Buffer.from(recoverBox.nftId)],
    program.programId,
  );
  let txSig;
  try {
    const accInfo = await connection.getAccountInfo(winningProof);
    if (accInfo) {
      return true;
    }
    const authoritySig = getAuthorityAsSigner();
    console.log(authoritySig.publicKey.toString(), 'AUTH SIG');
    const ix = await program.methods
      .recoverBox(new PublicKey(recoverBox.winner), {
        nftId: recoverBox.nftId,
        nftUri: recoverBox.nftUri,
        winningAmount: new BN(recoverBox.winningAmount * LAMPORTS_PER_SOL),
      })
      .accounts({
        authority: authoritySig.publicKey,
        boxData: new PublicKey(recoverBox.boxData),
        systemProgram: SystemProgram.programId,
        winningProof,
      })
      .instruction();
    const tx = new Transaction({
      feePayer: authoritySig.publicKey,
      recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
    });
    tx.add(ix);
    tx.sign(authoritySig);

    txSig = await connection.sendRawTransaction(tx.serialize());
    const blockhashData = await connection.getLatestBlockhash();

    await confirmTransaction(txSig, connection);

    const uriData = await (await fetch(recoverBox.nftUri)).json();
    emitToWebhook({
      eventName: 'Box Recovered',
      winner: recoverBox.winner,
      winningPrice: recoverBox.winningAmount,
      nft: {
        nftId: recoverBox.nftId,
        nftImgUrl: uriData.image,
        uri: recoverBox.nftUri,
        name: uriData.name,
      },
    });
    return true;
  } catch (error) {
    console.log(error);
    emitToWebhook({
      txSig: txSig,
      eventName: 'rpc-error',
      rpcUrl: connection.rpcEndpoint,
      rpcResponse: error.message,
      event: 'RecoverBox',
      winner: recoverBox.winner,
    });
    return false;
  }
};

export async function refundBox(connection: Connection) {
  try {
    const auth = getAuthorityAsSigner();
    const allBoxes = await program.account.boxData.all();
    const instructions: TransactionInstruction[] = [];
    await Promise.all(
      allBoxes.map(async (ab) => {
        const [boxTreasury] = PublicKey.findProgramAddressSync(
          [primeBoxTreasurySeed, ab.publicKey.toBuffer()],
          program.programId,
        );
        const recoverSolIx = await program.methods
          .recoverSol(ab.account.activeBid)
          .accounts({
            boxData: ab.publicKey,
            boxTreasury,
            receiver: ab.account.winnerAddress ?? ab.account.bidder,
            systemProgram: SystemProgram.programId,
          })
          .instruction();
        instructions.push(recoverSolIx);
        if (ab.account.nftBidProof) {
          const deleteBidProof = await program.methods
            .closePreSaleProof()
            .remainingAccounts([
              {
                isSigner: false,
                isWritable: true,
                pubkey: ab.account.nftBidProof,
              },
            ])
            .instruction();

          instructions.push(deleteBidProof);
        }
      }),
    );
    const chunkedIxs = chunk(instructions, 2);
    for (const ixChunk of chunkedIxs) {
      try {
        const tx = new Transaction({
          feePayer: auth.publicKey,
          recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
        });
        ixChunk.forEach((ix) => tx.add(ix));
        tx.sign(auth);
        await connection.sendRawTransaction(tx.serialize());
      } catch (error) {
        emitToWebhook({
          action: 'Recover sol',
          wallet: ixChunk[0].keys[2].pubkey.toString(),
        });
        console.log(error);
      }
    }
  } catch (error) {
    console.log(error);
  }
}
export async function checkIfProofPdaExists(
  nftId: string,
  connection: Connection,
) {
  try {
    const [winningProofAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from(primeBoxWinnerSeed), Buffer.from(nftId)],
      new PublicKey(programId),
    );
    const accInfo = await connection.getAccountInfo(winningProofAddress);
    if (accInfo) return true;
    return false;
  } catch (error) {
    return true;
  }
}
export async function tryInitBox(boxAddress: PublicKey) {
  try {
    const boxData = await program.account.boxData.fetch(boxAddress);
    if (boxData.executionsCount.toNumber() > 0 && !boxData.isResolved) {
      return {
        nftId: boxData.nftId,
        nftUri: boxData.nftUri,
        bidder: boxData.bidder.toString(),
        activeBid: boxData.activeBid.toNumber() / LAMPORTS_PER_SOL,
        winner: boxData.winnerAddress?.toString() ?? null,
      };
    }
    return undefined;
  } catch (error) {
    return undefined;
  }
}

export async function confirmTransaction(
  txSignature: string,
  connection: Connection,
) {
  const blockhashData = await connection.getLatestBlockhash();

  const confirmedTx = await connection.confirmTransaction({
    blockhash: blockhashData.blockhash,
    lastValidBlockHeight: blockhashData.lastValidBlockHeight,
    signature: txSignature,
  });

  if (confirmedTx.value.err) {
    throw new Error(confirmedTx.value.err.toString());
  }
}
