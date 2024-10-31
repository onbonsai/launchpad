import { createPublicClient, http } from "viem";
import { polygon, polygonMumbai } from "wagmi/chains";

import { LensHubProxy } from "@src/services/lens/abi";
import { LENSHUB_PROXY } from "@src/services/lens/utils";
import { IS_PRODUCTION } from "@src/constants/constants";
import { apiUrls } from "@src/constants/apiUrls";

type Props = {
  functionName: string;
  args: any[];
};

// to be used in backend services
export const readLensHub = async ({ functionName, args }: Props) => {
  const publicClient = createPublicClient({
    chain: IS_PRODUCTION ? polygon : polygonMumbai,
    transport: http(apiUrls.rpc),
  });

  return await publicClient.readContract({
    address: LENSHUB_PROXY,
    abi: LensHubProxy,
    functionName,
    args,
  });
};

export default readLensHub;
