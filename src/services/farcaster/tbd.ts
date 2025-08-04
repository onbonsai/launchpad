export interface CoinsResponse {
  coins: Coin[];
}

export interface Coin {
  id: string;
  most_recent_swap_price_eth: number;
  uri: string;
  name: string;
  symbol: string;
  coin: string;
  coin_creator_address: string;
  pool_key_hash: string;
  block_number: string;
  coin_created_timestamp: string;
  eth_amount_wei_1h: string;
  eth_amount_wei_24h: string;
  eth_amount_wei_all_time: string;
  eth_amount_wei_7d: string;
  most_recent_swap_timestamp: string;
  media_image: string;
  media_description: string;
  media_animationUrl: string | null;
  media_contentMime: string | null;
  media_contentUri: string | null;
  // Cast / “post” metadata
  cast_cast_hash: string | null;
  cast_author_fid: string | null;
  cast_author_username: string | null;
  cast_author_display_name: string | null;
  cast_author_pfp_url: string | null;
  cast_author_custody_address: string | null;
  cast_author_profile_bio_text: string | null;
  cast_author_follower_count: string;
  cast_author_following_count: string;
  cast_author_power_badge: boolean;
  cast_author_score: number;
  cast_thread_hash: string | null;
  cast_parent_hash: string | null;
  cast_parent_url: string | null;
  cast_root_parent_url: string | null;
  cast_text: string | null;
  cast_media_type: string;
  cast_timestamp: string | null;
  cast_embed_url: string | null;
  cast_embed_metadata_content_type: string | null;
  cast_reactions_likes_count: string;
  cast_reactions_recasts_count: string;
  cast_replies_count: string;
  pricing: Pricing;
  volume: Volume;
}

export interface Pricing {
  coin: string;
  swap_price_last: string;
  swap_txn_1h_ago: string;
  swap_price_1h_ago: string;
  swap_txn_24h_ago: string;
  swap_price_24h_ago: string;
  pct_change_1h: number;
  pct_change_24h: number;
  price_1h_ago_usd: number;
  price_24h_ago_usd: number;
  swap_price_last_usd: number;
  market_cap_usd: number;
}

export interface Volume {
  eth_usd_volume_1h: number;
  eth_usd_volume_24h: number;
  eth_usd_volume_7d: number;
}

export async function fetchTopCoins(): Promise<CoinsResponse> {
  const url =
    'https://api.tbd.market/coins?sortKey=eth_amount_wei_all_time_desc&limit=50&longCache=true';
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch coins: ${res.status} ${res.statusText}`);
  }
  const data: CoinsResponse = await res.json();
  return data;
}
