import axios from "axios";

import { apiUrls } from "@constants/apiUrls";

export const _hash = (uriOrHash: string) =>
  typeof uriOrHash === "string" && uriOrHash.startsWith("ipfs://") ? uriOrHash.split("ipfs://")[1] : uriOrHash;

export const pinFileToIPFS = (file: any) => {
  const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;

  //we gather a local file for this example, but any valid readStream source will work here.
  const data = new FormData();
  data.append("file", file);

  //You'll need to make sure that the metadata is in the form of a JSON object that's been convered to a string
  //metadata is optional
  const metadata = JSON.stringify({
    name: file.name,
  });
  data.append("pinataMetadata", metadata);
  data.append("pinataOptions", '{"cidVersion": 1}');

  return axios
    .post(url, data, {
      maxBodyLength: Infinity, //this is needed to prevent axios from erroring out with large files
      headers: {
        "Content-Type": `multipart/form-data;`, // boundary=${data._boundary}`,
        pinata_api_key: process.env.NEXT_PUBLIC_PINATA_KEY ?? "",
        pinata_secret_api_key: process.env.NEXT_PUBLIC_PINATA_SECRET_KEY ?? "",
      },
    })
    .then(function (response) {
      //handle response here
      return response.data;
    })
    .catch(function (error) {
      //handle error here
      console.log(error);
    });
};

export const pinJson = (json: any, address?: string) => {
  const data = {
    pinataMetadata: {
      name: `lenspost_${address?.toLowerCase() ?? "unknown"}`,
    },
    pinataOptions: {
      cidVersion: 1,
    },
    pinataContent: {
      ...json,
    },
  };
  const url = "https://api.pinata.cloud/pinning/pinJSONToIPFS";

  return axios
    .post(url, data, {
      headers: {
        "Content-Type": "application/json",
        pinata_api_key: process.env.NEXT_PUBLIC_PINATA_KEY ?? "",
        pinata_secret_api_key: process.env.NEXT_PUBLIC_PINATA_SECRET_KEY ?? "",
      },
    })
    .then(function (response) {
      //handle response here
      return response.data;
    })
    .catch(function (error) {
      //handle error here
      console.log(error);
    });
};

export const getViaDefaultGateway = async (uriOrHash: string) => {
  const { data } = await axios.get(`${apiUrls.ipfsDefaultHost}/${_hash(uriOrHash)}`);
  return data;
};

export const getViaPinataGateway = async (uriOrHash: string) => {
  const { data } = await axios.get(`${apiUrls.pinataGateway}/${_hash(uriOrHash)}`);
  return data;
};

export const pinataGatewayURL = (uriOrHash: string) => `${apiUrls.pinataGateway}/${_hash(uriOrHash)}`;

export const defaultGatewayURL = (uriOrHash: string) => `${apiUrls.ipfsDefaultHost}/${_hash(uriOrHash)}`;

export const lensGatewayURL = (uriOrHash: string) => `${apiUrls.lensGateway}/${_hash(uriOrHash)}`;

export const ipfsOrNot = (urlOrUri?: string) =>
  urlOrUri?.startsWith("ipfs://") ? `https://ipfs.io/ipfs/${_hash(urlOrUri)}` : (urlOrUri || "");

export const ipfsOrNotWithDefaultGateway = (uriOrHash?: string) =>
  uriOrHash?.startsWith("ipfs://") ? defaultGatewayURL(uriOrHash) : uriOrHash;

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
