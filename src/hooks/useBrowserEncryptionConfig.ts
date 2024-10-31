import { useEffect, useState } from 'react';
import { AuthenticationConfig, ICipher, IEncryptionProvider } from '@lens-protocol/gated-content';
import { webCryptoProvider } from '@lens-protocol/gated-content/web';

export type EncryptionConfig = {
  authentication: AuthenticationConfig;
  provider: IEncryptionProvider;
};

export const useBrowserEncryptionConfig = (): EncryptionConfig | null => {
  const [encryption, setEncryption] = useState<EncryptionConfig | null>(null);

  useEffect(() => {
    setEncryption({
      authentication: {
        domain: window.location.host,
        uri: window.location.href,
      },
      provider: webCryptoProvider(),
    });
  }, []);

  return encryption;
};