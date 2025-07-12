import { FC, useState } from "react";
import { Account, uri } from "@lens-protocol/client";
import { setAccountMetadata } from "@lens-protocol/client/actions";
import { account } from "@lens-protocol/metadata";
import toast from "react-hot-toast";

import { Button } from "@src/components/Button";
import { ImageUploader } from "@src/components/ImageUploader/ImageUploader";
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import { storageClient } from "@src/services/lens/client";
import { resumeSession } from "@src/hooks/useLensLogin";
import { getProfileImage } from "@src/services/lens/utils";
import { handleOperationWith } from "@lens-protocol/client/viem";
import { useWalletClient } from "wagmi";
import { LENS_CHAIN_ID } from "@src/services/madfi/utils";
import { immutable } from "@lens-chain/storage-client";
import useWebNotifications from "@src/hooks/useWebNotifications";

interface EditProfileModalProps {
  profile: Account;
  closeModal: () => void;
  onProfileUpdate: () => void;
}

export const EditProfileModal: FC<EditProfileModalProps> = ({ profile, closeModal, onProfileUpdate }) => {
  if (!profile) return null;

  const { data: walletClient } = useWalletClient();
  const [name, setName] = useState(profile.metadata?.name || "");
  const [bio, setBio] = useState(profile.metadata?.bio || "");
  const [picture, setPicture] = useState<any[]>([]);
  const [coverPicture, setCoverPicture] = useState<any[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEnablingNotifications, setIsEnablingNotifications] = useState(false);

  // PWA and notifications hooks
  const { subscribeToPush, permission } = useWebNotifications(profile.owner, profile.address);

  const currentPfp = getProfileImage(profile);
  const currentCover = profile.metadata?.coverPicture;

  const handleUpdate = async () => {
    if (!walletClient) {
      toast.error("Wallet not connected");
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

      let coverPictureUrl = currentCover;
      if (coverPicture.length > 0) {
        const { uri } = await storageClient.uploadFile(coverPicture[0], { acl: immutable(LENS_CHAIN_ID) });
        coverPictureUrl = uri;
      }

      const newMetadataPayload: any = {
        name: name,
        bio: bio,
        picture: pictureUrl,
      };

      if (coverPictureUrl) {
        newMetadataPayload.coverPicture = coverPictureUrl;
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

      toast.success("Profile updated successfully! Changes may take a moment to appear.");

      setTimeout(() => {
        onProfileUpdate();
        closeModal();
      }, 3000);
    } catch (e: any) {
      console.error("Failed to update profile", e);
      toast.error(`Failed to update profile: ${e.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEnableNotifications = async () => {
    setIsEnablingNotifications(true);
    try {
      const success = await subscribeToPush();
      if (success) {
        toast.success("Notifications enabled successfully! 🔔", {
          duration: 4000,
          position: "top-center",
        });
      } else {
        toast.error("Failed to enable notifications. Please try again.", {
          duration: 4000,
        });
      }
    } catch (error) {
      console.error("Error enabling notifications:", error);
      toast.error("Failed to enable notifications. Please try again.", {
        duration: 4000,
      });
    } finally {
      setIsEnablingNotifications(false);
    }
  };

  return (
    <div className="p-4 bg-cardBackground rounded-lg text-white">
      <h2 className="text-2xl font-bold mb-6 text-center">Edit Profile</h2>

      <div className="flex items-start justify-center gap-4 mb-6">
        <div className="flex flex-col items-center">
          <label className="block text-sm font-medium text-gray-300 mb-2">Cover Photo</label>
          <ImageUploader files={coverPicture} setFiles={setCoverPicture} maxFiles={1} defaultImage={currentCover} />
        </div>
        <div className="flex flex-col items-center">
          <label className="block text-sm font-medium text-gray-300 mb-2">Profile Picture</label>
          <ImageUploader files={picture} setFiles={setPicture} maxFiles={1} defaultImage={currentPfp} />
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
            Name
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-card-light rounded-lg px-4 py-2 text-secondary font-sans"
          />
        </div>
        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-gray-300 mb-1">
            Bio
          </label>
          <textarea
            id="bio"
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full bg-card-light rounded-lg px-4 py-2 text-secondary font-sans"
          />
        </div>
      </div>

      {/* Notification Settings for PWA */}
      <div className="mt-6 p-4 bg-black/30 rounded-lg border border-gray-700">
        <h3 className="text-lg font-semibold mb-2">Notification Settings</h3>
        <p className="text-sm text-gray-300 mb-4">
          Get notified about new interactions, content updates, and important announcements.
        </p>

        {permission === "granted" ? (
          <div className="flex items-center gap-2 text-green-400">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm font-medium">Notifications enabled</span>
          </div>
        ) : (
          <Button
            variant="accentBrand"
            onClick={handleEnableNotifications}
            disabled={isEnablingNotifications}
            className="w-full"
          >
            {isEnablingNotifications ? (
              <div className="flex items-center justify-center gap-2">
                <Spinner customClasses="h-4 w-4" />
                <span>Enabling notifications...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                </svg>
                <span>Enable Notifications</span>
              </div>
            )}
          </Button>
        )}
      </div>

      <div className="mt-8 flex justify-end gap-4">
        <Button variant="secondary" onClick={closeModal} disabled={isUpdating}>
          Cancel
        </Button>
        <Button variant="accentBrand" onClick={handleUpdate} disabled={isUpdating}>
          {isUpdating ? <Spinner customClasses="h-4 w-4" /> : "Save Changes"}
        </Button>
      </div>
    </div>
  );
};
