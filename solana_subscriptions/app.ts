import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

const WSS_ENDPOINT = "ws://api.devnet.solana.com";
const HTTPS_ENDPOINT = "https://api.devnet.solana.com";

const solanaConnection = new Connection(HTTPS_ENDPOINT, {
  wsEndpoint: WSS_ENDPOINT,
});
const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

(async () => {
  const ACCOUNT_TO_WATCH = new PublicKey(
    "62H8n2ABbgkE3HtQnxcc2W8rZxz6vJ2vZeeDCBe1ZvG7"
  );
  const subscriptionId = await solanaConnection.onAccountChange(
    ACCOUNT_TO_WATCH,
    (updatedAccountInfo: any) => {
      console.log(`Account ${ACCOUNT_TO_WATCH} updated:`, updatedAccountInfo);
    }
  );
  console.log(`Subscribed to account ${ACCOUNT_TO_WATCH}`);
  await sleep(10 * 1000);
  await solanaConnection.requestAirdrop(
    ACCOUNT_TO_WATCH,
    LAMPORTS_PER_SOL * 10
  );
})();
