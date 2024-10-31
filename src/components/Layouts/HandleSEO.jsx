import Head from "next/head";
import { trimText } from "@src/utils/utils";
import { getProfileImage } from "@src/services/lens/utils";
import { SITE_URL } from "@src/constants/constants";

// Base frame data template
const frameDataTemplate = {
  version: "next",
  imageUrl: `${SITE_URL}/frameImage.jpg`,
  button: {
    title: "Remix AI media",
    action: {
      type: "launch_frame",
      name: "Bonsai",
      // url: SITE_URL,
      splashImageUrl: `${SITE_URL}/splash.jpg`,
      splashBackgroundColor: "#000000",
    },
  },
};

// Helper function to create absolute image URL
const getAbsoluteImageUrl = (image) => {
  if (!image) return "https://onbons.ai/opengraph-image.png";
  return image.startsWith('http') ? image : `${SITE_URL}${image}`;
};

// Helper function to create frame data
const createFrameData = (imageUrl, buttonTitle, actionName, actionUrl) => {
  return {
    ...frameDataTemplate,
    imageUrl,
    button: {
      ...frameDataTemplate.button,
      title: buttonTitle,
      action: {
        ...frameDataTemplate.button.action,
        name: actionName.substring(0, 32),
        // USE THE CURRENT URL: https://github.com/farcasterxyz/miniapps/discussions/189
        // url: actionUrl,
      },
    },
  };
};

