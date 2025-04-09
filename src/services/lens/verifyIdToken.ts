import { jwtVerify, createRemoteJWKSet } from "jose";
import { IS_PRODUCTION } from "../madfi/utils";

// to be used server-side
export default async (token: string) => {
  const jwksUri = IS_PRODUCTION
    ? process.env.NEXT_PUBLIC_JWKS_URI
    : process.env.NEXT_PUBLIC_JWKS_URI_TESTNET;
  const JWKS = createRemoteJWKSet(new URL(jwksUri as string));
  const { payload } = await jwtVerify(token, JWKS);

  return payload;
};
