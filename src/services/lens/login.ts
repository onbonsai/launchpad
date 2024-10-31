import { Address } from 'ethers';
import { gql } from '@apollo/client';

import { apolloClient } from './apolloClient';

const AUTHENTICATION = `
  mutation($request: SignedAuthChallenge!) {
    authenticate(request: $request) {
      accessToken
      refreshToken
    }
 }
`

const GET_CHALLENGE = `
  query($request: ChallengeRequest!) {
    challenge(request: $request) { text }
  }
`

const VERIFY_JWT = `
  query($accessToken: String!) {
    verify(request: {
      accessToken: $accessToken
    })
  }
`

const generateChallenge = (address) => {
  return apolloClient.query({
    query: gql(GET_CHALLENGE),
    variables: {
      request: { address },
    },
  });
};

const authenticate = (address, signature) => {
  return apolloClient.mutate({
     mutation: gql(AUTHENTICATION),
     variables: {
       request: { address, signature },
     },
  });
};

export const login = async (signer: any, address: Address) => {
  const { data: { challenge } } = await generateChallenge(address);

  const signature = await signer.signMessage(challenge.text);

  const { data } = await authenticate(address, signature);

  return data.authenticate;
};

export const verifyJwt = (accessToken: string) => {
  return apolloClient.query({
    query: gql(VERIFY_JWT),
    variables: { accessToken },
  });
};

/**
 * Decodes a JWT and returns the data in base64 format.
 *
 * @param str The JWT to decode.
 * @returns The decoded data in base64 format.
 */
const decoded = (str: string): string =>
  Buffer.from(str, 'base64').toString('binary');

/**
 * Parses a JSON Web Token and returns an object with the expiry time in seconds.
 *
 * @param token The JSON Web Token to parse.
 * @returns An object with the expiry time in seconds.
 */
export const parseJwt = (
  token: string
): {
  authorizationId: string;
  evmAddress: string;
  exp: number;
  iat: number;
  id: string;
  role: string;
} => {
  try {
    return JSON.parse(decoded(token.split('.')[1]));
  } catch {
    return {
      authorizationId: '',
      evmAddress: '',
      exp: 0,
      iat: 0,
      id: '',
      role: ''
    };
  }
};