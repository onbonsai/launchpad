import { decodeEventLog, encodeAbiParameters, getAddress, parseAbiParameters, createPublicClient, http } from "viem";
import { polygon } from "viem/chains";

import { apiUrls } from "@src/constants/apiUrls";

/**
 * return a decoded event object from `transactionReceipt`
 */
export const getEventFromReceipt = ({ transactionReceipt, contractAddress, abi, eventName }) => {
  const logs = contractAddress
    ? transactionReceipt.logs.filter(({ address }) => getAddress(address) === getAddress(contractAddress))
    : transactionReceipt.logs;

  return logs
    .map((l) => {
      try {
        return decodeEventLog({ abi, data: l.data, topics: l.topics });
      } catch {
        return {};
      }
    })
    .find((event) => event.eventName === eventName);
};
/**
 * return an array of decoded event objects with `eventName` from `transactionReceipt`
 */
export const getEventsFromReceipt = ({ transactionReceipt, contractAddress, abi, eventName }): any[] => {
  const logs = contractAddress
    ? transactionReceipt.logs.filter(({ address }) => getAddress(address) === getAddress(contractAddress))
    : transactionReceipt.logs;

  return logs
    .map((l) => {
      try {
        return decodeEventLog({ abi, data: l.data, topics: l.topics });
      } catch {
        return {};
      }
    })
    .filter((event) => event.eventName === eventName);
};

export const encodeAbi = (types: string[], values: any[]) => {
  return encodeAbiParameters(parseAbiParameters(types.join(",")), values);
};

export const getPolygonClient = () => {
  return createPublicClient({
    chain: polygon,
    transport: http(apiUrls.rpc),
  });
};
