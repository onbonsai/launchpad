import { useQuery } from "@tanstack/react-query";
import { base, zkSync, polygon } from "viem/chains";
import { createPublicClient, http, erc20Abi, Chain, parseEther, formatEther, pad } from "viem";

import toast from "react-hot-toast";
import BonsaiOFTAdapterABI from "./BonsaiOFTAdapter.json";
import { lens, PROTOCOL_DEPLOYMENT } from "@src/services/madfi/utils";
import { ChainRpcs } from "@src/constants/chains";

export const BONSAI_POLYGON = "0x3d2bD0e15829AA5C362a4144FdF4A1112fa29B5c";
export const BONSAI_OFT_ADAPTER_POLYGON = "0x303b63e785B656ca56ea5A5C1634Ab20C98895e1"
export const BONSAI_BASE_OFT = "0x474f4cb764df9da079D94052fED39625c147C12C";
export const BONSAI_ZKSYNC_OFT = "0xB0588f9A9cADe7CD5f194a5fe77AcD6A58250f82";

const ADAPTER_CONTRACTS = {
  [polygon.id]: BONSAI_OFT_ADAPTER_POLYGON,
  [base.id]: BONSAI_BASE_OFT,
  [zkSync.id]: BONSAI_ZKSYNC_OFT,
  [lens.id]: PROTOCOL_DEPLOYMENT.lens.Bonsai,
};

export const BONSAI_CONTRACTS = {
  [polygon.id]: BONSAI_POLYGON,
  [base.id]: BONSAI_BASE_OFT,
  [zkSync.id]: BONSAI_ZKSYNC_OFT,
  [lens.id]: PROTOCOL_DEPLOYMENT.lens.Bonsai,
};

export const ELIGIBLE_CHAINS = [base.id as number, zkSync.id as number, polygon.id as number, lens.id];

const EXECUTOR_OPTIONS_LZ_RECEIVE_GAS_500k = "0x0003010011010000000000000000000000000007a120";
const EXECUTOR_OPTIONS_LZ_RECEIVE_GAS_1M = "0x000301001101000000000000000000000000000f4240";

const CHAIN_ID_TO_EID = {
  [polygon.id]: 30109,
  [base.id]: 30184,
  [zkSync.id]: 30165,
  [lens.id]: 30373,
}

export const getEstimatedNativeFee = async (fromChain: Chain, toChain: Chain, amount: string, recipient: `0x${string}`): Promise<bigint | undefined> => {
  if (!ELIGIBLE_CHAINS.includes(fromChain.id) || !ELIGIBLE_CHAINS.includes(toChain.id))
    throw new Error(`chain not eligible: ${ELIGIBLE_CHAINS}`);
  if (fromChain.id === toChain.id) throw new Error(`chains cannot be the same`);

  const publicClient = createPublicClient({
    chain: fromChain,
    transport: http(ChainRpcs[fromChain.id]),
  });

  const amountLD = parseEther(amount);
  const lzApp = ADAPTER_CONTRACTS[fromChain.id];

  const extraOptions = amountLD > parseEther("500000")
    ? EXECUTOR_OPTIONS_LZ_RECEIVE_GAS_1M
    : EXECUTOR_OPTIONS_LZ_RECEIVE_GAS_500k;
  const dstEid = CHAIN_ID_TO_EID[toChain.id]

  const params = {
    dstEid, // Destination endpoint ID.
    to: pad(recipient, { size: 32, dir: "left" }), // Recipient address (bytes32).
    amountLD, // Amount to send in local decimals.
    minAmountLD: amountLD, // Minimum amount to send in local decimals.
    extraOptions, // Additional options supplied by the caller to be used in the LayerZero message.
    composeMsg: "0x", // The composed message for the send() operation.
    oftCmd: "0x" // The OFT command to be executed, unused in default OFT implementations.
  };

  try {
    const fee = await publicClient.readContract({
      address: lzApp as `0x${string}`,
      abi: BonsaiOFTAdapterABI,
      functionName: "quoteSend",
      args: [params, false]
    }) as { nativeFee: bigint };

    return fee.nativeFee;
  } catch (error) {
    console.log(error);
  }
};

