import { createPublicClient, http } from "viem";
import { normalize } from "viem/ens";
import { mainnet } from "viem/chains";

export const resolveENS = async (ensName: string) => {
  try {
    const publicClient = createPublicClient({
      chain: mainnet,
      transport: http(),
    });

    ensName = ensName.endsWith(".eth") ? ensName : `${ensName}.eth`;

    const [ensAddress, ensAvatar] = await Promise.all([
      publicClient.getEnsAddress({ name: normalize(ensName) }),
      publicClient.getEnsAvatar({ name: normalize(ensName) }),
    ]);

    return { address: ensAddress, avatar: ensAvatar };
  } catch (e) {
    console.log(e);
    return null;
  }
};
