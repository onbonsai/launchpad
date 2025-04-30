import { type SessionClient, uri, postId, type URI, BigDecimal, txHash, evmAddress, BlockchainData } from "@lens-protocol/client";
import { fetchPost, post } from "@lens-protocol/client/actions";
import {
  textOnly,
  image,
  video,
  type MediaImageMimeType,
  type MediaVideoMimeType,
  MetadataLicenseType,
  MetadataAttributeType,
  TextOnlyMetadata,
  ImageMetadata,
  VideoMetadata,
  EvmAddress,
} from "@lens-protocol/metadata";
import { handleOperationWith } from "@lens-protocol/client/viem";
import { immutable, WalletAddressAcl } from "@lens-chain/storage-client";
import { franc } from 'franc';
import { storageClient } from "./client";
import { LENS_BONSAI_DEFAULT_FEED, LENS_CHAIN_ID } from "../madfi/utils";
import { parseBase64Image } from "@src/utils/utils";
import { lensClient } from "./client";

interface SimpleCollect {
  simpleCollect: {
    payToCollect: {
      amount?: {
        currency: EvmAddress;
        value: BigDecimal;
      };
      recipients?: {
        address: EvmAddress;
        percent: number;
      }[];
      referralShare?: number;
      collectLimit?: number;
      endsAt?: string;
    }
  }
}

interface UnknownAction {
  unknown: {
    params?: {
      raw: {
        key: BlockchainData;
        data: BlockchainData;
      };
    }[] | null | undefined;
    address: EvmAddress;
  }
}

export type Action = SimpleCollect | UnknownAction;

interface PostParams {
  text: string;
  image?: {
    url: string;
    type: MediaImageMimeType;
  };
  video?: {
    url: string;
    cover?: string;
    type: MediaVideoMimeType;
  };
  template?: {
    apiUrl: string;
    acl: WalletAddressAcl;
    category: string;
    name: string;
    options: { isCanvas?: boolean };
  };
  tokenAddress?: `0x${string}`;
  remix?: string;
  actions?: Action[];
}

const baseMetadata = {
  attributes: ({ apiUrl, category, name, options: { isCanvas } }: { apiUrl: string; category: string; name: string, options: { isCanvas?: boolean } }) => [
    {
      type: MetadataAttributeType.STRING as const,
      key: "templateCategory",
      value: category
    },
    {
      type: MetadataAttributeType.STRING as const,
      key: "template",
      value: name,
    },
    {
      type: MetadataAttributeType.STRING as const,
      key: "apiUrl",
      value: apiUrl
    },
    ...(isCanvas ? [{
      type: MetadataAttributeType.BOOLEAN as const,
      key: "isCanvas",
      value: 'true'
    }] : [])
  ]
}

const detectLocale = (text: string): string => {
  const langCode = franc(text);

  // Map franc codes to ISO 639-1
  const langMap: Record<string, string> = {
    'eng': 'en',
    'spa': 'es',
    'fra': 'fr',
    'deu': 'de',
    'ita': 'it',
    'por': 'pt',
    'rus': 'ru',
    'jpn': 'ja',
    'kor': 'ko',
    'zho': 'zh',
    'cmn': 'zh', // Mandarin
    'ara': 'ar', // Arabic
    'hin': 'hi', // Hindi
    'ben': 'bn', // Bengali
    'tur': 'tr', // Turkish
    'vie': 'vi', // Vietnamese
    'tha': 'th', // Thai
    'ind': 'id', // Indonesian
    'msa': 'ms', // Malay
    'heb': 'he', // Hebrew
    'pol': 'pl', // Polish
    'ukr': 'uk', // Ukrainian
    'swe': 'sv', // Swedish
    'nld': 'nl', // Dutch
    'fin': 'fi', // Finnish
    'dan': 'da', // Danish
    'nor': 'no', // Norwegian
    'ces': 'cs', // Czech
    'ron': 'ro', // Romanian
    'ell': 'el', // Greek
  };

  return langMap[langCode] || 'en'; // Default to English if unknown
};

