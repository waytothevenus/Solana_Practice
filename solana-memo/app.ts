import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";

const RPC_ENDPOINT = "https://api.devnet.solana.com";
const SOLANA_CONNECTION = new Connection(RPC_ENDPOINT);
const secret = [
  24, 252, 49, 241, 100, 52, 33, 101, 136, 73, 52, 103, 50, 213, 219, 121, 132,
  212, 89, 143, 33, 102, 157, 176, 124, 141, 180, 242, 193, 37, 73, 33, 161,
  219, 18, 209, 169, 42, 215, 119, 253, 114, 164, 75, 200, 26, 25, 252, 121, 19,
  55, 67, 126, 14, 224, 11, 39, 86, 250, 226, 127, 96, 147, 117,
];
const fromKeypair = Keypair.fromSecretKey(new Uint8Array(secret));

async function logMemo(message: string) {
  let tx = new Transaction();
  await tx.add(
    new TransactionInstruction({
      keys: [
        { pubkey: fromKeypair.publicKey, isSigner: true, isWritable: true },
      ],
      data: Buffer.from(message, "utf-8"),
      programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
    }),
    SystemProgram.transfer({
      fromPubkey: fromKeypair.publicKey,
      toPubkey: new PublicKey("HHWnihfANXc78ESGG7RbVeC1xyKtvr6FEoKY3aHqDLfS"),
      lamports: 0.1 * LAMPORTS_PER_SOL,
    })
  );
  console.log(fromKeypair.publicKey.toString());
  let result = await sendAndConfirmTransaction(SOLANA_CONNECTION, tx, [
    fromKeypair,
  ]);
  console.log(
    "Complete: ",
    `https://explorer.solana.com/tx/${result}?cluster=devnet`
  );
}

async function fetchMemo() {
  const wallet = fromKeypair.publicKey;
  let signatureDetail = await SOLANA_CONNECTION.getSignaturesForAddress(wallet);
  console.log("Fetched memo: ", signatureDetail[0].memo);
}

// logMemo("QuickNode Memo Guide Test");
fetchMemo();
