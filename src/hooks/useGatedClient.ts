import { useState } from 'react';

import { walletClientToSigner } from "@src/utils/wagmi";
import { createGatedClient, ExtendedGatedClient } from "@src/services/lens/createGatedClient";

let singletonClient: ExtendedGatedClient | null = null;

const useGatedClient = () => {
  const [gatedClient, setGatedClient] = useState(singletonClient);

  const _createGatedClient = (encryption, walletClient): ExtendedGatedClient | null => {
    if (!singletonClient) {
      const signer = walletClientToSigner(walletClient);
      singletonClient = signer ? createGatedClient({
        config: encryption.authentication,
        signer,
        encryptionProvider: encryption.provider,
      }) : null;
      setGatedClient(singletonClient);
    }

    return singletonClient;
  };

  return { gatedClient, createGatedClient: _createGatedClient };
};

export default useGatedClient;