import Link from "next/link";
import { SwitchHorizontalIcon } from "@heroicons/react/solid";
import { SafeImage } from "@src/components/SafeImage/SafeImage";
import { Button } from "@src/components/Button";
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import { useGetRemixes } from "@src/hooks/useGetRemixes";

interface RemixPreviewsProps {
  parentCast: string | null | undefined;
}

// farcaster related previews
export const RemixPreviews = ({ parentCast }: RemixPreviewsProps) => {
  const { remixes, creatorProfiles, isLoading, error, hasMore, loadMore, total } = useGetRemixes(parentCast);

  if (!parentCast) {
    return null;
  }

  if (error) {
    return (
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-secondary mb-2">Remixes</h3>
        <div className="text-sm text-red-400">
          Failed to load remixes: {error}
        </div>
      </div>
    );
  }

  if (remixes.length === 0 && !isLoading) {
    return (
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-secondary mb-2">Remixes</h3>
        <div className="text-sm text-secondary/60">
          No remixes found yet. Be the first to create a remix!
        </div>
      </div>
    );
  }

  const renderRemixPreview = (remix: any) => {
    const { preview, creatorFid, agentMessageId } = remix;
    const creatorProfile = creatorProfiles[creatorFid];
    const previewText = preview.text && preview.text.length > 50
      ? preview.text.substring(0, 50) + "..."
      : preview.text || "";

    return (
      <div
        key={agentMessageId}
        className="w-[300px] flex-shrink-0 bg-card rounded-2xl p-4 cursor-pointer hover:bg-card/10 transition-colors backdrop-blur-sm"
      >
        <Link href={`/media/${agentMessageId}`}>
          <div className="flex items-center gap-2 mb-2">
            <SafeImage
              src={creatorProfile?.pfpUrl || `https://picsum.photos/32/32?random=${creatorFid}`}
              alt={creatorProfile?.displayName || `User ${creatorFid}`}
              className="w-8 h-8 rounded-full"
              width={32}
              height={32}
            />
            <span className="text-sm font-medium text-secondary">
              {creatorProfile?.displayName || creatorProfile?.username || `User ${creatorFid}`}
            </span>
            <div className="flex items-center gap-1">
              <SwitchHorizontalIcon className="w-4 h-4 text-brand-highlight" />
              <span className="text-sm text-brand-highlight">remix</span>
            </div>
          </div>

          {/* Preview Media */}
          {preview.image || preview.imagePreview ? (
            <div className="mb-2">
              <SafeImage
                src={preview.imageUrl || preview.imagePreview || ""}
                alt="Remix preview"
                className="w-full h-32 object-cover rounded-lg"
                width={268}
                height={128}
              />
            </div>
          ) : preview.video ? (
            <div className="mb-2">
              <video
                className="w-full h-32 object-cover rounded-lg"
                poster={preview.image || preview.imagePreview}
                muted
                playsInline
              >
                <source src={preview.video.url} type="video/mp4" />
              </video>
            </div>
          ) : null}

          {previewText && (
            <p className="text-sm text-secondary/80 line-clamp-3">{previewText}</p>
          )}
        </Link>
      </div>
    );
  };

    return (
    <div className="mt-6 flex flex-col md:flex-row gap-6">
      <div className="w-full md:w-auto">
        <h3 className="text-lg font-semibold text-secondary md:mb-2">
          Remixes {total > 0 && `(${total})`}
        </h3>

        {isLoading && remixes.length === 0 ? (
          <div className="flex justify-center py-8">
            <Spinner customClasses="h-6 w-6" color="#5be39d" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="flex space-x-4 pb-4 bg-background rounded-xl py-2 min-w-max mb-2">
              {remixes.map(renderRemixPreview)}
            </div>
          </div>
        )}

        {hasMore && (
          <div className="flex justify-center mt-4">
            <Button
              onClick={loadMore}
              disabled={isLoading}
              variant="outline"
              size="sm"
              className="text-secondary border-secondary/20 hover:bg-secondary/10"
            >
              {isLoading ? (
                <>
                  <Spinner customClasses="h-4 w-4 mr-2" color="#5be39d" />
                  Loading...
                </>
              ) : (
                "Load More Remixes"
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};