import { getProfileImage } from "@src/services/lens/utils";
import Link from "next/link";
import { SwitchHorizontalIcon } from "@heroicons/react/solid";
import Image from "next/image";

interface QuotePreviewsProps {
  version: number;
  quotes: any[];
  originalPost?: any;
  parentVersion?: number;
}

export const QuotePreviews = ({ quotes, originalPost, version, parentVersion }: QuotePreviewsProps) => {
  if (!originalPost && quotes.length === 0) {
    return null;
  }

  // Sort quotes to prioritize those matching the current version
  const sortedQuotes = [...quotes].sort((a, b) => {
    const aVersion = a.metadata.attributes?.find((attr: any) => attr.key === "remixVersion")?.value;
    const bVersion = b.metadata.attributes?.find((attr: any) => attr.key === "remixVersion")?.value;

    // If a matches current version and b doesn't, a comes first
    if (aVersion === version.toString() && bVersion !== version.toString()) return -1;
    // If b matches current version and a doesn't, b comes first
    if (bVersion === version.toString() && aVersion !== version.toString()) return 1;

    // If both match or both don't match, maintain original order
    return 0;
  });

  const renderPostPreview = (post: any) => {
    const content = post.metadata.content;
    const previewText = content.length > 50 ? content.substring(0, 50) + "..." : content;
    const remixVersion = post.metadata.attributes?.find((attr: any) => attr.key === "remixVersion")?.value;
    const isCurrentVersion = remixVersion === version.toString();

    return (
      <div
        key={post.id}
        className="w-[300px] flex-shrink-0 bg-card rounded-2xl p-4 cursor-pointer hover:bg-card/10 transition-colors backdrop-blur-sm"
      >
        <Link href={`/post/${post.slug}${parentVersion ? `?v=${parentVersion}` : ''}`}>
          <div className="flex items-center gap-2 mb-2">
            <Image
              src={getProfileImage(post.author)}
              alt={post.author.metadata.name || ""}
              className="w-8 h-8 rounded-full"
              width={32}
              height={32}
            />
            <span className="text-sm font-medium text-secondary">{post.author.metadata.name}</span>
            {remixVersion !== undefined && (
              <div className="flex items-center gap-1">
                <SwitchHorizontalIcon
                  className={`w-4 h-4 ${isCurrentVersion ? "text-brand-highlight" : "text-secondary/60"}`}
                />
                <span className={`text-sm ${isCurrentVersion ? "text-brand-highlight" : "text-secondary"}`}>
                  v{remixVersion}
                </span>
              </div>
            )}
          </div>
          <p className="text-sm text-secondary/80 line-clamp-3">{previewText}</p>
        </Link>
      </div>
    );
  };

  return (
    <div className="mt-6 flex flex-col md:flex-row gap-6">
      {originalPost && (
        <div className="w-full md:w-auto">
          <h3 className="text-lg font-semibold text-secondary md:mb-2">Original Post</h3>
          <div className="overflow-x-auto">
            <div className="flex space-x-4 pb-4 bg-background rounded-xl py-2 min-w-max mb-2">
              {originalPost && renderPostPreview(originalPost)}
            </div>
          </div>
        </div>
      )}
      {sortedQuotes && sortedQuotes.length > 0 && (
        <div className="w-full md:w-auto">
          <h3 className="text-lg font-semibold text-secondary md:mb-2">Remixes</h3>
          <div className="overflow-x-auto">
            <div className="flex space-x-4 pb-4 bg-background rounded-xl py-2 min-w-max mb-2">
              {sortedQuotes.map(renderPostPreview)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
