import { getProfileImage } from "@src/services/lens/utils";
import Link from "next/link";

interface QuotePreviewsProps {
  quotes: any[];
}

export const QuotePreviews = ({ quotes }: QuotePreviewsProps) => {
  if (quotes.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold text-secondary">Remixes</h3>
      <div className="flex space-x-4 overflow-x-auto pb-4 bg-background rounded-xl py-4">
        {quotes.map((quote) => {
          const content = quote.metadata.content;
          const previewText = content.length > 50 ? content.substring(0, 50) + "..." : content;

          return (
            <div
              key={quote.id}
              className="w-[300px] flex-shrink-0 bg-card rounded-2xl p-4 cursor-pointer hover:bg-card/10 transition-colors backdrop-blur-sm"
            >
              <Link href={`/post/${quote.slug}`}>
                <div className="flex items-center gap-2 mb-2">
                  <img
                    src={getProfileImage(quote.author)}
                    alt={quote.author.metadata.name || ""}
                    className="w-8 h-8 rounded-full"
                  />
                  <span className="text-sm font-medium text-secondary">{quote.author.metadata.name}</span>
                </div>
                <p className="text-sm text-secondary/80 line-clamp-3">{previewText}</p>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
};
