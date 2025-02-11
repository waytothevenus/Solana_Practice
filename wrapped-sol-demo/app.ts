import {
  NATIVE_MINT,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  createSyncNativeInstruction,
  createTransferInstruction,
  createCloseAccountInstruction,
} from "@solana/spl-token";

import {
  Connection,
  PublicKey,
  Transaction,
  Keypair,
  LAMPORTS_PER_SOL,
  SystemProgram,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

async function main() {
  const connection = new Connection(
    "https://api.devnet.solana.com",
    "confirmed"
  );
  const wallet1 = Keypair.generate();
  const wallet2 = Keypair.generate();

  await requestAirdrop(connection, wallet1);
  const tokenAccount1 = await wrapSol(connection, wallet1);
  const tokenAccount2 = await transferWrappedSol(
    connection,
    wallet1,
    wallet2,
    tokenAccount1
  );
  await unwrapSol(connection, wallet1, tokenAccount1);
  await printBalances(connection, wallet1, wallet2, tokenAccount2);
}

async function requestAirdrop(
  connection: Connection,
  wallet: Keypair
): Promise<void> {
  const airdropSignature = await connection.requestAirdrop(
    wallet.publicKey,
    2 * LAMPORTS_PER_SOL
  );
  while (true) {
    const { value: statuses } = await connection.getSignatureStatuses([
      airdropSignature,
    ]);
    if (!statuses || statuses.length === 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      continue;
    }
    if (
      (statuses[0] && statuses[0].confirmationStatus === "confirmed") ||
      statuses[0]?.confirmationStatus === "finalized"
    ) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  console.log("Steop1: Airdrop completed");
}

async function wrapSol(connection: Connection, wallet: Keypair): Promise<PublicKey> {
    const associatedTokenAccount = await getAssociatedTokenAddress(NATIVE_MINT, wallet.publicKey);
    const wrapTransaction = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        wallet.publicKey,
        associatedTokenAccount,
        wallet.publicKey,
        NATIVE_MINT
      ),
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: associatedTokenAccount,
        lamports: LAMPORTS_PER_SOL 
      }),
      createSyncNativeInstruction(associatedTokenAccount)
    );
    await sendAndConfirmTransaction(connection, wrapTransaction, [wallet]);
    console.log("Step2: Wrapped SOL completed");
    return associatedTokenAccount;
}

async function transferWrappedSol(
  connection: Connection,
  fromWallet: Keypair,
  toWallet: Keypair,
  fromTokenAccount: PublicKey
): Promise<PublicKey> {
  const toTokenAccount = await getAssociatedTokenAddress(
    NATIVE_MINT,
    toWallet.publicKey
  );
  const transferTransaction = new Transaction().add(
    createAssociatedTokenAccountInstruction(
      fromWallet.publicKey,
      toTokenAccount,
      toWallet.publicKey,
      NATIVE_MINT
    ),
    createTransferInstruction(
      fromTokenAccount,
      toTokenAccount,
      fromWallet.publicKey,
      LAMPORTS_PER_SOL / 2
    )
  );
  await sendAndConfirmTransaction(connection, transferTransaction, [fromWallet]);
  console.log("Step3: Wrapped SOL transfer completed");
  return toTokenAccount;
}

async function unwrapSol(
  connection: Connection,
  wallet: Keypair,
  fromTokenAccount: PublicKey): Promise<void> {
    const closeTransaction = new Transaction().add(
        createCloseAccountInstruction(
        fromTokenAccount,
        wallet.publicKey,
        wallet.publicKey
        )
    );
    await sendAndConfirmTransaction(connection, closeTransaction, [wallet]);
    console.log("Step4: Unwrapped SOL completed");
}

async function printBalances(
    connection: Connection,
    wallet1: Keypair,
    wallet2: Keypair,
    tokenAccount: PublicKey
): Promise<void> {
    const [wallet1Balance, wallet2Balance, tokenAccount2Ifo] = await Promise.all([
        connection.getBalance(wallet1.publicKey),
        connection.getBalance(wallet2.publicKey),
        connection.getTokenAccountBalance(tokenAccount)
    ]);
    console.log("Wallet1 balance:", wallet1Balance);
    console.log("Wallet2 balance:", wallet2Balance);
    console.log("Token account balance:", tokenAccount2Ifo.value.amount);
}

main().catch(console.error);