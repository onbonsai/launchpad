import { postId, SessionClient } from "@lens-protocol/client";
import { executePostAction } from "@lens-protocol/client/actions";
import { handleOperationWith } from "@lens-protocol/client/viem";
import { getChain, PROTOCOL_DEPLOYMENT } from "../madfi/utils";
import { erc20Abi, parseEther, formatEther, encodePacked } from "viem";
import { toast } from "react-hot-toast";
import { readContract } from "viem/actions";
import { publicClient, WGHO_ABI, WGHO_CONTRACT_ADDRESS } from "../madfi/moneyClubs";
import { swapGhoForBonsai, calculatePath } from "./rewardSwap";
import { quoteExactOutput } from "../uniswap/useQuote";

export const collectPost = async (
  sessionClient: SessionClient,
  walletClient: any,
  _postId: string,
  referralAddress?: `0x${string}`,
): Promise<boolean> => {
  const result = await executePostAction(sessionClient, {
    post: postId(_postId),
    // TODO: when renamed to payToCollect ?
    action: {
      simpleCollect: {
        selected: true,
        referrals: referralAddress
          ? [
              {
                address: referralAddress,
                percent: 100,
              },
            ]
          : undefined,
      },
    },
  }).andThen(handleOperationWith(walletClient));

  if (result.isOk()) {
    return true;
  }

  console.log("lens:: collectPost:: failed to collect with error:", result);

  return false;
};

/**
 * Verify the user has enough BONSAI balance to collect the post
 * @param walletClient
 * @param collectAmount cost of the collect
 * @param lensAccount address of the lens account
 * @param bonsaiBalance balance of the lens account
 * @param userAddress address of the user EOA
 */
export const checkCollectAmount = async (
  walletClient: any,
  collectAmount: string,
  lensAccount: `0x${string}`,
  bonsaiBalance: bigint,
  userAddress?: `0x${string}` | string,
) => {
  const collectAmountBn = parseEther(collectAmount);
  if (!userAddress) {
    [userAddress] = await walletClient.getAddresses();
    if (!userAddress) {
      throw new Error("No user address found");
    }
  }

  // If lens account has enough BONSAI, we're done
  if (bonsaiBalance >= collectAmountBn) {
    return;
  }

  // Check EOA BONSAI balance
  const eoaBonsaiBalance = await readContract(walletClient, {
    address: PROTOCOL_DEPLOYMENT.lens.Bonsai,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [userAddress],
  });

  const _publicClient = publicClient("lens");

  // If EOA has enough BONSAI, transfer it to lens account
  if (eoaBonsaiBalance + bonsaiBalance >= collectAmountBn) {
    const amountToTransfer = collectAmountBn - bonsaiBalance;
    const toastId = toast.loading(`Transferring ${formatEther(amountToTransfer)} $BONSAI to Lens account...`);

    const transferResult = await walletClient.writeContract({
      address: PROTOCOL_DEPLOYMENT.lens.Bonsai,
      abi: erc20Abi,
      functionName: "transfer",
      args: [lensAccount, amountToTransfer],
      chain: getChain("lens"),
    });

    if (!transferResult) {
      toast.error("Failed to transfer BONSAI tokens to lens account", { id: toastId });
      throw new Error("Failed to transfer BONSAI tokens to lens account");
    }

    await _publicClient.waitForTransactionReceipt({ hash: transferResult });
    toast.success("BONSAI tokens transferred to lens account", { id: toastId });
    return;
  }

  toast("Not enough BONSAI balance. Checking WGHO balance...", { duration: 10000 });

  // If not enough BONSAI, check WGHO balance
  const wghoBalance = await readContract(walletClient, {
    address: WGHO_CONTRACT_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [userAddress],
  });

  // Get quote for how much WGHO needed to get required BONSAI
  const requiredBonsai = collectAmountBn - (bonsaiBalance + eoaBonsaiBalance);
  const quoteResult = await quoteExactOutput(
    // path has to be in reverse order for quoteExactOutput
    encodePacked(["address", "uint24", "address"], [PROTOCOL_DEPLOYMENT.lens.Bonsai, 3000, WGHO_CONTRACT_ADDRESS]),
    (105n * requiredBonsai) / 100n,
    userAddress,
  );

  // If enough WGHO, swap it to BONSAI
  if (wghoBalance >= quoteResult.amount) {
    const swapToastId = toast.loading("Swapping WGHO to BONSAI...");
    try {
      await swapGhoForBonsai(walletClient, (101n * requiredBonsai) / 100n, userAddress, quoteResult.amount);
      toast.success("Swapped WGHO to BONSAI", { id: swapToastId });
    } catch (error) {
      toast.error("Failed to swap WGHO to BONSAI", { id: swapToastId });
      throw error;
    }
  } else {
    // Check GHO balance
    const ghoBalance = await _publicClient.getBalance({
      address: userAddress,
    });

    // Calculate how much more WGHO we need
    const additionalWGHONeeded = quoteResult.amount - wghoBalance;

    if (ghoBalance < additionalWGHONeeded) {
      toast.error("Insufficient GHO balance");
      throw new Error("Insufficient GHO balance");
    }

    // Wrap the required amount of GHO
    const toastId = toast.loading("Wrapping GHO...");
    try {
      const wrapHash = await walletClient.writeContract({
        address: WGHO_CONTRACT_ADDRESS,
        abi: WGHO_ABI,
        functionName: "deposit",
        args: [],
        value: additionalWGHONeeded,
      });

      await _publicClient.waitForTransactionReceipt({ hash: wrapHash });
      toast.success("Wrapped GHO", { id: toastId });
    } catch (error) {
      toast.error("Failed to wrap GHO", { id: toastId });
      throw error;
    }

    // Now swap the WGHO to BONSAI
    const swapToastId = toast.loading("Swapping WGHO to BONSAI...");
    try {
      await swapGhoForBonsai(walletClient, (101n * requiredBonsai) / 100n, userAddress, quoteResult.amount);
      toast.success("Swapped WGHO to BONSAI", { id: swapToastId });
    } catch (error) {
      toast.error("Failed to swap WGHO to BONSAI", { id: swapToastId });
      throw error;
    }
  }

  // Finally, transfer the BONSAI to the lens account
  const finalBonsaiBalance = await readContract(walletClient, {
    address: PROTOCOL_DEPLOYMENT.lens.Bonsai,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [userAddress],
  });

  const amountToTransfer = collectAmountBn - bonsaiBalance;
  const transferToastId = toast.loading(`Transferring ${formatEther(amountToTransfer)} $BONSAI to Lens account...`);

  const transferResult = await walletClient.writeContract({
    address: PROTOCOL_DEPLOYMENT.lens.Bonsai,
    abi: erc20Abi,
    functionName: "transfer",
    args: [lensAccount, amountToTransfer],
    chain: getChain("lens"),
  });

  if (!transferResult) {
    toast.error("Failed to transfer BONSAI tokens to lens account", { id: transferToastId });
    throw new Error("Failed to transfer BONSAI tokens to lens account");
  }

  await _publicClient.waitForTransactionReceipt({ hash: transferResult });
  toast.success("BONSAI tokens transferred to lens account", { id: transferToastId });
};
