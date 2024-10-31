import { useEffect, useState } from "react";
import { getAddress, isAddress, createPublicClient, http } from "viem";
import { mainnet } from 'viem/chains'

import { shortAddress } from "@src/utils/utils";

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http()
})

export default (address) => {
  if (address && address.length) {
    address = getAddress(address);
  }
  const [ensName, setENSName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const resolveENS = async () => {
      setLoading(true);
      if (isAddress(address)) {
        try {
          const ensName = await publicClient.getEnsName({
            address,
          })

          setENSName(ensName ?? shortAddress(address));
        } catch {} finally {
          setLoading(false);
        }
      }
    };
    resolveENS();
  }, [address]);

  return { ensName, loading };
};
