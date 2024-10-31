import { toast } from "react-hot-toast";
import { PublicationType, PostFragment, ProfileFragment, LimitType } from '@lens-protocol/client';

import { ExtendedGatedClient } from "@src/services/lens/createGatedClient";

import { lensClient } from "./client";

export const getGatedPosts = async (profileId: string): Promise<{ allPosts: PostFragment[], gatedPosts: PostFragment[], next: any }> => {
  const { items, next } = await lensClient.publication.fetchAll({
    limit: LimitType.TwentyFive,
    where: {
      from: [profileId],
      publicationTypes: [PublicationType.Post],
    }
  });

  const gatedPosts = (
    items as PostFragment[]
  ).filter((item: PostFragment) => item.metadata.encryptedWith);

  return {
    allPosts: items as PostFragment[],
    gatedPosts,
    next,
  };
};

export const getGatedPostsWithNext = async (_next: any): Promise<{ allPosts: PostFragment[], gatedPosts: PostFragment[], next: any }> => {
  const { items, next } = (await _next) || {};

  if (!items) {
    return {
      allPosts: [],
      gatedPosts: [],
      next: null,
    };
  }

  const gatedPosts = (
    items as PostFragment[]
  ).filter((item: PostFragment) => item.metadata.encryptedWith);

  return {
    allPosts: items as PostFragment[],
    gatedPosts,
    next,
  };
};

export const decryptGatedPosts = async (
  client: ExtendedGatedClient,
  gatedPosts: any[],
  isAuthSigCached: boolean,
  walletClient: any,
  defaultProfile: ProfileFragment
) => {
  if (!client) return null;

  let toastId;
  try {
    if (!isAuthSigCached) {
      const isAuthenticated = await client.authentication.isAuthenticated();
      if (!isAuthenticated) {
        toastId = toast.loading("Decrypting...");
        await client.authenticateEncrypted(walletClient, defaultProfile?.ownedBy.address, defaultProfile?.id);
      }
    }

    // Delay the decryption process to ensure the toast loading message is displayed
    const posts: any[] = await new Promise((resolve, reject) => {
      client.decryptPublications(gatedPosts).then(resolve).catch(reject);
    });

    const withErrors = posts.filter(({ error }) => error);

    if (withErrors.length && posts?.length === 1) {
      toast.error("Failed to decrypt one or more posts", { id: toastId, duration: 5000 });
    } else {
      if (toastId) toast.dismiss(toastId);
    }

    return {
      posts: posts.filter(({ error }) => !error),
      errorCount: withErrors.length,
    };
  } catch (error) {
    console.log(error);
    toast.error("Failed to decrypt posts", { id: toastId });
    return { posts: [] };
  }
};
