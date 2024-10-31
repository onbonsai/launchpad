import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client'

import { apiUrls } from '@constants/apiUrls';

const httpLink = new HttpLink({ uri: apiUrls.lensAPI });

export const apolloClient = new ApolloClient({
  ssrMode: typeof window === 'undefined', // set to true for server-side rendering
  link: httpLink,
  cache: new InMemoryCache(),
})

export const apolloClientReadOnly = new ApolloClient({
  ssrMode: typeof window === 'undefined', // set to true for server-side rendering
  link: httpLink,
  cache: new InMemoryCache(),
})
