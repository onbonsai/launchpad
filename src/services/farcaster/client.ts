import { NeynarAPIClient } from "@neynar/nodejs-sdk";

import { FarcasterProfile } from "./types";

// make sure to set your NEYNAR_API_KEY .env
const client = new NeynarAPIClient(process.env.NEYNAR_API_KEY!);

/**
 * Gets a farcaster user profile by handle
 * @param handle handle of the user to search for
 * @returns array of users matching the handle
 */
export const getFarcasterUserByHandle = async (handle: string): Promise<FarcasterProfile[]> => {
  try {
    const { result } = await client.searchUser(handle, 233531);

    // map to common type format
    const users: FarcasterProfile[] =
      result?.users.map((user) => ({
        dappName: "farcaster",
        followerCount: user.follower_count,
        followingCount: user.following_count,
        coverImageURI: "",
        profileBio: user.profile.bio.text,
        profileImage: user.pfp.url || user.pfp.url,
        userAssociatedAddresses: user.verifications.filter((address: string) => address.startsWith("0x")),
        profileDisplayName: user.display_name,
        location: "",
        profileHandle: user.username,
        profileTokenId: user.fid,
        activeStatus: user.active_status,
      })) ?? [];

    return users;
  } catch (e) {
    console.log(e);
    return [];
  }
};

/**
 * Gets a farcaster user profile by fid
 * @param fid fid of the user to search for
 * @returns user matching the fid
 */
export const getFarcasterUserByFid = async (fid: number | string): Promise<FarcasterProfile | null> => {
  try {
    const { result } = await client.lookupUserByFid(Number(fid));

    // map to common type format
    const user = result?.user;
    return {
      dappName: "farcaster",
      followerCount: user.followerCount,
      followingCount: user.followingCount,
      coverImageURI: "",
      profileBio: user.profile.bio.text,
      profileImage: user.pfp.url || user.pfp.url,
      userAssociatedAddresses: user.verifications.filter((address: string) => address.startsWith("0x")),
      profileDisplayName: user.displayName,
      location: "",
      profileHandle: user.username,
      profileTokenId: user.fid,
      activeStatus: user.activeStatus,
    };
  } catch (e) {
    console.log(e);
    return null;
  }
};
