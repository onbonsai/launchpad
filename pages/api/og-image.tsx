import { getProfileByHandle } from "@src/services/lens/getProfiles";
import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";
import { storjGatewayURL } from "@src/utils/storj";
import { lensClient, storageClient } from "@src/services/lens/client";
import { fetchPost } from "@lens-protocol/client/actions";
import { postId } from "@lens-protocol/client";
import WordMark from "@src/assets/css/workMark";
export const config = {
  runtime: "edge",
};

const defaultImageUrl = "https://onbons.ai/opengraph-image.png";

const getPost = async (_postId: string) => {
  try {
    const result = await fetchPost(lensClient, {
      post: postId(_postId),
    });

    if (result.isErr()) {
      return console.error(result.error);
    }

    const post = result.value;
    return post;
  } catch (error) {
    console.log(error);
    return null;
  }
};

export default async function handler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let imageUrl = searchParams.get("image") || defaultImageUrl;
    let profileImageUrl = searchParams.get("profileImage") || "";
    let handle = searchParams.get("handle") || "";
    const postId = searchParams.get("postId") || "";
    let postContent = "";

    if (postId) {
      let post = await getPost(postId);
      // @ts-ignore
      imageUrl = post?.metadata?.image?.item || imageUrl;
      profileImageUrl = post?.author?.metadata?.picture || profileImageUrl;
      handle = post?.author?.username?.localName || handle;
      // @ts-ignore
      postContent = post?.metadata?.content || "";
    } else if (handle) {
      const profile = await getProfileByHandle(handle);
      profileImageUrl = profile?.metadata?.picture || profileImageUrl;
      imageUrl = profile?.metadata?.coverPicture || imageUrl;
    }

    if (imageUrl.startsWith("ipfs")) {
      imageUrl = storjGatewayURL(imageUrl, true);
    } else if (imageUrl.startsWith("lens")) {
      imageUrl = await storageClient.resolve(imageUrl);
    }

    if (profileImageUrl.startsWith("ipfs")) {
      profileImageUrl = storjGatewayURL(profileImageUrl, true);
    }

    // Get first 50 characters of post content for display
    const truncatedContent = postContent ? postContent.substring(0, 50) + (postContent.length > 50 ? "..." : "") : "";

    // Create a dynamic image based on the parameters
    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#141414",
          }}
        >
          <img
            width="100%"
            height="100%"
            src={imageUrl}
            style={{
              objectFit: "cover",
              ...(postId && truncatedContent ? {
                filter: "brightness(0.7)",
                opacity: 0.9
              } : {})
            }}
          />
          {profileImageUrl && (
            <div
              style={{
                position: "absolute",
                top: 20,
                left: 20,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <img
                width="200"
                height="200"
                src={profileImageUrl}
                style={{
                  borderRadius: 128,
                  border: "8px solid rgba(255, 255, 255, 0.8)",
                  boxShadow: "0 0 10px 0 rgba(0, 0, 0, 0.5)",
                }}
              />
              {handle && (
                <p
                  style={{
                    fontSize: 64,
                    fontWeight: "900",
                    color: "white",
                    textShadow: "0 2px 4px rgba(0,0,0,0.5)",
                    textAlign: "center",
                    maxWidth: 500,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    top: 30,
                    left: 230,
                    position: "absolute",
                  }}
                >
                  @{handle}
                </p>
              )}
            </div>
          )}

          {/* Display post content in the center if it's a publication */}
          {postId && truncatedContent && (
            <p
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                textAlign: "center",
                padding: "20px 30px",
                borderRadius: "12px",
                maxWidth: "1000px",
                fontSize: 58,
                fontWeight: "700",
                color: "white",
                textShadow: "0 2px 4px rgba(0,0,0,0.5)",
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              "{truncatedContent}"
            </p>
          )}

          <WordMark />
        </div>
      ),
      {
        width: 1200,
        height: 630,
      },
    );
  } catch (e) {
    console.error(e);
    return new Response(`Failed to generate image`, {
      status: 500,
    });
  }
}
