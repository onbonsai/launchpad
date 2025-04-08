import Head from "next/head";
import { SITE_URL } from "@constants/constants";
import { useRouter } from "next/router";

const HandleSEO = ({ pageProps }) => {
  const router = useRouter();
  const { handle, publicationId, tokenAddress, chain } = router.query;

  // Get the current URL
  const currentUrl = `${SITE_URL}${router.asPath}`;

  // Default values
  const defaultTitle = "Bonsai Smart Media";
  const defaultDescription = "Bonsai Smart Media - Your decentralized content platform";
  const defaultImageUrl = `${SITE_URL}/opengraph-image.jpg`;

  // Determine page type and set meta tags accordingly
  let title = defaultTitle;
  let description = defaultDescription;
  let imageUrl = defaultImageUrl;

  if (handle) {
    // Profile page
    title = `${handle} | Bonsai Smart Media`;
    description = `View ${handle}'s profile on Bonsai Smart Media`;
    imageUrl = `${SITE_URL}/api/seo/profile-image?handle=${handle}`;
  } else if (publicationId) {
    // Single publication page
    title = `${pageProps?.publication?.title || 'Publication'} | Bonsai Smart Media`;
    description = pageProps?.publication?.description || defaultDescription;
    imageUrl = `${SITE_URL}/api/seo/publication-image?publicationId=${publicationId}`;
  } else if (tokenAddress && chain) {
    // Token page
    title = `${pageProps?.club?.token?.name || 'Token'} | Bonsai Smart Media`;
    description = pageProps?.club?.token?.description || defaultDescription;
    imageUrl = pageProps?.club?.token?.image || defaultImageUrl;
  }

  return (
    <Head>
      {/* OpenGraph Meta Tags */}
      <meta property="og:url" content={currentUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      
      {/* Twitter Meta Tags */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:site" content="@onbonsai" />
      <meta property="twitter:creator" content="@onbonsai" />
      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={imageUrl} />
      <meta property="twitter:image:alt" content={title} />
      
      {/* Other Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
    </Head>
  );
};

// Add getInitialProps to ensure server-side rendering
HandleSEO.getInitialProps = async (ctx) => {
  const { req, res, query } = ctx;
  
  // Set cache control headers for SEO images
  if (res) {
    res.setHeader(
      'Cache-Control',
      'public, max-age=31536000, immutable'
    );
  }

  return {
    pageProps: {
      ...ctx.pageProps,
      seo: {
        title: query.title || 'Bonsai Smart Media',
        description: query.description || 'Bonsai Smart Media - Your decentralized content platform',
        image: query.image || `${SITE_URL}/opengraph-image.jpg`,
      },
    },
  };
};

export default HandleSEO;
