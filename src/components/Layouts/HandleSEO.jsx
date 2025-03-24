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
      name: "Bonsai Smart Media",
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

    let frameData = frameDataTemplate;
    frameData.imageUrl = image;
    frameData.button.title = `View ${trimText(`@${handle}`, 12)}'s Profile`;
    frameData.button.action.name = `${trimText(`@${handle}`, 12)}'s Profile`;
    frameData.button.action.url = `${SITE_URL}/profile/${handle}`;

    return (
      <Head>
        <title>{title}</title>
        <meta name="description" content={description}></meta>
        <meta property="og:title" content={title}></meta>
        <meta property="og:description" content={description}></meta>
        <meta property="og:url" content={SITE_URL}></meta>
        <meta property="og:type" content="website"></meta>
        <meta property="og:image" content={image || "/opengraph-image.jpg"}></meta>
        <meta property="og:image:alt" content="opengraph-image.jpg"></meta>
        <meta property="og:image:width" content="1200"></meta>
        <meta property="og:image:height" content="630"></meta>
        <meta property="og:locale" content="en_IE"></meta>
        <meta property="og:site_name" content="Bonsai Smart Media"></meta>
        <meta name="twitter:creator" content="@onbonsai"></meta>
        <meta name="twitter:card" content="summary_large_image"></meta>
        <meta name="twitter:title" content={title}></meta>
        <meta name="twitter:description" content={description}></meta>
        <meta name="twitter:image" content={image || "/opengraph-image.jpg"}></meta>
        <meta name="theme-color" content="#141414"></meta>
        <meta name="fc:frame" content={JSON.stringify(frameData)} />
      </Head>
    );
  }

  if (pageName === "singlePublication") {
    const { handle, content, image, pubId } = pageProps;
    const title = `Post by ${trimText(`@${handle}`, 45)}`;
    const description = trimText(content, 45);

    let frameData = frameDataTemplate;
    frameData.button.title = `View Post by ${trimText(`@${handle}`, 12)}`;
    frameData.button.action.name = `${trimText(`@${handle}`, 12)}'s Post`;
    frameData.button.action.url = `${SITE_URL}/post/${pubId}`;

    return (
      <Head>
        <title>{title}</title>
        <meta name="description" content={description}></meta>
        <meta property="og:title" content={title}></meta>
        <meta property="og:description" content={description}></meta>
        <meta property="og:url" content={SITE_URL}></meta>
        <meta property="og:type" content="website"></meta>
        <meta property="og:image" content={image || "/opengraph-image.jpg"}></meta>
        <meta property="og:image:alt" content="madfi.png"></meta>
        <meta property="og:image:width" content="1200"></meta>
        <meta property="og:image:height" content="630"></meta>
        <meta property="og:locale" content="en_IE"></meta>
        <meta property="og:site_name" content="Bonsai Smart Media"></meta>
        <meta name="twitter:creator" content="@onbonsai"></meta>
        <meta name="twitter:card" content="summary_large_image"></meta>
        <meta name="twitter:title" content={title}></meta>
        <meta name="twitter:description" content={description}></meta>
        <meta name="twitter:image" content={image || "/opengraph-image.jpg"}></meta>
        <meta name="theme-color" content="#141414"></meta>
        <meta name="fc:frame" content={JSON.stringify(frameData)} />
      </Head>
    );
  }

  if (pageName === "token") {
    const { club } = pageProps;
    const title = `${club.token.name} ($${club.token.symbol})`;
    const description = trimText(`Buy $${club.token.symbol} on Bonsai`, 45);
    let image = club.token.image;

    let frameData = frameDataTemplate;
    frameData.imageUrl = image;
    frameData.button.title = `💰 Trade $${club.token.symbol} 💰`;
    frameData.button.action.name = `Trade $${club.token.symbol}`;
    frameData.button.action.url = `${SITE_URL}/token/${club.clubId}`;

    return (
      <Head>
        <title>{title}</title>
        <meta name="description" content={description}></meta>
        <meta property="og:title" content={title}></meta>
        <meta property="og:description" content={description}></meta>
        <meta property="og:url" content={SITE_URL}></meta>
        <meta property="og:type" content="website"></meta>
        <meta property="og:image" content={image || "/opengraph-image.jpg"}></meta>
        <meta property="og:image:alt" content="bonsai.png"></meta>
        <meta property="og:image:width" content="1200"></meta>
        <meta property="og:image:height" content="630"></meta>
        <meta property="og:locale" content="en_IE"></meta>
        <meta property="og:site_name" content="Bonsai Smart Media"></meta>
        <meta name="twitter:creator" content="@onbonsai"></meta>
        <meta name="twitter:card" content="summary_large_image"></meta>
        <meta name="twitter:title" content={title}></meta>
        <meta name="twitter:description" content={description}></meta>
        <meta name="twitter:image" content={image || "/opengraph-image.jpg"}></meta>
        <meta name="theme-color" content="#141414"></meta>
        <meta name="fc:frame" content={JSON.stringify(frameData)} />
      </Head>
    );
  }

  const description = "Launch a token with social features, vesting, and Uni v4 hooks. AGI needs a token platform.";

  return (
    <Head>
      <title>Bonsai Smart Media</title>
      <meta name="description" content={description}></meta>
      <meta property="og:title" content="Bonsai Smart Media"></meta>
      <meta property="og:description" content={description}></meta>
      <meta property="og:url" content={SITE_URL}></meta>
      <meta property="og:type" content="website"></meta>
      <meta property="og:image" content="/opengraph-image.jpg"></meta>
      <meta property="og:image:alt" content="bonsai.png"></meta>
      <meta property="og:image:width" content="1200"></meta>
      <meta property="og:image:height" content="630"></meta>
      <meta property="og:locale" content="en_IE"></meta>
      <meta property="og:site_name" content="Bonsai Smart Media"></meta>
      <meta name="twitter:creator" content="@onbonsai"></meta>
      <meta name="twitter:card" content="summary_large_image"></meta>
      <meta name="twitter:title" content="Bonsai Smart Media"></meta>
      <meta name="twitter:description" content={description}></meta>
      <meta name="twitter:image" content="/opengraph-image.jpg"></meta>
      <meta name="theme-color" content="#141414"></meta>
      <meta name="fc:frame" content={JSON.stringify(frameDataTemplate)} />
    </Head>
  );
};

export default HandleSEO;