export const formatMetadata = (params: PostParams): TextOnlyMetadata | ImageMetadata | VideoMetadata => {
  // smart media attributes
  const attributes = !!params.template ? baseMetadata.attributes(params.template) : undefined;
  const locale = detectLocale(params.text);

  // include token address in attributes for indexing
  if (!!params.template && !!params.tokenAddress) {
    attributes!.push({
      type: MetadataAttributeType.STRING as const,
      key: "tokenAddress",
      value: params.tokenAddress as string,
    });
  }

  // include the remix postId for reference
  if (!!params.template && !!params.remix) {
    attributes!.push({
      type: MetadataAttributeType.STRING as const,
      key: "remix",
      value: params.remix as string,
    });
  }

  if (!(params.image || params.video)) {
    return textOnly({
      content: params.text,
      attributes,
      locale,
    });
  } else if (params.image && !params.video) {
    return image({
      content: params.text,
      image: {
        item: params.image.url,
        type: params.image.type,
        altTag: params.text?.substring(0, 10),
        license: MetadataLicenseType.CCO,
      },
      attributes,
      locale,
    });
  } else if (params.video) {
    return video({
      content: params.text,
      video: {
        item: params.video.url,
        cover: params.image?.url,
        type: params.video.type,
        license: MetadataLicenseType.CCO,
      },
      attributes,
      locale,
    });
  }

  throw new Error("formatMetadata:: Missing property for metadata");
}

export const uploadMetadata = async (params: PostParams): Promise<URI> => {
  const metadata = formatMetadata(params);
  const acl = params.template?.acl || immutable(LENS_CHAIN_ID);
  const { uri: hash } = await storageClient.uploadAsJson(metadata, { acl });
  return uri(hash);
};

export const uploadImageBase64 = async (
  image: string,
  _acl?: WalletAddressAcl
): Promise<{ uri: URI, type: MediaImageMimeType }> => {
  const file = parseBase64Image(image) as File;
  const acl = _acl || immutable(LENS_CHAIN_ID);
  const { uri: hash } = await storageClient.uploadFile(file, { acl });
  // console.log(`image hash: ${hash}`);
  return {
    uri: uri(hash),
    type: file.type as MediaImageMimeType
  };
};

export const uploadVideo = async (
  videoBlob: Blob,
  mimeType: string,
  _acl?: WalletAddressAcl
): Promise<{ uri: URI, type: string }> => {
  // Convert Blob to File with a name
  const file = new File([videoBlob], `bonsai_generated_${Date.now()}.mp4`, { type: mimeType });
  const acl = _acl || immutable(LENS_CHAIN_ID);
  const { uri: hash } = await storageClient.uploadFile(file, { acl });
  // console.log(`video hash: ${hash}`);
  return {
    uri: uri(hash),
    type: mimeType
  };
};

export const uploadFile = async (
  file: File,
  _acl?: WalletAddressAcl,
): Promise<{
  image?: { url: URI, type: MediaImageMimeType },
  video?: { url: URI, type: MediaVideoMimeType }
}> => {
  const acl = _acl || immutable(LENS_CHAIN_ID);
  const { uri: hash } = await storageClient.uploadFile(file, { acl });
  const isImage = file.type.includes("image");
  console.log(`${isImage ? 'image' : 'video'} hash: ${hash}`);
  if (isImage) {
    return { image: { url: uri(hash), type: file.type as MediaImageMimeType } };
  }
  return { video: { url: uri(hash), type: file.type as MediaVideoMimeType } };
};

export const createPost = async (
  sessionClient: SessionClient,
  walletClient: any,
  params: PostParams,
  commentOn?: string,
  quoteOf?: string
): Promise<{ postId: string, uri: URI } | undefined> => {
  const contentUri = await uploadMetadata(params);
  // console.log(`contentUri: ${contentUri}`);

  const result = await post(sessionClient, {
    contentUri,
    commentOn: commentOn
      ? {
        post: postId(commentOn),
      }
      : undefined,
    quoteOf: quoteOf || !!params.remix
      ? {
        post: postId(quoteOf || params.remix as string),
      }
      : undefined,
    actions: params.actions,
    feed: evmAddress(LENS_BONSAI_DEFAULT_FEED),
  })
    .andThen(handleOperationWith(walletClient))
    .andThen(sessionClient.waitForTransaction);

  console.log("post result", result);

  if (result.isOk()) {
    let post;
    let attempts = 0;
    do {
      post = await fetchPost(lensClient, { txHash: txHash(result.value as `0x${string}`) });
      post = post.value;
      if (!post) {
        if (++attempts === 3) return;
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    } while (!post);

    if (post) {
      return {
        postId: post.slug as string, // slug is shorter version of id
        uri: contentUri,
      };
    }
  }

  console.log(
    "lens:: createPost:: failed to post with error:",
    result
  );
};