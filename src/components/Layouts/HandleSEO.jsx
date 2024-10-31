import Head from "next/head";
import { formatProfilePicture } from "@madfi/widgets-react";
import { MADFI_SITE_URL, MADFI_BOUNTIES_URL, MADFI_BANNER_IMAGE_SMALL, IS_PRODUCTION } from "@src/constants/constants";
import { bucketImageLinkStorj, trimText } from "@src/utils/utils";
import { storjGatewayURL } from "@src/utils/storj";

const HandleSEO = ({ pageProps }) => {
  const { bounty, profile, pageName } = pageProps;

  if (bounty) {
    const openGraphImage = bounty.attachments?.length
      ? storjGatewayURL(bounty.attachments[0].item ? bounty.attachments[0].item : bounty.attachments[0])
      : MADFI_BANNER_IMAGE_SMALL;
    return (
      <Head>
        <title>{`MadFi | ${trimText(bounty.title, 45)}`}</title>
        <meta name="description" content={trimText(bounty.description, 150)}></meta>
        <meta property="og:title" content={`MadFi | ${trimText(bounty.title, 45)}`}></meta>
        <meta property="og:description" content={trimText(bounty.description, 150)}></meta>
        <meta property="og:url" content={`${MADFI_BOUNTIES_URL}/${bounty._id}`}></meta>
        <meta property="og:type" content="website"></meta>
        <meta property="og:image" content={openGraphImage}></meta>
        <meta property="og:image:alt" content="madfi.png"></meta>
        <meta property="og:image:width" content="1200"></meta>
        <meta property="og:image:height" content="630"></meta>
        <meta property="og:locale" content="en_IE"></meta>
        <meta property="og:site_name" content="MadFi"></meta>
        <meta name="twitter:creator" content="@madfiprotocol"></meta>
        <meta name="twitter:card" content="summary_large_image"></meta>
        <meta name="twitter:title" content={`MadFi | ${trimText(bounty.title, 45)}`}></meta>
        <meta name="twitter:description" content={trimText(bounty.description, 150)}></meta>
        <meta name="twitter:image" content={openGraphImage}></meta>
        <meta name="theme-color" content="#141414"></meta>
      </Head>
    );
  }

  if (profile && pageName === "profile") {
    const handle = profile.handle?.localName || profile.username || profile.profileHandle;
    const title = `MadFi | ${trimText(`@${handle}`, 45)}`;
    const image = formatProfilePicture(profile).metadata.picture.url;
    const description = trimText(
      `check out this profile on MadFi 💸`,
      150,
    );

    return (
      <Head>
        <title>{title}</title>
        <meta name="description" content={description}></meta>
        <meta property="og:title" content={title}></meta>
        <meta property="og:description" content={description}></meta>
        <meta property="og:url" content={MADFI_SITE_URL}></meta>
        <meta property="og:type" content="website"></meta>
        <meta property="og:image" content={image}></meta>
        <meta property="og:image:alt" content="madfi.png"></meta>
        <meta property="og:image:width" content="1200"></meta>
        <meta property="og:image:height" content="630"></meta>
        <meta property="og:locale" content="en_IE"></meta>
        <meta property="og:site_name" content="MadFi"></meta>
        <meta name="twitter:creator" content="@madfiprotocol"></meta>
        <meta name="twitter:card" content="summary_large_image"></meta>
        <meta name="twitter:title" content={title}></meta>
        <meta name="twitter:description" content={description}></meta>
        <meta name="twitter:image" content={image}></meta>
        <meta name="theme-color" content="#141414"></meta>
      </Head>
    );
  }

  if (pageName === "singlePublication") {
    const { pubId, handle, content } = pageProps;
    const title = `MadFi | Post by ${trimText(`@${handle}`, 45)}`;
    const description = trimText(content || `View post by ${handle} on MadFi`, 150);
    let image = bucketImageLinkStorj(pubId);

    return (
      <Head>
        <title>{title}</title>
        <meta name="description" content={description}></meta>
        <meta property="og:title" content={title}></meta>
        <meta property="og:description" content={description}></meta>
        <meta property="og:url" content={MADFI_SITE_URL}></meta>
        <meta property="og:type" content="website"></meta>
        <meta property="og:image" content={image}></meta>
        <meta property="og:image:alt" content="madfi.png"></meta>
        <meta property="og:image:width" content="1200"></meta>
        <meta property="og:image:height" content="630"></meta>
        <meta property="og:locale" content="en_IE"></meta>
        <meta property="og:site_name" content="MadFi"></meta>
        <meta name="twitter:creator" content="@madfiprotocol"></meta>
        <meta name="twitter:card" content="summary_large_image"></meta>
        <meta name="twitter:title" content={title}></meta>
        <meta name="twitter:description" content={description}></meta>
        <meta name="twitter:image" content={image}></meta>
        <meta name="theme-color" content="#141414"></meta>
      </Head>
    );
  }

  const description = "MadFi enables creators to grow, monetize & reward their communities in crypto social.";

  return (
    <Head>
      <title>MadFi | Make Mad Money</title>
      <meta name="description" content={description}></meta>
      <meta property="og:title" content="MadFi"></meta>
      <meta property="og:description" content={description}></meta>
      <meta property="og:url" content={MADFI_SITE_URL}></meta>
      <meta property="og:type" content="website"></meta>
      <meta
        property="og:image"
        content="https://link.storjshare.io/raw/jvnvg6pove7qyyfbyo5hqggdis6a/misc%2Fmadfi-banner.jpeg"
      ></meta>
      <meta property="og:image:alt" content="madfi.png"></meta>
      <meta property="og:image:width" content="1200"></meta>
      <meta property="og:image:height" content="630"></meta>
      <meta property="og:locale" content="en_IE"></meta>
      <meta property="og:site_name" content="MadFi"></meta>
      <meta name="twitter:creator" content="@madfiprotocol"></meta>
      <meta name="twitter:card" content="summary_large_image"></meta>
      <meta name="twitter:title" content="MadFi"></meta>
      <meta name="twitter:description" content={description}></meta>
      <meta
        name="twitter:image"
        content="https://link.storjshare.io/raw/jvnvg6pove7qyyfbyo5hqggdis6a/misc%2Fmadfi-banner.jpeg"
      ></meta>
      <meta name="theme-color" content="#141414"></meta>
    </Head>
  );
};

export default HandleSEO;