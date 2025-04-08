import Head from "next/head";
import { bucketImageLinkStorj, trimText } from "@src/utils/utils";
import { getProfileImage } from "@src/services/lens/utils";
import { SITE_URL } from "@src/constants/constants";

const frameDataTemplate = {
  version: "next",
  imageUrl: `${SITE_URL}/splash.jpg`,
  button: {
    title: "💰 Start Trading 💰",
    action: {
      type: "launch_frame",
      name: "Bonsai",
      url: SITE_URL,
      splashImageUrl: `${SITE_URL}/splash.jpg`,
      splashBackgroundColor: "#000000",
    },
  },
};

const HandleSEO = ({ pageProps }) => {
  const { profile, pageName } = pageProps;

  if (profile && pageName === "profile") {
    const handle = profile.username?.localName || profile.username || profile.metadata.name;
    const title = trimText(`@${handle}`, 45);
    const image = getProfileImage(profile);
    const description = trimText("Profile on Bonsai", 45);
    const absoluteImageUrl = image ? (image.startsWith('http') ? image : `${SITE_URL}${image}`) : `${SITE_URL}/opengraph-image.jpg`;

    let frameData = frameDataTemplate;
    frameData.imageUrl = absoluteImageUrl;
    frameData.button.title = `View ${trimText(`@${handle}`, 12)}'s Profile`;
    frameData.button.action.name = `${trimText(`@${handle}`, 12)}'s Profile`;
    frameData.button.action.url = `${SITE_URL}/profile/${handle}`;

    return (
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={`${SITE_URL}/profile/${handle}`} />
        <meta property="og:type" content="profile" />
        <meta property="og:image" content={`${SITE_URL}/api/og-image?title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}&type=profile&handle=${handle}&image=${encodeURIComponent(absoluteImageUrl)}`} />
        <meta property="og:image:secure_url" content={`${SITE_URL}/api/og-image?title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}&type=profile&handle=${handle}&image=${encodeURIComponent(absoluteImageUrl)}`} />
        <meta property="og:image:alt" content={`${handle}'s profile picture`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:locale" content="en_US" />
        <meta property="og:site_name" content="Bonsai" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@onbonsai" />
        <meta name="twitter:creator" content="@onbonsai" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={`${SITE_URL}/api/og-image?title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}&type=profile&handle=${handle}&image=${encodeURIComponent(absoluteImageUrl)}`} />
        <meta name="twitter:image:alt" content={`${handle}'s profile picture`} />
        <meta name="theme-color" content="#141414" />
        <meta name="fc:frame" content={JSON.stringify(frameData)} />
      </Head>
    );
  }

  if (pageName === "singlePublication") {
    const { handle, content, image, pubId } = pageProps;
    const title = `Post by ${trimText(`@${handle}`, 45)}`;
    const description = trimText(content, 45);
    const absoluteImageUrl = image ? (image.startsWith('http') ? image : `${SITE_URL}${image}`) : `${SITE_URL}/opengraph-image.jpg`;

    let frameData = frameDataTemplate;
    frameData.imageUrl = absoluteImageUrl;
    frameData.button.title = `View Post by ${trimText(`@${handle}`, 12)}`;
    frameData.button.action.name = `${trimText(`@${handle}`, 12)}'s Post`;
    frameData.button.action.url = `${SITE_URL}/post/${pubId}`;

    return (
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={`${SITE_URL}/post/${pubId}`} />
        <meta property="og:type" content="article" />
        <meta property="og:image" content={`${SITE_URL}/api/og-image?title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}&type=article&pubId=${pubId}&image=${encodeURIComponent(absoluteImageUrl)}`} />
        <meta property="og:image:secure_url" content={`${SITE_URL}/api/og-image?title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}&type=article&pubId=${pubId}&image=${encodeURIComponent(absoluteImageUrl)}`} />
        <meta property="og:image:alt" content="Post image" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:locale" content="en_US" />
        <meta property="og:site_name" content="Bonsai" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@onbonsai" />
        <meta name="twitter:creator" content="@onbonsai" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={`${SITE_URL}/api/og-image?title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}&type=article&pubId=${pubId}&image=${encodeURIComponent(absoluteImageUrl)}`} />
        <meta name="twitter:image:alt" content="Post image" />
        <meta name="theme-color" content="#141414" />
        <meta name="fc:frame" content={JSON.stringify(frameData)} />
      </Head>
    );
  }

  if (pageName === "token") {
    const { club } = pageProps;
    const title = `${club.token.name} ($${club.token.symbol})`;
    const description = trimText(`Buy $${club.token.symbol} on Bonsai`, 45);
    const absoluteImageUrl = club.token.image ? (club.token.image.startsWith('http') ? club.token.image : `${SITE_URL}${club.token.image}`) : `${SITE_URL}/opengraph-image.jpg`;

    let frameData = frameDataTemplate;
    frameData.imageUrl = absoluteImageUrl;
    frameData.button.title = `💰 Trade $${club.token.symbol} 💰`;
    frameData.button.action.name = `Trade $${club.token.symbol}`;
    frameData.button.action.url = `${SITE_URL}/token/${club.clubId}`;

    return (
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={`${SITE_URL}/token/${club.clubId}`} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={`${SITE_URL}/api/og-image?title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}&type=token&tokenSymbol=${club.token.symbol}&image=${encodeURIComponent(absoluteImageUrl)}`} />
        <meta property="og:image:secure_url" content={`${SITE_URL}/api/og-image?title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}&type=token&tokenSymbol=${club.token.symbol}&image=${encodeURIComponent(absoluteImageUrl)}`} />
        <meta property="og:image:alt" content={`${club.token.name} token image`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:locale" content="en_US" />
        <meta property="og:site_name" content="Bonsai" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@onbonsai" />
        <meta name="twitter:creator" content="@onbonsai" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={`${SITE_URL}/api/og-image?title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}&type=token&tokenSymbol=${club.token.symbol}&image=${encodeURIComponent(absoluteImageUrl)}`} />
        <meta name="twitter:image:alt" content={`${club.token.name} token image`} />
        <meta name="theme-color" content="#141414" />
        <meta name="fc:frame" content={JSON.stringify(frameData)} />
      </Head>
    );
  }

  const description = "Create AI-powered content on Bonsai — build and monetize your own Smart Media in minutes.";
  const defaultImageUrl = `${SITE_URL}/opengraph-image.jpg`;

  return (
    <Head>
      <title>Bonsai</title>
      <meta name="description" content={description} />
      <meta property="og:title" content="Bonsai" />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={SITE_URL} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={`${SITE_URL}/api/og-image?title=Bonsai&description=${encodeURIComponent(description)}&type=website&image=${encodeURIComponent(defaultImageUrl)}`} />
      <meta property="og:image:secure_url" content={`${SITE_URL}/api/og-image?title=Bonsai&description=${encodeURIComponent(description)}&type=website&image=${encodeURIComponent(defaultImageUrl)}`} />
      <meta property="og:image:alt" content="Bonsai" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:locale" content="en_US" />
      <meta property="og:site_name" content="Bonsai" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@onbonsai" />
      <meta name="twitter:creator" content="@onbonsai" />
      <meta name="twitter:title" content="Bonsai" />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={`${SITE_URL}/api/og-image?title=Bonsai&description=${encodeURIComponent(description)}&type=website&image=${encodeURIComponent(defaultImageUrl)}`} />
      <meta name="twitter:image:alt" content="Bonsai" />
      <meta name="theme-color" content="#141414" />
      <meta name="fc:frame" content={JSON.stringify(frameDataTemplate)} />
    </Head>
  );
};

export default HandleSEO;
