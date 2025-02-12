import {
  Connection,
  PublicKey,
  Keypair,
  StakeProgram,
  LAMPORTS_PER_SOL,
  Authorized,
  TransactionSignature,
  TransactionConfirmationStatus,
  SignatureStatus,
} from "@solana/web3.js";
import walletSecret from "./wallet.json";

const connection = new Connection("https://api.devnet.solana.com");
const wallet = Keypair.fromSecretKey(new Uint8Array(walletSecret));
const stakeAccount = Keypair.generate();
const validatorVoteAccount = new PublicKey(
  "66Ks5mqirQV2zbtNrfxmK7VVUQUpqSAcFoztWX26kj2P"
);

async function confirmTransaction(
  connection: Connection,
  signature: TransactionSignature,
  desiredConfirmationStatus: TransactionConfirmationStatus,
  timeout: number = 30000,
  pollInterval: number = 1000,
  searchTransactionHistory: boolean = false
): Promise<SignatureStatus> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const { value: statuses } = await connection.getSignatureStatuses(
      [signature],
      { searchTransactionHistory }
    );

    // Correcting the condition to handle the statuses array check
    if (!statuses || statuses.length === 0) {
      throw new Error("Transaction not found");
    }

    const status = statuses[0];
    if (status === null) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
      continue;
    }

    if (status.err) {
      throw new Error(`Error confirming transaction: ${status.err}`);
    }

    // Using correct variable which is confirmationStatus
    if (status.confirmationStatus === desiredConfirmationStatus) {
      return status;
    }
    if (status.confirmationStatus === "finalized") {
      return status;
    }
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new Error(`Transaction confirmation timed out after ${timeout}ms`);
}

async function main() {
  try {
    console.log("Step 1: Funding Wallet");
    await fundAccount(wallet, 2 * LAMPORTS_PER_SOL);
    console.log("Step 2: Creating Stake Account");
    await createStakeAccount({
      wallet,
      stakeAccount,
      lamports: 1.9 * LAMPORTS_PER_SOL,
    });
    console.log("Step 3: Delegating Stake Account");
    await delegateStakeAccount({
      stakeAccount,
      validatorVoteAccount,
      authorized: wallet,
    });
    console.log("Step 4: Check Stake Account");
    await getStakeAccountInfo(stakeAccount.publicKey);
  } catch (error) {
    console.error(error);
    return;
  }
}

async function fundAccount(
  accountToFund: Keypair,
  lamports = LAMPORTS_PER_SOL
) {
  const { blockhash } = await connection.getLatestBlockhash();
  try {
    const signature = await connection.requestAirdrop(
      accountToFund.publicKey,
      lamports
    );
    const result = await confirmTransaction(connection, signature, "finalized");
    if (result.err) {
      throw new Error(`Airdrop failed: ${result.err}`);
    }
    console.log("Wallet Funded successfully", signature);
  } catch (error) {
    console.error(error);
  }
}

async function createStakeAccount({
  wallet,
  stakeAccount,
  lamports,
}: {
  wallet: Keypair;
  stakeAccount: Keypair;
  lamports: number;
}) {
  const transaction = StakeProgram.createAccount({
    fromPubkey: wallet.publicKey,
    stakePubkey: stakeAccount.publicKey,
    authorized: new Authorized(wallet.publicKey, wallet.publicKey),
    lamports: lamports ?? LAMPORTS_PER_SOL,
  });

  try {
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash();
    transaction.feePayer = wallet.publicKey;
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.sign(wallet, stakeAccount);
    const signature = await connection.sendRawTransaction(
      transaction.serialize()
    );
    const result = await confirmTransaction(connection, signature, "finalized");
    if (result.err) {
      throw new Error(`Stake account creation failed: ${result.err}`);
    }
    console.log("Stake account created successfully", signature);
  } catch (error) {
    console.error(error);
  }
}

async function delegateStakeAccount({
  stakeAccount,
  validatorVoteAccount,
  authorized,
}: {
  stakeAccount: Keypair;
  validatorVoteAccount: PublicKey;
  authorized: Keypair;
}) {
  const transaction = StakeProgram.delegate({
    stakePubkey: stakeAccount.publicKey,
    authorizedPubkey: authorized.publicKey,
    votePubkey: validatorVoteAccount,
  });
  try {
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash();
    transaction.feePayer = wallet.publicKey;
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.sign(authorized);
    const signature = await connection.sendRawTransaction(
      transaction.serialize()
    );
    const result = await confirmTransaction(connection, signature, "finalized");
    if (result.err) {
      throw new Error(`Stake account delegation failed: ${result.err}`);
    }
    console.log("Stake account delegated successfully", signature);
  } catch (error) {
    console.error(error);
  }
  return;
}
async function getStakeAccountInfo(stakeAccount: PublicKey) {
  try {
    const info = await connection.getAccountInfo(stakeAccount);
    console.log("Stake Account Info:", info);
  } catch (error) {
    console.error(error);
  }
  return;
}

main();
