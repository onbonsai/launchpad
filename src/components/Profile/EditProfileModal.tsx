import { FC, useState } from 'react';
import { Account, uri } from '@lens-protocol/client';
import { setAccountMetadata } from '@lens-protocol/client/actions';
import { account } from '@lens-protocol/metadata';
import toast from 'react-hot-toast';

import { Button } from '@src/components/Button';
import { ImageUploader } from '@src/components/ImageUploader/ImageUploader';
import Spinner from '@src/components/LoadingSpinner/LoadingSpinner';
import { storageClient } from '@src/services/lens/client';
import { resumeSession } from '@src/hooks/useLensLogin';
import { getProfileImage } from '@src/services/lens/utils';
import { handleOperationWith } from "@lens-protocol/client/viem";
import { useWalletClient } from 'wagmi';
import { LENS_CHAIN_ID } from '@src/services/madfi/utils';
import { immutable } from "@lens-chain/storage-client";


interface EditProfileModalProps {
  profile: Account;
  closeModal: () => void;
  onProfileUpdate: () => void;
}

export const EditProfileModal: FC<EditProfileModalProps> = ({ profile, closeModal, onProfileUpdate }) => {
  const { data: walletClient } = useWalletClient();
  const [name, setName] = useState(profile.metadata?.name || '');
  const [bio, setBio] = useState(profile.metadata?.bio || '');
  const [picture, setPicture] = useState<any[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  const currentPfp = getProfileImage(profile);

  const handleUpdate = async () => {
    if (!walletClient) {
      toast.error('Wallet not connected');
      return;
    }
    setIsUpdating(true);

    try {
        const sessionClient = await resumeSession();
        if (!sessionClient) {
            throw new Error("Could not resume session");
        }

        let pictureUrl = currentPfp;
        if (picture.length > 0) {
            const { uri } = await storageClient.uploadFile(picture[0], { acl: immutable(LENS_CHAIN_ID) });
            pictureUrl = uri;
        }

        const newMetadataPayload: any = {
            name: name,
            bio: bio,
            picture: pictureUrl,
        };

        if (profile.metadata?.coverPicture) {
            newMetadataPayload.coverPicture = profile.metadata.coverPicture;
        }

        if (profile.metadata?.attributes && profile.metadata.attributes.length > 0) {
            newMetadataPayload.attributes = profile.metadata.attributes;
        }

        const newMetadata = account(newMetadataPayload);

        const { uri: metadataUri } = await storageClient.uploadAsJson(newMetadata);

        const result = await setAccountMetadata(sessionClient, {
            metadataUri: uri(metadataUri),
        }).andThen(handleOperationWith(walletClient));

        if (result.isErr()) {
            throw result.error;
        }
        
        const txHash = result.value;
        await sessionClient.waitForTransaction(txHash);

        toast.success('Profile updated successfully! Changes may take a moment to appear.');
        
        setTimeout(() => {
            onProfileUpdate();
            closeModal();
        }, 3000);

    } catch (e: any) {
        console.error('Failed to update profile', e);
        toast.error(`Failed to update profile: ${e.message}`);
    } finally {
        setIsUpdating(false);
    }
  };

  return (
    <div className="p-4 bg-cardBackground rounded-lg text-white">
      <h2 className="text-2xl font-bold mb-6 text-center">Edit Profile</h2>
      
      <div className="mb-6 flex flex-col items-center">
        <ImageUploader 
          files={picture}
          setFiles={setPicture}
          maxFiles={1}
          compact
          defaultImage={currentPfp}
        />
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">Name</label>
          <input 
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-card-light rounded-lg px-4 py-2 text-secondary font-sans"
          />
        </div>
        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-gray-300 mb-1">Bio</label>
          <textarea
            id="bio"
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full bg-card-light rounded-lg px-4 py-2 text-secondary font-sans"
          />
        </div>
      </div>

      <div className="mt-8 flex justify-end gap-4">
        <Button variant="secondary" onClick={closeModal} disabled={isUpdating}>Cancel</Button>
        <Button variant="accentBrand" onClick={handleUpdate} disabled={isUpdating}>
          {isUpdating ? <Spinner customClasses="h-4 w-4" /> : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}; 