import { postId, PostReferenceType, PublicClient } from "@lens-protocol/client";
import { fetchPostReferences } from "@lens-protocol/client/actions";
import { formatDistanceToNowStrict } from "date-fns";

export const getComments = async (slug: string, lensClient: PublicClient): Promise<any> => {
  try {
    const result = await fetchPostReferences(lensClient, {
      referencedPost: postId(slug),
      referenceTypes: [PostReferenceType.CommentOn],
    });

    if (result.isErr()) {
      console.error(result.error);
      return [];
    }

    // items: Array<AnyPost>
    const { items, pageInfo } = result.value;

    return items;
  } catch (error) {
    return [];
  }
};

// Get display name for a profile
export function getDisplayName(profile: any) {
  return profile?.metadata?.displayName || profile?.metadata?.name || profile?.username?.localName || "Anonymous";
}

// Get substring with ellipsis
export function getSubstring(string: string, length = 130): string {
  if (!string) return "";
  if (string.length <= length) {
    return string;
  } else {
    return `${string.substring(0, length)}...`;
  }
}

// Format handles with color highlighting
export function formatHandleColors(text: string): string {
  if (!text) return "";
  let color = "#22c55e"; // Tailwind green-500
  text = text.replaceAll(".lens", "");
  text = text.replace(/(https\S+)/g, (match, url) => {
    const displayUrl = url.length > 40 ? url.substring(0, 37) + "..." : url;
    return `<a style="color: ${color};" href="${url}" target="_blank" rel="noopener noreferrer">${displayUrl}</a>`;
  });
  text = text.replace(/@(\w+)/g, `<span style="color: ${color};">@$1</span>`);
  text = text.replace(/\n/g, "<br>");
  return text;
}

// Format custom distance (for updated timestamps)
export const formatCustomDistance = (timestamp: number): string => {
  const timeAgo = formatDistanceToNowStrict(new Date(timestamp * 1000), { addSuffix: false });

  // Convert to shorthand
  return timeAgo
    .replace(" seconds", "s")
    .replace(" second", "s")
    .replace(" minutes", "m")
    .replace(" minute", "m")
    .replace(" hours", "h")
    .replace(" hour", "h")
    .replace(" days", "d")
    .replace(" day", "d")
    .replace(" weeks", "w")
    .replace(" week", "w")
    .replace(" months", "mo")
    .replace(" month", "mo")
    .replace(" years", "y")
    .replace(" year", "y");
};
