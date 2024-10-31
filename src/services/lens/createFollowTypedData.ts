import { gql } from '@apollo/client'

import { apolloClient } from './apolloClient';

const CREATE_FOLLOW_TYPED_DATA = `
  mutation CreateFollowTypedData($profileId: ProfileId!) {
    createFollowTypedData(request:{
      follow: [
        {
          profile: $profileId
        }
      ]
    }) {
      id
      expiresAt
      typedData {
        domain {
          name
          chainId
          version
          verifyingContract
        }
        types {
          FollowWithSig {
            name
            type
          }
        }
        value {
          nonce
          deadline
          profileIds
          datas
        }
      }
    }
  }
`;

export const createFollowTypedData = async (profileId: string) => {
  try {
    const { data: { createFollowTypedData } } = await apolloClient.mutate({
     mutation: gql(CREATE_FOLLOW_TYPED_DATA),
     variables: {
       profileId
     },
   });

    return createFollowTypedData;
  } catch (error) {
    console.log(error);
  }
}
