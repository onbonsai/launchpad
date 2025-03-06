import { omit } from "lodash/object";

import { chainIdNumber as chainId } from "@src/constants/validChainId";
import { Chains } from "@src/constants/chains";

export const USE_LENS_RELAY = false; // = process.env.NODE_ENV === 'production';

export const LENS_HUB_NFT_NAME = "Lens Protocol Profiles";

export const LENSHUB_PROXY =
  chainId === Chains.POLYGON
    ? "0xDb46d1Dc155634FbC732f92E853b10B288AD5a1d"
    : "0x4fbffF20302F3326B20052ab9C217C44F6480900";

export const FREE_COLLECT_MODULE =
  process.env.NEXT_PUBLIC_CHAIN_ID === "137"
    ? "0x23b9467334bEb345aAa6fd1545538F3d54436e96"
    : "0x0BE6bD7092ee83D44a6eC1D949626FeE48caB30c";

export const MULTIRECIPIENT_COLLECT_MODULE =
  process.env.NEXT_PUBLIC_CHAIN_ID === "137"
    ? "0xfa9dA21D0A18C7B7dE4566481c1e8952371F880a"
    : "0x99d6c3eabf05435e851c067d2c3222716f7fcfe5";

export const LENSHUB_PROXY_SANDBOX = "0x7582177F9E536aB0b6c721e11f383C326F2Ad1D5";
export const FREE_COLLECT_MODULE_SANDBOX = "0x11C45Cbc6fDa2dbe435C0079a2ccF9c4c7051595";

export const signedTypeData = (signer, domain, types, value) => {
  // remove the __typedname from the signature!
  return signer._signTypedData(omit(domain, "__typename"), omit(types, "__typename"), omit(value, "__typename"));
};

export const toHexString = (id: number) => {
  const profileHexValue = id.toString(16);
  return `0x${profileHexValue.length === 3 ? profileHexValue.padStart(4, "0") : profileHexValue.padStart(2, "0")}`;
};

export const bToHexString = (id: bigint) => {
  const profileHexValue = id.toString(16);
  return `0x${profileHexValue.length === 3 ? profileHexValue.padStart(4, "0") : profileHexValue.padStart(2, "0")}`;
};

export const getProfileImage = (profile) => {
  return profile?.metadata?.picture || "/default.png";
};
