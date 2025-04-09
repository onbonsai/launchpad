import { erc20Abi, type Chain } from "viem";
import { publicClient } from "@src/services/madfi/moneyClubs";

const sendTokens = async (walletClient: any, to: `0x${string}`, amount: bigint, chain: Chain, token: `0x${string}`) => {
  const client = publicClient(chain.name);
  const [account] = await walletClient.getAddresses();
  const hash = await walletClient.writeContract({
    account,
    address: token,
    abi: erc20Abi,
    functionName: "transfer",
    args: [to, amount],
    chain
  });
  console.log(`hash: ${hash}`);
  await client.waitForTransactionReceipt({ hash });
  return hash;
};

export default sendTokens;