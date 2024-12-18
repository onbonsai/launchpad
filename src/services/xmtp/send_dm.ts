// import { Client } from "@xmtp/xmtp-js";
import { Wallet } from "ethers";
import { getAddress } from "viem";

import { IS_PRODUCTION } from "@src/constants/constants";

type Recipient = {
  address: string;
  handle: string;
  profile_id: string;
};

const buildConversationId = (profileIdA: string, profileIdB: string) => {
  const PREFIX = "lens.dev/dm";
  const profileIdAParsed = parseInt(profileIdA, 16);
  const profileIdBParsed = parseInt(profileIdB, 16);
  return profileIdAParsed < profileIdBParsed
    ? `${PREFIX}/${profileIdA}-${profileIdB}`
    : `${PREFIX}/${profileIdB}-${profileIdA}`;
};

const XMTP_ENV = IS_PRODUCTION ? "production" : "dev";
const MADFI_PROFILE_ID = IS_PRODUCTION ? "0x21c0" : "0x745d";

// @TODO: since we're calling #newConversation - this might need to change for continuing conversation
export const sendMessage = async (
  { address, handle, profile_id }: Recipient,
  message: string,
  sender_profile_id: string = MADFI_PROFILE_ID,
) => {
  try {
    // TODO: deprecate
    // const xmtp = await Client.create(new Wallet(`0x${process.env.PRIVATE_KEY!}`), { env: XMTP_ENV });
    // const conversation = await xmtp.conversations.newConversation(getAddress(address), {
    //   conversationId: buildConversationId(sender_profile_id, profile_id),
    //   metadata: {},
    // });

    // // @ts-ignore
    // await conversation.send(message, handle);
    // console.log(`message sent to ${handle}`);
    return true;
  } catch (error) {
    console.log(error);
    console.log(`ERROR - unable to send to ${handle}`);
    return false;
  }
};
