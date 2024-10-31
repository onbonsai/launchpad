import { ApolloClient, ApolloLink, HttpLink, InMemoryCache } from '@apollo/client'

import { apiUrls } from '@constants/apiUrls';

const httpLink = new HttpLink({ uri: apiUrls.lensAPI });

// example how you can pass in the x-access-token into requests using `ApolloLink`
const authLink = new ApolloLink((operation, forward) => {
  // HACK: in case this is being called server-side somewhere
  if (typeof window === 'undefined') return forward(operation);

  // Retrieve the authorization token from local storage.
  // if your using node etc you have to handle your auth different
  const token = localStorage.getItem('lens_accessToken');

  // Use the setContext method to set the HTTP headers.
  operation.setContext({
    headers: {
      'x-access-token': token ? `Bearer ${token}` : ''
    }
  });

  // Call the next link in the middleware chain.
  return forward(operation);
});

export const apolloClient = new ApolloClient({
  ssrMode: typeof window === 'undefined', // set to true for server-side rendering
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
})

export const apolloClientReadOnly = new ApolloClient({
  ssrMode: typeof window === 'undefined', // set to true for server-side rendering
  link: httpLink,
  cache: new InMemoryCache(),
})
