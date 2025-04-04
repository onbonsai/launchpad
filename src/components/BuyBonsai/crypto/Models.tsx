import { ChainId } from "@decent.xyz/box-common";
import { PROTOCOL_DEPLOYMENT } from "@src/services/madfi/utils";

const BONSAI_TOKEN_BASE_ADDRESS = PROTOCOL_DEPLOYMENT.base.Bonsai as `0x${string}`;

// TODO: switch to zksync
// Bonsai token on Base
export const bonsaiToken = {
    address: BONSAI_TOKEN_BASE_ADDRESS,
    chainId: ChainId.BASE,
    decimals: 18,
    symbol: 'BONSAI',
    name: 'Bonsai Token',
    isNative: false,
    logo: 'https://assets.coingecko.com/coins/images/35884/large/Bonsai_BW_Coingecko-200x200.jpg?1710071621',
};

export const matic = {
    address: "0x0000000000000000000000000000000000000000",
    chainId: ChainId.POLYGON,
    decimals: 18,
    symbol: 'MATIC',
    name: 'MATIC',
    isNative: true,
    logo: 'https://assets.coingecko.com/coins/images/4713/large/polygon.png?1698233745',
};

export const usdc = {
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    chainId: ChainId.BASE,
    decimals: 6,
    symbol: 'USDC',
    name: 'USD Coin',
    isNative: false,
    logo: 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png?1547042389',
}
