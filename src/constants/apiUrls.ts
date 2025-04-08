import { IS_PRODUCTION } from "@src/services/madfi/utils";

const PRODUCTION_URLS = {
  openSea: "https://opensea.io",
  ipfsDefaultHost: "https://ipfs.io/ipfs",
  pinataGateway: "https://madfinance.mypinata.cloud/ipfs",
  lensGateway: "https://lens.infura-ipfs.io/ipfs",
  rpc: process.env.NEXT_PUBLIC_POLYGON_RPC,
  ethExplorer: "https://etherscan.io",
  lensAPI: "https://api.lens.xyz/graphql",
  madfiSubgraph: `https://gateway-arbitrum.network.thegraph.com/api/${process.env.NEXT_PUBLIC_MONEY_CLUBS_SUBGRAPH_API_KEY}/subgraphs/id/BT7yTf18FbLQpbZ35k9sTnQ8PVNEjG3QgbsggCMnC6oU`,
  madfiSubgraphBase: "https://api.studio.thegraph.com/query/18207/madfi-subgraph-base-mainnet/version/latest",
  storjGateway: "https://www.storj-ipfs.com",
};

const STAGING_URLS = {
  openSea: "https://testnets.opensea.io",
  ipfsDefaultHost: "https://ipfs.io/ipfs",
  pinataGateway: "https://madfinance.mypinata.cloud/ipfs",
  lensGateway: "https://lens.infura-ipfs.io/ipfs",
  rpc: process.env.NEXT_PUBLIC_MUMBAI_RPC,
  ethExplorer: "https://mumbai.polygonscan.com",
  lensAPI: "https://api.testnet.lens.dev/graphql",
  madfiSubgraph: "https://api.thegraph.com/subgraphs/name/mad-finance/testnet-madfi-subgraph",
  madfiSubgraphBase: "https://api.studio.thegraph.com/query/102483/bonsai-launchpad-base-sepolia/version/latest",
  storjGateway: "https://www.storj-ipfs.com",
};

const DEV_URLS = {
  openSea: "https://testnets.opensea.io",
  ipfsDefaultHost: "https://ipfs.io/ipfs",
  pinataGateway: "https://madfinance.mypinata.cloud/ipfs",
  lensGateway: "https://lens.infura-ipfs.io/ipfs",
  rpc: "http://127.0.0.1:8545",
  ethExplorer: "",
  lensAPI: "https://api-mumbai.lens.dev",
  lensAPIv2: "https://api-v2-mumbai.lens.dev",
  // @TODO: replace with mumbai
  madfiSubgraph: "http://localhost:8000/subgraphs/name/imthatcarlos/madfi-subgraph",
  madfiSubgraphBase: "https://api.studio.thegraph.com/query/102483/bonsai-launchpad-base-sepolia/version/latest",
  storjGateway: "https://www.storj-ipfs.com",
};

export const apiUrls = IS_PRODUCTION ? PRODUCTION_URLS : STAGING_URLS;
