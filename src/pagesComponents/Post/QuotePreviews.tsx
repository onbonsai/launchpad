import { getProfileImage } from "@src/services/lens/utils";
import Link from "next/link";

interface QuotePreviewsProps {
  quotes: any[];
  originalPost?: any;
}

export const QuotePreviews = ({ quotes, originalPost }: QuotePreviewsProps) => {
  if (!originalPost && quotes.length === 0) {
    return null;
  }

  const renderPostPreview = (post: any) => {
    const content = post.metadata.content;
    const previewText = content.length > 50 ? content.substring(0, 50) + "..." : content;

    return (
      <div
        key={post.id}
        className="w-[300px] flex-shrink-0 bg-card rounded-2xl p-4 cursor-pointer hover:bg-card/10 transition-colors backdrop-blur-sm"
      >
        <Link href={`/post/${post.slug}`}>
          <div className="flex items-center gap-2 mb-2">
            <img
              src={getProfileImage(post.author)}
              alt={post.author.metadata.name || ""}
              className="w-8 h-8 rounded-full"
            />
            <span className="text-sm font-medium text-secondary">{post.author.metadata.name}</span>
          </div>
          <p className="text-sm text-secondary/80 line-clamp-3">{previewText}</p>
        </Link>
      </div>
    );
  };

  return (
    <div className="mt-6 flex">
      {originalPost && (
        <div className="mr-6">
          <h3 className="text-lg font-semibold text-secondary">Original Post</h3>
          <div className="flex space-x-4 overflow-x-auto pb-4 bg-background rounded-xl py-4">
            {originalPost && renderPostPreview(originalPost)}
          </div>
        </div>
      )}
      {quotes && quotes.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-secondary">Remixes</h3>
          <div className="flex space-x-4 overflow-x-auto pb-4 bg-background rounded-xl py-4">
            {quotes.map(renderPostPreview)}
          </div>
        </div>
      )}
    </div>
  );
};
