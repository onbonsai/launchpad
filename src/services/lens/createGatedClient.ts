import { AuthenticationConfig, IEncryptionProvider } from '@lens-protocol/gated-content';
import { development, production, LensClient } from '@lens-protocol/client/gated';
import { Signer } from 'ethers';

import { IS_PRODUCTION } from '@src/constants/constants';

export type GateClientInit = {
  config: AuthenticationConfig;
  encryptionProvider: IEncryptionProvider;
  // environment: GatedEnvironments.EnvironmentConfig;
  signer: Signer;
  // storageProvider: IStorageProvider;
};

export class ExtendedGatedClient extends LensClient {
  public readonly authStorageKey: string;

  constructor(params: any) {
    super(params);

    const namespace = params.environment.name;
    this.authStorageKey = `lens.${namespace}.gated`;
  }

  private parseDecryptedPublication(publication: any, decryptedMetadata: any) {
    return { ...publication, metadata: decryptedMetadata }
  }

  // right before creating an encrypted post or decrypting
  public async authenticateEncrypted(walletClient: any, signedBy: string, forProfileId: string) {
    const { id, text } = await this.authentication.generateChallenge({
      signedBy,
      for: forProfileId,
    });

    const signature = await walletClient.signMessage({ account: signedBy, message: text });

    await this.authentication.authenticate({ id, signature });
  }

  // creating this helper since the client does not expose when this localstorage key gets set
  public isAuthSigCached(): boolean {
    let authSig: string | null = null;

    if (typeof window !== 'undefined') {
      authSig = window.localStorage.getItem(this.authStorageKey);
      // remove any authsig that doesn't match the connected signer's address
      if (authSig && JSON.parse(authSig).data.address.toLowerCase() !== this.config?.signer?._address?.toLowerCase()) {
        window.localStorage.removeItem(this.authStorageKey);
        authSig = null;
      }
    }

    return authSig !== null;
  }

  // decrypts publications by first checking if there is only one
  public async decryptPublications(_gatedPublications?: any[]) {
    if (!_gatedPublications?.length) return [];

    const gatedPublications = [..._gatedPublications];
    let res: any[] = [];

    // decrypt the first one to prompt the sign-in
    const firstPublication = gatedPublications.shift();

    try {
      const result = await this.gated.decryptPublicationMetadataFragment(firstPublication.metadata);

      if (!result.isFailure()) {
        res = [this.parseDecryptedPublication(firstPublication, result.value)];
      } else {
        console.log(result.error)
        res = [{ ...firstPublication, error: result.error }];
      }
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ACTION_REJECTED') {
        return [{ error: 'Please sign the message to decrypt the feed' }];
      }
      console.log(error)

      res = [{ ...firstPublication, error }];
    }

    // decrypt the rest
    const decryptedPublications = await Promise.all(gatedPublications.map(async (publication) => {
      try {
        const result = await this.gated.decryptPublicationMetadataFragment(publication.metadata);

        if (!result.isFailure()) {
          return this.parseDecryptedPublication(publication, result.value);
        } else {
          return { ...publication, error: result.error };
        }
      } catch (error) {
        return { ...publication, error };
      }
    }));

    return res.concat(decryptedPublications).flat();
  }
}

export function createGatedClient({
  config,
  signer,
  // environment,
  // encryptionProvider,
  // storageProvider,
}: GateClientInit): ExtendedGatedClient {
  return new ExtendedGatedClient({
    authentication: config,
    signer,
    environment: IS_PRODUCTION ? production : development,
    // encryptionProvider,
    storage: window.localStorage,
  });
}