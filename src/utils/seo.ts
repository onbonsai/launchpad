import { SITE_URL } from "@src/constants/constants";
import { trimText } from "@src/utils/utils";

export interface SEOProps {
  // Basic SEO properties
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: string;
  
  // Page-specific properties
  handle?: string;
  pubId?: string;
  clubId?: string;
  club?: any;
  
  // Generated properties for meta tags
  ogTitle?: string;
  ogDescription?: string;
  ogUrl?: string;
  ogType?: string;
  ogImage?: string;
  ogImageSecureUrl?: string;
  ogImageAlt?: string;
  ogImageWidth?: string;
  ogImageHeight?: string;
  ogLocale?: string;
  ogSiteName?: string;
  
  // Twitter properties
  twitterCard?: string;
  twitterSite?: string;
  twitterCreator?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  twitterImageAlt?: string;
}

export const generateSEO = ({
  title,
  description,
  image = `${SITE_URL}/opengraph-image.jpg`,
  url = SITE_URL,
  type = "website",
  handle,
  pubId,
  clubId,
  club,
}: SEOProps) => {
  // Ensure image URL is absolute
  const absoluteImageUrl = image ? (image.startsWith('http') ? image : `${SITE_URL}${image}`) : `${SITE_URL}/opengraph-image.jpg`;
  
  // Generate OG image URL based on page type
  let ogImageUrl = `${SITE_URL}/api/og-image`;
  if (handle) {
    ogImageUrl = `${SITE_URL}/api/og-image?handle=${encodeURIComponent(handle)}`;
  } else if (pubId) {
    ogImageUrl = `${SITE_URL}/api/og-image?pubId=${encodeURIComponent(pubId)}`;
  } else if (clubId || club) {
    const imageParam = club?.token?.image ? encodeURIComponent(club.token.image) : encodeURIComponent(absoluteImageUrl);
    ogImageUrl = `${SITE_URL}/api/og-image?image=${imageParam}`;
  }

  return {
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    ogUrl: url,
    ogType: type,
    ogImage: ogImageUrl,
    ogImageSecureUrl: ogImageUrl,
    ogImageAlt: title,
    ogImageWidth: "1200",
    ogImageHeight: "630",
    ogLocale: "en_US",
    ogSiteName: "Bonsai",
    twitterCard: "summary_large_image",
    twitterSite: "@onbonsai",
    twitterCreator: "@onbonsai",
    twitterTitle: title,
    twitterDescription: description,
    twitterImage: ogImageUrl,
    twitterImageAlt: title,
  };
};

export const generateProfileSEO = (profile: any) => {
  const handle = profile.username?.localName || profile.username || profile.metadata.name;
  const title = trimText(`@${handle}`, 45);
  const description = trimText("Profile on Bonsai", 45);
  const url = `${SITE_URL}/profile/${handle}`;
  
  return generateSEO({
    title,
    description,
    url,
    type: "profile",
    handle,
  });
};

export const generatePublicationSEO = (handle: string, content: string, pubId: string, image?: string) => {
  const title = `Post by ${trimText(`@${handle}`, 45)}`;
  const description = trimText(content, 45);
  const url = `${SITE_URL}/post/${pubId}`;
  
  return generateSEO({
    title,
    description,
    image,
    url,
    type: "article",
    pubId,
  });
};

export const generateTokenSEO = (club: any) => {
  const title = `${club.token.name} ($${club.token.symbol})`;
  const description = trimText(`Buy $${club.token.symbol} on Bonsai`, 45);
  const url = `${SITE_URL}/token/${club.clubId}`;
  
  return generateSEO({
    title,
    description,
    url,
    type: "website",
    clubId: club.clubId,
    club,
  });
}; 