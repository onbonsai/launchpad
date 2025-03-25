import { postId, SessionClient } from "@lens-protocol/client";
import { executePostAction } from "@lens-protocol/client/actions";
import { handleOperationWith } from "@lens-protocol/client/viem";

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
        referrals: referralAddress ? [
          {
            address: referralAddress,
            percent: 100,
          },
        ] : undefined,
      },
    },
  }).andThen(handleOperationWith(walletClient));

  if (result.isOk()) {
    return true;
  }

  console.log(
    "lens:: collectPost:: failed to collect with error:",
    result
  );

  return false;
};
