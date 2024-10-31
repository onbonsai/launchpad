export interface FarcasterProfile {
  dappName: "farcaster";
  followerCount: number;
  followingCount: number;
  userAddressDetails?: {
    primaryDomain: string | null;
  };
  coverImageURI: string;
  profileBio: string;
  profileImage: string;
  userAssociatedAddresses: string[];
  profileDisplayName: string;
  location: string;
  profileHandle: string;
  profileTokenId: number | string;
  activeStatus?: "active" | "inactive";
}

/* neymar result for reference, gets remapped to above type
export interface FarcasterProfile {
  object: string;
  fid: number;
  username: string;
  display_name: string;
  pfp_url: string;
  profile: {
    bio: {
      text: string;
    };
  };
  follower_count: number;
  following_count: number;
  verifications: `0x${string}`[];
  active_status: "active" | "inactive";
  pfp: { url: string };
}
*/
