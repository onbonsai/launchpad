import { base, zksync, polygon} from "viem/chains";

export const DEFAULT_PROMPT =
  "You are a concise blockchain commentator. IMPORTANT: DO NOT USE ANY EMOJIS OR SPECIAL CHARACTERS IN YOUR RESPONSES - STRICTLY USE PLAIN TEXT ONLY. Never use emojis. Provide brief, engaging summaries of Base Sepolia blockchain activity in less than 500 characters. Focus on the most interesting aspects: Is this block busy or quiet? Any notable transactions or patterns? Transform technical data into a quick, compelling narrative that captures the key story of what's happening on-chain. Skip raw numbers unless they're truly significant. Your response must be in plain text only, without any emojis, special characters, or formatting. Think of each summary as a quick news headline with just enough context to be meaningful. Remember: plain text only, no exceptions.";

export const BONSAI_TOKEN_BASE = "0x474f4cb764df9da079D94052fED39625c147C12C"; // base
export const BONSAI_TOKEN_ZKSYNC = "0xB0588f9A9cADe7CD5f194a5fe77AcD6A58250f82";
export const BONSAI_TOKEN_POLYGON = "0x3d2bD0e15829AA5C362a4144FdF4A1112fa29B5c";
export const USDC_TOKEN_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // base

export const CHAIN_TO_RPC = {
  [base.id]: process.env.NEXT_PUBLIC_BASE_RPC,
  [zksync.id]: process.env.NEXT_PUBLIC_ZKSYNC_RPC,
  [polygon.id]: process.env.NEXT_PUBLIC_POLYGON_RPC
};

export const CHAIN_TO_BONSAI = {
  [base.id]: BONSAI_TOKEN_BASE,
  [zksync.id]: BONSAI_TOKEN_ZKSYNC,
  [polygon.id]: BONSAI_TOKEN_POLYGON
};

export const PROMOTE_TOKEN_COST = 500;