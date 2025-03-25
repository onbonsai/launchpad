import { type SessionClient, uri, postId, type URI, BigDecimal, txHash, evmAddress } from "@lens-protocol/client";
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
import { storageClient } from "./client";
import { APP_ID } from "../madfi/studio";
import { LENS_BONSAI_DEFAULT_FEED, LENS_CHAIN_ID } from "../madfi/utils";
import { parseBase64Image } from "@src/utils/utils";
import { lensClient } from "./client";

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
  actions?: {
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
    };
  }[];
}

const baseMetadata = {
  appId: APP_ID,
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

export const formatMetadata = (params: PostParams): TextOnlyMetadata | ImageMetadata | VideoMetadata => {
  // smart media attributes
  const attributes = !!params.template ? baseMetadata.attributes(params.template) : undefined;

  // include token address in attributes for indexing
  if (!!params.template && !!params.tokenAddress) {
    attributes!.push({
      type: MetadataAttributeType.STRING as const,
      key: "tokenAddress",
      value: params.tokenAddress,
    });
  }

  if (!(params.image || params.video)) {
    return textOnly({
      content: params.text,
      tags: [baseMetadata.appId],
      attributes
    });
  } else if (params.image) {
    return image({
      content: params.text,
      image: {
        item: params.image.url,
        type: params.image.type,
        altTag: params.text?.substring(0, 10),
        license: MetadataLicenseType.CCO,
      },
      tags: [baseMetadata.appId],
      attributes
    });
  } else if (params.video) {
    return video({
      content: params.text,
      video: {
        item: params.video.url,
        cover: params.video.cover,
        type: params.video.type,
        license: MetadataLicenseType.CCO,
      },
      tags: [baseMetadata.appId],
      attributes
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
    quoteOf: quoteOf
      ? {
        post: postId(quoteOf),
      }
      : undefined,
    actions: params.actions,
    feed: evmAddress(LENS_BONSAI_DEFAULT_FEED),
  })
    .andThen(handleOperationWith(walletClient))
    .andThen(sessionClient.waitForTransaction);

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