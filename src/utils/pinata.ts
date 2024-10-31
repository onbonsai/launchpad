import { apiUrls } from "@constants/apiUrls";

export const _hash = (uriOrHash: string) =>
  typeof uriOrHash === "string" && uriOrHash.startsWith("ipfs://") ? uriOrHash.split("ipfs://")[1] : uriOrHash;

export const pinataGatewayURL = (uriOrHash: string) => `${apiUrls.pinataGateway}/${_hash(uriOrHash)}`;

export const ipfsOrNot = (urlOrUri?: string) =>
  urlOrUri?.startsWith("ipfs://") ? `https://ipfs.io/ipfs/${_hash(urlOrUri)}` : urlOrUri || "";

export const remapStorjToPinata = (storjUrl?: string) => {
  if (!storjUrl) return "";

  // Check if it's a storj URL
  if (storjUrl.includes("storj-ipfs")) {
    // Extract the IPFS hash from the storj URL
    const hash = storjUrl.split("/").pop();
    if (hash) {
      // Return the pinata gateway URL with the hash
      return `${apiUrls.pinataGateway}/${hash}`;
    }
  }

  // If not a storj URL or hash extraction failed, return original URL
  return storjUrl;
};
