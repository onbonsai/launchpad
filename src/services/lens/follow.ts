import { broadcastOnchain } from './broadcastMutation';
import { lensClient } from "./client";

export const followProfile = async (
  walletClient: any,
  profileId: string
) => {
  const result = await lensClient.profile.createFollowTypedData({
    follow: [{ profileId }],
  });

  const data = result.unwrap();

  const [account] = await walletClient.getAddresses();
  const signedTypedData = await walletClient.signTypedData({
    account,
    domain: data.typedData.domain,
    types: data.typedData.types,
    primaryType: "Follow",
    message: data.typedData.value,
  });

  const broadcastResult = await broadcastOnchain({
    id: data.id,
    signature: signedTypedData,
  });

  // const followBroadcastResultValue = broadcastResult.unwrap();

  // console.log(followBroadcastResultValue);
}
