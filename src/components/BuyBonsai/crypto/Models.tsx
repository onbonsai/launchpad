import { ChainId } from "@decent.xyz/box-common";

const BONSAI_TOKEN_BASE_ADDRESS = "0x474f4cb764df9da079D94052fED39625c147C12C";

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
