import { decodeEventLog, encodeAbiParameters, getAddress, parseAbiParameters, createPublicClient, http } from "viem";
import {
  mainnet,
  goerli,
  polygon,
  polygonMumbai,
  base,
  baseSepolia,
  baseGoerli,
  avalanche,
  avalancheFuji,
} from "viem/chains";

import { apiUrls } from "@src/constants/apiUrls";
import { chainIdNumber } from "@src/constants/validChainId";

// for 0xSplits stuff
export const SUPPORTED_SPLIT_CHAINS_VIEM = chainIdNumber === 137
  ? [polygon, mainnet, base, avalanche]
  : [polygonMumbai, goerli, baseSepolia, avalancheFuji]

/**
 * return a decoded event object from `transactionReceipt`
 */
export const getEventFromReceipt = ({
  transactionReceipt,
  contractAddress,
  abi,
  eventName
}) => {
  const logs = contractAddress
    ? transactionReceipt.logs.filter(({ address }) => getAddress(address) === getAddress(contractAddress))
    : transactionReceipt.logs;

  return logs
    .map((l) => {
      try {
        return decodeEventLog({ abi, data: l.data, topics: l.topics });
      } catch { return {}; }
    })
    .find((event) => event.eventName === eventName);
};
/**
 * return an array of decoded event objects with `eventName` from `transactionReceipt`
 */
export const getEventsFromReceipt = ({
  transactionReceipt,
  contractAddress,
  abi,
  eventName,
}): any[] => {
  const logs = contractAddress
    ? transactionReceipt.logs.filter(({ address }) => getAddress(address) === getAddress(contractAddress))
    : transactionReceipt.logs;

  return logs
    .map((l) => {
      try {
        return decodeEventLog({ abi, data: l.data, topics: l.topics });
      } catch { return {}; }
    })
    .filter((event) => event.eventName === eventName);
};

export const encodeAbi = (types: string[], values: any[]) => {
  return encodeAbiParameters(
    parseAbiParameters(types.join(',')),
    values
  );
};

export const getPolygonClient = () => {
  return createPublicClient({
    chain: polygon,
    transport: http(apiUrls.rpc),
  });
}