import { postId, SessionClient } from "@lens-protocol/client";
import { executePostAction } from "@lens-protocol/client/actions";
import { handleOperationWith } from "@lens-protocol/client/viem";
import { getChain, PROTOCOL_DEPLOYMENT } from "../madfi/utils";
import { erc20Abi, parseEther } from "viem";
import { toast } from "react-hot-toast";
import { formatEther } from "viem";
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
  let toastId;
  if (bonsaiBalance < collectAmountBn) {
    const balance = await readContract(walletClient, {
      address: PROTOCOL_DEPLOYMENT.lens.Bonsai,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [userAddress],
    });

    if (bonsaiBalance + balance >= collectAmountBn) {
      // Calculate the amount needed to transfer
      const amountToTransfer = collectAmountBn - bonsaiBalance;

      toastId = toast.loading(`Transferring ${formatEther(amountToTransfer)} $BONSAI to Lens account...`);

      // Transfer the needed amount from user wallet to lens account
      const transferResult = await walletClient.writeContract({
        address: PROTOCOL_DEPLOYMENT.lens.Bonsai,
        abi: erc20Abi,
        functionName: "transfer",
        args: [lensAccount, amountToTransfer],
        chain: getChain("lens"),
      });

      if (!transferResult) {
        throw new Error("Failed to transfer BONSAI tokens to lens account");
      }

      await publicClient("lens").waitForTransactionReceipt({ hash: transferResult });

      toast.success("BONSAI tokens transferred to lens account", { id: toastId });
    } else {
      toast.error("Insufficient BONSAI balance", { id: toastId });
      // TODO: attempt to swap GHO for BONSAI
    }
  }
};
