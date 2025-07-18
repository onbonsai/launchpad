export interface FarcasterProfile {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl: string;
  bio?: string;
  followerCount?: number;
  followingCount?: number;
  verifiedAddresses?: string[];
}

/**
 * Fetch a Farcaster user profile by FID (this is called server-side)
 * @param fid - The Farcaster ID of the user
 * @returns Promise<FarcasterProfile | null>
 */
export const fetchFarcasterUser = async (fid: number): Promise<FarcasterProfile | null> => {
  try {
    const apiKey = process.env.NEYNAR_API_KEY as string;

    const response = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user: ${response.statusText}`);
    }

    const data = await response.json();
    const user = data.users?.[0];

    if (!user) return null;

    return {
      fid: user.fid,
      username: user.username,
      displayName: user.display_name,
      pfpUrl: user.pfp_url,
      bio: user.profile?.bio?.text,
      followerCount: user.follower_count,
      followingCount: user.following_count,
      verifiedAddresses: user.verified_addresses?.eth_addresses || [],
    };
  } catch (error) {
    console.error('Error fetching Farcaster user:', error);
    return null;
  }
};