const HandleSEO = ({ pageProps, query }) => {
  const { profile, pageName } = pageProps || {};

  // Profile page
  if (profile && pageName === "profile") {
    const handle = profile.username?.localName || profile.username || profile.metadata.name;
    const title = trimText(`@${handle}`, 45);
    const image = getProfileImage(profile);
    const description = trimText("Profile on Bonsai", 45);
    const absoluteImageUrl = getAbsoluteImageUrl(image);
    const profileUrl = `${SITE_URL}/profile/${handle}`;
    const ogImageUrl = `${SITE_URL}/api/og-image?handle=${encodeURIComponent(handle)}`;

    const frameData = createFrameData(
      absoluteImageUrl,
      "View Profile",
      `@${handle} on Bonsai`,
      profileUrl
    );

    return (
      <Head>
        {/* Critical SEO tags at the top with high priority */}
        <title key="title">{title}</title>

        {/* Twitter card and site first */}
        <meta name="twitter:card" content="summary_large_image" key="twitter:card" />
        <meta name="twitter:site" content="@onbonsai" key="twitter:site" />

        {/* OG type and URL */}
        <meta property="og:type" content="profile" key="og:type" />
        <meta property="og:url" content={profileUrl} key="og:url" />

        {/* Title and description pairs */}
        <meta property="og:title" content={title} key="og:title" />
        <meta property="og:description" content={description} key="og:description" />
        <meta name="twitter:title" content={title} key="twitter:title" />
        <meta name="twitter:description" content={description} key="twitter:description" />

        {/* All image-related tags grouped together */}
        <meta property="og:image" content={ogImageUrl} key="og:image" />
        <meta property="og:image:secure_url" content={ogImageUrl} key="og:image:secure_url" />
        <meta property="og:image:width" content="1200" key="og:image:width" />
        <meta property="og:image:height" content="630" key="og:image:height" />
        <meta property="og:image:alt" content={`${handle}'s profile picture`} key="og:image:alt" />
        <meta name="twitter:image" content={ogImageUrl} key="twitter:image" />
        <meta name="twitter:image:alt" content={`${handle}'s profile picture`} key="twitter:image:alt" />

        {/* Additional OG tags */}
        <meta property="og:locale" content="en_US" key="og:locale" />
        <meta property="og:site_name" content="Bonsai" key="og:site_name" />

        {/* Non-critical meta tags and links at the bottom */}
        <meta name="viewport" content="initial-scale=1, width=device-width" key="viewport" />
        <meta name="description" content={description} key="description" />
        <meta name="theme-color" content="#141414" key="theme-color" />
        <link rel="canonical" href={profileUrl} key="canonical" />
        <link rel="llms" href={`${SITE_URL}/llms.txt`} key="llms" />
        <meta name="fc:frame" content={JSON.stringify(frameData)} key="fc:frame" />
      </Head>
    );
  }

  // Single publication page
  if (pageName === "singlePublication") {
    const { handle, content, image, postId, uuid, profileImage } = pageProps;
    const title = `Post by ${trimText(`@${handle}`, 45)}`;
    const description = trimText(content, 45);
    const absoluteImageUrl = getAbsoluteImageUrl(image);
    const postUrl = postId ? `${SITE_URL}/post/${postId}` : `${SITE_URL}/media/${uuid}`;
    const ogImageUrl = `${SITE_URL}/api/og-image?postId=${encodeURIComponent(postId)}${image ? `&image=${encodeURIComponent(image)}` : ''}${profileImage ? `&profileImage=${encodeURIComponent(profileImage)}` : ''}`;

    const frameData = createFrameData(
      absoluteImageUrl,
      "Remix",
      `Post by @${handle}`,
      postUrl
    );

    return (
      <Head>
        {/* Critical SEO tags at the top with high priority */}
        <title key="title">{title}</title>

        {/* Twitter card and site first */}
        <meta name="twitter:card" content="summary_large_image" key="twitter:card" />
        <meta name="twitter:site" content="@onbonsai" key="twitter:site" />

        {/* OG type and URL */}
        <meta property="og:type" content="article" key="og:type" />
        <meta property="og:url" content={postUrl} key="og:url" />

        {/* Title and description pairs */}
        <meta property="og:title" content={title} key="og:title" />
        <meta property="og:description" content={description} key="og:description" />
        <meta name="twitter:title" content={title} key="twitter:title" />
        <meta name="twitter:description" content={description} key="twitter:description" />

        {/* All image-related tags grouped together */}
        <meta property="og:image" content={ogImageUrl} key="og:image" />
        <meta property="og:image:secure_url" content={ogImageUrl} key="og:image:secure_url" />
        <meta property="og:image:width" content="1200" key="og:image:width" />
        <meta property="og:image:height" content="630" key="og:image:height" />
        <meta property="og:image:alt" content="Post image" key="og:image:alt" />
        <meta name="twitter:image" content={ogImageUrl} key="twitter:image" />
        <meta name="twitter:image:alt" content="Post image" key="twitter:image:alt" />

        {/* Additional OG tags */}
        <meta property="og:locale" content="en_US" key="og:locale" />
        <meta property="og:site_name" content="Bonsai" key="og:site_name" />

        {/* Non-critical meta tags and links at the bottom */}
        <meta name="viewport" content="initial-scale=1, width=device-width" key="viewport" />
        <meta name="description" content={description} key="description" />
        <meta name="theme-color" content="#141414" key="theme-color" />
        <link rel="canonical" href={postUrl} key="canonical" />
        <link rel="llms" href={`${SITE_URL}/llms.txt`} key="llms" />
        <meta name="fc:frame" content={JSON.stringify(frameData)} key="fc:frame" />
      </Head>
    );
  }

  // Token page
  if (pageName === "token") {
    const { club } = pageProps;
    const title = `${club.token.name} ($${club.token.symbol})`;
    const description = trimText(`Buy $${club.token.symbol} on Bonsai`, 45);
    const absoluteImageUrl = getAbsoluteImageUrl(club.token.image);
    const tokenUrl = `${SITE_URL}/token/${club.chain}/${club.tokenAddress}`;
    const ogImageUrl = `${SITE_URL}/api/og-image?image=${encodeURIComponent(absoluteImageUrl)}`;

    const frameData = createFrameData(
      absoluteImageUrl,
      `💰 Trade $${club.token.symbol} 💰`,
      `Trade $${club.token.symbol}`,
      tokenUrl
    );

    return (
      <Head>
        {/* Critical SEO tags at the top with high priority */}
        <title key="title">{title}</title>

        {/* Twitter card and site first */}
        <meta name="twitter:card" content="summary_large_image" key="twitter:card" />
        <meta name="twitter:site" content="@onbonsai" key="twitter:site" />

        {/* OG type and URL */}
        <meta property="og:type" content="website" key="og:type" />
        <meta property="og:url" content={tokenUrl} key="og:url" />

        {/* Title and description pairs */}
        <meta property="og:title" content={title} key="og:title" />
        <meta property="og:description" content={description} key="og:description" />
        <meta name="twitter:title" content={title} key="twitter:title" />
        <meta name="twitter:description" content={description} key="twitter:description" />

        {/* All image-related tags grouped together */}
        <meta property="og:image" content={ogImageUrl} key="og:image" />
        <meta property="og:image:secure_url" content={ogImageUrl} key="og:image:secure_url" />
        <meta property="og:image:width" content="1200" key="og:image:width" />
        <meta property="og:image:height" content="630" key="og:image:height" />
        <meta property="og:image:alt" content={`${club.token.name} token image`} key="og:image:alt" />
        <meta name="twitter:image" content={ogImageUrl} key="twitter:image" />
        <meta name="twitter:image:alt" content={`${club.token.name} token image`} key="twitter:image:alt" />

        {/* Additional OG tags */}
        <meta property="og:locale" content="en_US" key="og:locale" />
        <meta property="og:site_name" content="Bonsai" key="og:site_name" />

        {/* Non-critical meta tags and links at the bottom */}
        <meta name="viewport" content="initial-scale=1, width=device-width" key="viewport" />
        <meta name="description" content={description} key="description" />
        <meta name="theme-color" content="#141414" key="theme-color" />
        <link rel="canonical" href={tokenUrl} key="canonical" />
        <link rel="llms" href={`${SITE_URL}/llms.txt`} key="llms" />
        <meta name="fc:frame" content={JSON.stringify(frameData)} key="fc:frame" />
      </Head>
    );
  }

  // Default page
  const description = "Create & monetize evolving media";

  // Consider Signup / Budget flow
  const frameData = { ...frameDataTemplate };
  if (!!query?.onboard) {
    frameData.button.title = "Signup";
  } else if (query?.modal === "budget") {
    frameData.button.title = "Approve allowance";
  }

  return (
    <Head>
      {/* Critical SEO tags at the top with high priority */}
      <title key="title">Bonsai</title>

      {/* Twitter card and site first */}
      <meta name="twitter:card" content="summary_large_image" key="twitter:card" />
      <meta name="twitter:site" content="@onbonsai" key="twitter:site" />

      {/* OG type and URL */}
      <meta property="og:type" content="website" key="og:type" />
      <meta property="og:url" content={SITE_URL} key="og:url" />

      {/* Title and description pairs */}
      <meta property="og:title" content="Bonsai" key="og:title" />
      <meta property="og:description" content={description} key="og:description" />
      <meta name="twitter:title" content="Bonsai" key="twitter:title" />
      <meta name="twitter:description" content={description} key="twitter:description" />

      {/* All image-related tags grouped together */}
      <meta property="og:image" content="https://app.onbons.ai/opengraph-image.jpg" key="og:image" />
      <meta property="og:image:secure_url" content="https://app.onbons.ai/opengraph-image.jpg" key="og:image:secure_url" />
      <meta property="og:image:width" content="1200" key="og:image:width" />
      <meta property="og:image:height" content="630" key="og:image:height" />
      <meta property="og:image:alt" content="Bonsai" key="og:image:alt" />
      <meta name="twitter:image" content="https://app.onbons.ai/opengraph-image.jpg" key="twitter:image" />
      <meta name="twitter:image:alt" content="Bonsai" key="twitter:image:alt" />

      {/* Additional OG tags */}
      <meta property="og:locale" content="en_US" key="og:locale" />
      <meta property="og:site_name" content="Bonsai" key="og:site_name" />

      {/* Non-critical meta tags and links at the bottom */}
      <meta name="viewport" content="initial-scale=1, width=device-width" key="viewport" />
      <meta name="description" content={description} key="description" />
      <meta name="theme-color" content="#141414" key="theme-color" />
      <link rel="canonical" href={SITE_URL} key="canonical" />
      <link rel="llms" href={`${SITE_URL}/llms.txt`} key="llms" />
      <meta name="fc:frame" content={JSON.stringify(frameData)} key="fc:frame" />
    </Head>
  );
};

export default HandleSEO;
