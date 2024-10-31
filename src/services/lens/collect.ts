import { postId, SessionClient } from "@lens-protocol/client";
import { executePostAction } from "@lens-protocol/client/actions";
import { handleOperationWith } from "@lens-protocol/client/viem";
import { getChain, PROTOCOL_DEPLOYMENT } from "../madfi/utils";
import { erc20Abi, parseEther, formatEther } from "viem";
import { toast } from "react-hot-toast";
import { readContract } from "viem/actions";
import { publicClient } from "../madfi/moneyClubs";

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
 * @returns amount of BONSAI needed to collect the post
 */
export const checkCollectAmount = async (
  walletClient: any,
  collectAmount: string,
  lensAccount: `0x${string}`,
  bonsaiBalance: bigint,
  userAddress?: `0x${string}` | string,
): Promise<bigint> => {
  const collectAmountBn = parseEther(collectAmount);
  if (!userAddress) {
    [userAddress] = await walletClient.getAddresses();
    if (!userAddress) {
      throw new Error("No user address found");
    }
  }

  // If lens account has enough BONSAI, we're done
  if (bonsaiBalance >= collectAmountBn) {
    return 0n;
  }

  const _publicClient = publicClient("lens");

  // Check EOA BONSAI balance
  const eoaBonsaiBalance = await _publicClient.readContract({
    address: PROTOCOL_DEPLOYMENT.lens.Bonsai,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [userAddress],
  });

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
    return 0n;
  }

  return collectAmountBn - bonsaiBalance;
};
