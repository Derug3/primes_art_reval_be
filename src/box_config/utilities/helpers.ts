import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import * as bs58 from 'bs58';
import { AnchorProvider, BN, Program, Wallet } from '@project-serum/anchor';
import { IDL, ArtReveal } from './idl';
import nacl from 'tweetnacl';
export const primeBoxSeed = Buffer.from('prime-box');
export const primeBoxTreasurySeed = Buffer.from('prime-box-treasury');
export const primeBoxWinnerSeed = Buffer.from('prime-box-winner');
import * as dotenv from 'dotenv';
import { decode } from 'bs58';
import { Metaplex } from '@metaplex-foundation/js';
import { BoxConfig } from '../entity/box_config.entity';
import { Nft } from 'src/nft/entity/nft.entity';
import { BoxType } from 'src/enum/enums';
import { Bidders, BoxPool, BoxTimigState } from '../types/box_config.types';
import { BadRequestException } from '@nestjs/common';
import { User } from 'src/user/entity/user.entity';
import { roles } from './rolesData';
import { TOKEN_PROGRAM_ID } from '@project-serum/anchor/dist/cjs/utils/token';
import { RecoverBox } from 'src/recover_box/entity/recover_box.entity';
import { writeFileSync } from 'fs';

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
  bidders: Bidders[],
  hasResolved: boolean,
  user: User | null,
  boxTimingState: BoxTimigState,
  connection: Connection,
  nft: Nft,
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

    const confirmed = await connection.confirmTransaction(txSig);
    if (instructionsWithoutCb.length > 1) {
      hasResolved = true;
    }
    if (confirmed.value.err !== null) {
      // throw new Error(confirmed.value.err);
      throw new Error('Transaction failed');
    }
    const box = await program.account.boxData.fetch(
      instructionsWithoutCb[0].keys[0].pubkey,
    );
    bidders.push({
      bidAmount: box.activeBid.toNumber() / LAMPORTS_PER_SOL,
      walletAddress: bidder.toString(),
      username:
        user?.discordUsername ?? `${bidder.slice(0, 4)}...${bidder.slice(-4)}`,
    });
    try {
      const bidAmount = instructionsWithoutCb[0].data
        .subarray(9, 17)
        .readBigUInt64LE();

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
          bidAmount: Number(bidAmount) / LAMPORTS_PER_SOL,
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
          nftMint: instructionsWithoutCb[2]?.keys[2]?.pubkey?.toString() ?? '',
          nft: {
            nftId: nft.nftId,
            nftImgUrl: nft.nftImage,
            uri: nft.nftUri,
            name: nft.nftName,
          },
          bidders,
          boxState: boxTimingState.state,
          secondsRemaining: boxTimingState.endsAt - boxTimingState.startedAt,
          mintAmount: Number(bidAmount) / LAMPORTS_PER_SOL,
        });
      }
    } catch (error) {
      console.log(error);
    }
    return existingBidProofAuthority;
  } catch (error) {
    console.log(error);

    emitToWebhook({
      eventName: 'rpc-error',
      rpcUrl: connection.rpcEndpoint,
      rpcResponse: error.message,
      event: 'PlaceBid',
    });

    throw new BadRequestException(parseTransactionError(error));
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
    emitToWebhook({
      eventName: 'Auction Won',
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
    emitToWebhook({
      eventName: 'rpc-error',
      rpcUrl: connection.rpcEndpoint,
      rpcResponse: error.message,
      event: 'InitBox',
    });
    return false;
  }
};

export const claimNft = async (tx: any, connection: Connection) => {
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

    emitToWebhook({
      message: 'Nft claimed',
      nftMint: nonComputeBudgetIxs.keys[2].pubkey,
      winner: nonComputeBudgetIxs.keys[0].pubkey,
    });
    return true;
  } catch (error) {
    emitToWebhook({
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
  fetch(data.eventName ? webHookErrorUrl : webhookUrl, {
    method: 'POST',
    body: JSON.stringify(data),
  }).catch((error) => {
    console.error('Webhook emit error:', error.message);
  });
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

  try {
    const accInfo = await connection.getAccountInfo(winningProof);
    if (accInfo) {
      return true;
    }
    const authoritySig = getAuthorityAsSigner();
    const ix = await program.methods
      .recoverBox(new PublicKey(recoverBox.winner), {
        nftId: recoverBox.nftId,
        nftUri: recoverBox.nftUri,
        winningAmount: new BN(recoverBox.winningAmount),
      })
      .accounts({
        authority: authoritySig.publicKey,
        boxData: new PublicKey(recoverBox.boxData),
        boxTreasury: new PublicKey(recoverBox.boxTreasury),
        systemProgram: SystemProgram.programId,
        winningProof,
        treasury: new PublicKey(treasury),
      })
      .instruction();
    const txMess = new TransactionMessage({
      instructions: [ix],
      payerKey: authoritySig.publicKey,
      recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
    }).compileToV0Message();
    const versionedTx = new VersionedTransaction(txMess);
    versionedTx.sign([getAuthorityAsSigner()]);
    const txSig = await connection.sendRawTransaction(versionedTx.serialize());
    const txConfirmed = await connection.confirmTransaction(txSig);
    if (!txConfirmed.value.err) {
      const uriData = await (await fetch(recoverBox.nftUri)).json();
      emitToWebhook({
        eventName: 'Auction Won',
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
    } else return false;
  } catch (error) {
    console.log(error);
    emitToWebhook({
      eventName: 'rpc-error',
      rpcUrl: connection.rpcEndpoint,
      rpcResponse: error.message,
      event: 'RecoverBox',
      winner: recoverBox.winner,
    });
    return false;
  }
};
