import { waitForTransactionReceipt } from "@wagmi/core";
import { toast } from "react-hot-toast";
import { Abi, WalletClient } from "viem";
import { polygon, polygonMumbai } from "viem/chains";

import RewardsStakerABI from "@src/services/uniswap/positionManager/RewardsStakerABI.json";
import PositionManagerABI from "@src/services/uniswap/positionManager/PositionManagerABI.json";
import { IS_PRODUCTION } from "@src/constants/constants";
import { configureChainsConfig } from "@src/utils/wagmi";

export const NFT_POSITION_MANAGER = "0xC36442b4a4522E871399CD717aBDD847Ab11FE88";
export const STAKING_REWARDS = "0xe34139463bA50bD61336E0c446Bd8C0867c6fE65";

export const BONSAI = "0x3d2bD0e15829AA5C362a4144FdF4A1112fa29B5c";
export const WMATIC = IS_PRODUCTION
  ? "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270"
  : "0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889";
export const FEE_TIER = 10000;

// TODO: create incentives for mainnet
export const INCENTIVES_KEY = IS_PRODUCTION
  ? {
      rewardToken: BONSAI,
      pool: "",
      startTime: 0,
      endTime: 0,
      refundee: "0x21aF1185734D213D45C6236146fb81E2b0E8b821",
    }
  : {
      rewardToken: BONSAI,
      pool: "0xCF3E589Ef4A4E8196eAAE6b1938dD060f3112Ac6",
      startTime: 1711395103,
      endTime: 1742948203,
      refundee: "0x21aF1185734D213D45C6236146fb81E2b0E8b821",
    };

export const stakeBonsaiLP = async (walletClient: WalletClient, account: `0x${string}`, position: any) => {
  const toastId = toast.loading("Depositing...");
  const hash = await walletClient.writeContract({
    address: NFT_POSITION_MANAGER,
    abi: PositionManagerABI as unknown as Abi,
    functionName: "safeTransferFrom",
    args: [account, STAKING_REWARDS, position.tokenId],
    chain: IS_PRODUCTION ? polygon : polygonMumbai,
    account,
  });
  await waitForTransactionReceipt(configureChainsConfig, { hash });
  toast.success("Deposited", { id: toastId, duration: 5000 });

  const toastId2 = toast.loading("Staking...");
  const hash2 = await walletClient.writeContract({
    address: STAKING_REWARDS,
    abi: RewardsStakerABI as unknown as Abi,
    functionName: "stakeToken",
    args: [INCENTIVES_KEY, position.tokenId],
    chain: IS_PRODUCTION ? polygon : polygonMumbai,
    account,
  });
  await waitForTransactionReceipt(configureChainsConfig, { hash: hash2 });
  toast.success("Staked", { id: toastId2, duration: 5000 });
};

export const unstakeBonsaiLP = async (walletClient: WalletClient, account: `0x${string}`, position: any) => {
  const toastId = toast.loading("Unstaking...");
  const hash = await walletClient.writeContract({
    address: STAKING_REWARDS,
    abi: RewardsStakerABI as unknown as Abi,
    functionName: "unstakeToken",
    args: [INCENTIVES_KEY, position.tokenId],
    chain: IS_PRODUCTION ? polygon : polygonMumbai,
    account,
  });
  await waitForTransactionReceipt(configureChainsConfig, { hash });
  toast.success("Unstaked", { id: toastId, duration: 5000 });

  const toastId2 = toast.loading("Withdrawing...");
  const hash2 = await walletClient.writeContract({
    address: STAKING_REWARDS,
    abi: RewardsStakerABI as unknown as Abi,
    functionName: "withdrawToken",
    args: [position.tokenId, account, ""],
    chain: IS_PRODUCTION ? polygon : polygonMumbai,
    account,
  });
  await waitForTransactionReceipt(configureChainsConfig, { hash: hash2 });
  toast.success("Withdrawn", { id: toastId2, duration: 5000 });
};

export const claimBonsaiLPRewards = async (walletClient: WalletClient, account: `0x${string}`) => {
  const toastId = toast.loading("Claiming...");
  const hash = await walletClient.writeContract({
    address: STAKING_REWARDS,
    abi: RewardsStakerABI as unknown as Abi,
    functionName: "claimReward",
    args: [BONSAI, account, 0],
    chain: IS_PRODUCTION ? polygon : polygonMumbai,
    account,
  });
  await waitForTransactionReceipt(configureChainsConfig, { hash });
  toast.success("Claimed", { id: toastId, duration: 5000 });
};