export const bridgeTokens = async (fromChain: Chain, toChain: Chain, amount: string, walletClient: any, toastId?: any) => {
  if (!ELIGIBLE_CHAINS.includes(fromChain.id) || !ELIGIBLE_CHAINS.includes(toChain.id))
    throw new Error(`chain not eligible: ${ELIGIBLE_CHAINS}`);
  if (fromChain.id === toChain.id) throw new Error(`chains cannot be the same`);

  const publicClient = createPublicClient({
    chain: fromChain,
    transport: http(ChainRpcs[fromChain.id]),
  });

  const amountLD = parseEther(amount);
  const lzApp = ADAPTER_CONTRACTS[fromChain.id] as `0x${string}`;

  // these are to support the extra gas on the 404 contract
  const extraOptions = amountLD > parseEther("500000")
    ? EXECUTOR_OPTIONS_LZ_RECEIVE_GAS_1M
    : EXECUTOR_OPTIONS_LZ_RECEIVE_GAS_500k;
  const dstEid = CHAIN_ID_TO_EID[toChain.id]
  const [recipient] = await walletClient.getAddresses();

  const params = {
    dstEid, // Destination endpoint ID.
    to: pad(recipient, { size: 32, dir: "left" }), // Recipient address (bytes32).
    amountLD, // Amount to send in local decimals.
    minAmountLD: amountLD, // Minimum amount to send in local decimals.
    extraOptions, // Additional options supplied by the caller to be used in the LayerZero message.
    composeMsg: "0x", // The composed message for the send() operation.
    oftCmd: "0x" // The OFT command to be executed, unused in default OFT implementations.
  };

  await approveToken(publicClient, BONSAI_CONTRACTS[fromChain.id], amountLD, walletClient, lzApp, toastId);

  const fee = await publicClient.readContract({
    address: lzApp as `0x${string}`,
    abi: BonsaiOFTAdapterABI,
    functionName: "quoteSend",
    args: [params, false]
  }) as { nativeFee: bigint, lzTokenFee: bigint };

  console.log(`fee: ${formatEther(fee.nativeFee)}`);

  toast.loading("Sending bridge transaction...", { id: toastId });
  const hash = await walletClient.writeContract({
    address: lzApp,
    abi: BonsaiOFTAdapterABI,
    functionName: "send",
    args: [params, fee, recipient],
    value: fee.nativeFee
  });
  console.log(`tx: ${hash}`);
  await publicClient.waitForTransactionReceipt({ hash });

  return hash;
};

const approveToken = async (
  publicClient: any,
  token: string,
  amount: bigint,
  walletClient: any,
  operator: `0x${string}`,
  toastId?: any,
) => {

  const [user] = await walletClient.getAddresses();
  const allowance = await publicClient.readContract({
    address: token as `0x${string}`,
    abi: erc20Abi,
    functionName: "allowance",
    args: [user, operator],
  });

  if (allowance as bigint < amount) {
    if (toastId) toast.loading("Approving tokens for bridge...", { id: toastId });
    const hash = await walletClient.writeContract({
      address: token,
      abi: erc20Abi,
      functionName: "approve",
      args: [operator, amount],
    });
    await publicClient.waitForTransactionReceipt({ hash });
  }
};
export const useGetEstimatedNativeFee = ({
  fromChain,
  toChain,
  amount,
  recipient
}: {
  fromChain?: Chain;
  toChain?: Chain;
  amount?: string;
  recipient: `0x${string}`;
}) => {
  return useQuery({
    queryKey: ["bridge-native-fee", fromChain?.id, toChain?.id, amount],
    queryFn: () => getEstimatedNativeFee(fromChain!, toChain!, amount!, recipient),
    refetchInterval: 5000,
    enabled: !!fromChain && !!toChain && !!amount
  });
};
