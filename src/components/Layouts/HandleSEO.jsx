import Head from "next/head";
import { bucketImageLinkStorj, trimText } from "@src/utils/utils";
import { getProfileImage } from "@src/services/lens/utils";
import { SITE_URL } from "@src/constants/constants";

// Base frame data template
const frameDataTemplate = {
  version: "next",
  imageUrl: `${SITE_URL}/splash.jpg`,
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
        name: actionName,
        // USE THE CURRENT URL: https://github.com/farcasterxyz/miniapps/discussions/189
        // url: actionUrl,
      },
    },
  };
};

// Helper function to generate common meta tags
const generateMetaTags = (title, description, url, imageUrl, type = "website", imageAlt = "Bonsai") => {
  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:secure_url" content={imageUrl} />
      <meta property="og:image:alt" content={imageAlt} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:locale" content="en_US" />
      <meta property="og:site_name" content="Bonsai" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@onbonsai" />
      <meta name="twitter:creator" content="@onbonsai" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
      <meta name="twitter:image:alt" content={imageAlt} />
      <meta name="twitter:player" content={url} />
      <meta name="twitter:player:width" content="360" />
      <meta name="twitter:player:height" content="560" />
      <meta name="theme-color" content="#141414" />
      <link rel="canonical" href={url} />
      <link rel="llms" href={`${SITE_URL}/llms.txt`} />
    </>
  );
};

const HandleSEO = ({ pageProps }) => {
  const { profile, pageName } = pageProps;

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
        <meta name="viewport" content="initial-scale=1, width=device-width" />
        {generateMetaTags(title, description, profileUrl, ogImageUrl, "profile", `${handle}'s profile picture`)}
        <meta name="fc:frame" content={JSON.stringify(frameData)} />
      </Head>
    );
  }

  // Single publication page
  if (pageName === "singlePublication") {
    const { handle, content, image, postId } = pageProps;
    const title = `Post by ${trimText(`@${handle}`, 45)}`;
    const description = trimText(content, 45);
    const absoluteImageUrl = getAbsoluteImageUrl(image);
    const postUrl = `${SITE_URL}/post/${postId}`;
    const ogImageUrl = `${SITE_URL}/api/og-image?postId=${encodeURIComponent(postId)}`;

    const frameData = createFrameData(
      absoluteImageUrl,
      "Remix",
      `Smart Media by @${handle}`,
      postUrl
    );

    return (
      <Head>
        <meta name="viewport" content="initial-scale=1, width=device-width" />
        {generateMetaTags(title, description, postUrl, ogImageUrl, "article", "Post image")}
        <meta name="fc:frame" content={JSON.stringify(frameData)} />
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
        <meta name="viewport" content="initial-scale=1, width=device-width" />
        {generateMetaTags(title, description, tokenUrl, ogImageUrl, "website", `${club.token.name} token image`)}
        <meta name="fc:frame" content={JSON.stringify(frameData)} />
      </Head>
    );
  }

  // Default page
  const description = "Create autonomous, agentic content on Lens";
  const ogImageUrl = `${SITE_URL}/api/og-image`;

  return (
    <Head>
      <meta name="viewport" content="initial-scale=1, width=device-width" />
      {generateMetaTags("Bonsai", description, SITE_URL, ogImageUrl)}
      <meta name="fc:frame" content={JSON.stringify(frameDataTemplate)} />
    </Head>
  );
};

export default HandleSEO;
