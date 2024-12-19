import Head from "next/head";
import { formatProfilePicture } from "@madfi/widgets-react";
import { bucketImageLinkStorj, trimText } from "@src/utils/utils";

const SITE_URL = "https://launch.bonsai.meme";

const HandleSEO = ({ pageProps }) => {
  const { profile, pageName } = pageProps;

  if (profile && pageName === "profile") {
    const handle = profile.handle?.localName || profile.username || profile.profileHandle;
    const title = trimText(`@${handle}`, 45);
    const image = formatProfilePicture(profile).metadata.picture.url;
    const description = trimText("Profile on the Bonsai Launchpad", 45);

    return (
      <Head>
        <title>{title}</title>
        <meta name="description" content={description}></meta>
        <meta property="og:title" content={title}></meta>
        <meta property="og:description" content={description}></meta>
        <meta property="og:url" content={SITE_URL}></meta>
        <meta property="og:type" content="website"></meta>
        <meta property="og:image" content={image}></meta>
        <meta property="og:image:alt" content="madfi.png"></meta>
        <meta property="og:image:width" content="1200"></meta>
        <meta property="og:image:height" content="630"></meta>
        <meta property="og:locale" content="en_IE"></meta>
        <meta property="og:site_name" content="Launchpad | bonsai.meme"></meta>
        <meta name="twitter:creator" content="@bonsaitoken404"></meta>
        <meta name="twitter:card" content="summary_large_image"></meta>
        <meta name="twitter:title" content={title}></meta>
        <meta name="twitter:description" content={description}></meta>
        <meta name="twitter:image" content={image}></meta>
        <meta name="theme-color" content="#141414"></meta>
      </Head>
    );
  }

  if (pageName === "singlePublication") {
    const { handle, content, image } = pageProps;
    const title = `Post by ${trimText(`@${handle}`, 45)}`;
    const description = trimText(content, 45);

    return (
      <Head>
        <title>{title}</title>
        <meta name="description" content={description}></meta>
        <meta property="og:title" content={title}></meta>
        <meta property="og:description" content={description}></meta>
        <meta property="og:url" content={SITE_URL}></meta>
        <meta property="og:type" content="website"></meta>
        <meta property="og:image" content={image || ""}></meta>
        <meta property="og:image:alt" content="madfi.png"></meta>
        <meta property="og:image:width" content="1200"></meta>
        <meta property="og:image:height" content="630"></meta>
        <meta property="og:locale" content="en_IE"></meta>
        <meta property="og:site_name" content="Launchpad | bonsai.meme"></meta>
        <meta name="twitter:creator" content="@bonsaitoken404"></meta>
        <meta name="twitter:card" content="summary_large_image"></meta>
        <meta name="twitter:title" content={title}></meta>
        <meta name="twitter:description" content={description}></meta>
        <meta name="twitter:image" content={image || ""}></meta>
        <meta name="theme-color" content="#141414"></meta>
      </Head>
    );
  }

  if (pageName === "token") {
    const { club } = pageProps;
    const title = `${club.token.name} ($${club.token.symbol})`;
    const description = trimText(`Buy $${club.token.symbol} on the Bonsai Launchpad`, 45);
    let image = club.token.image;

    return (
      <Head>
        <title>{title}</title>
        <meta name="description" content={description}></meta>
        <meta property="og:title" content={title}></meta>
        <meta property="og:description" content={description}></meta>
        <meta property="og:url" content={SITE_URL}></meta>
        <meta property="og:type" content="website"></meta>
        <meta property="og:image" content={image}></meta>
        <meta property="og:image:alt" content="bonsai.png"></meta>
        <meta property="og:image:width" content="1200"></meta>
        <meta property="og:image:height" content="630"></meta>
        <meta property="og:locale" content="en_IE"></meta>
        <meta property="og:site_name" content="Launchpad | bonsai.meme"></meta>
        <meta name="twitter:creator" content="@bonsaitoken404"></meta>
        <meta name="twitter:card" content="summary_large_image"></meta>
        <meta name="twitter:title" content={title}></meta>
        <meta name="twitter:description" content={description}></meta>
        <meta name="twitter:image" content={image}></meta>
        <meta name="theme-color" content="#141414"></meta>
      </Head>
    );
  }

  const description = "Launch a token with built-in community features and your own onchain agent.";

  return (
    <Head>
      <title>Launchpad | bonsai.meme</title>
      <meta name="description" content={description}></meta>
      <meta property="og:title" content="Launchpad | bonsai.meme"></meta>
      <meta property="og:description" content={description}></meta>
      <meta property="og:url" content={SITE_URL}></meta>
      <meta property="og:type" content="website"></meta>
      <meta
        property="og:image"
        content="/opengraph-image.jpg"
      ></meta>
      <meta property="og:image:alt" content="bonsai.png"></meta>
      <meta property="og:image:width" content="1200"></meta>
      <meta property="og:image:height" content="630"></meta>
      <meta property="og:locale" content="en_IE"></meta>
      <meta property="og:site_name" content="Launchpad | bonsai.meme"></meta>
      <meta name="twitter:creator" content="@bonsaitoken404"></meta>
      <meta name="twitter:card" content="summary_large_image"></meta>
      <meta name="twitter:title" content="Launchpad | bonsai.meme"></meta>
      <meta name="twitter:description" content={description}></meta>
      <meta
        name="twitter:image"
        content="/twitter-image.jpg"
      ></meta>
      <meta name="theme-color" content="#141414"></meta>
    </Head>
  );
};

export default HandleSEO;