import { jwtVerify, createRemoteJWKSet } from "jose";
import { IS_PRODUCTION } from "../madfi/utils";

// to be used server-side
export default async (token: string) => {
  const jwksUri = IS_PRODUCTION
    ? "https://api.lens.xyz/.well-known/jwks.json"
    : "https://api.testnet.lens.xyz/.well-known/jwks.json";
  const JWKS = createRemoteJWKSet(new URL(jwksUri as string));
  const { payload } = await jwtVerify(token, JWKS);

  return payload;
};
