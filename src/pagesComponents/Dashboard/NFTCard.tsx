import React from "react";
import { storjGatewayURL } from "@src/utils/storj";
import { NFTMetadata } from "@src/hooks/useGetWhitelistedNFTs";

interface NFTCardProps {
  nft: NFTMetadata;
  size?: string;
  selected?: boolean;
  onClick?: () => void;
  selectable?: boolean;
}

function NFTCard({ nft, size = "200px", selected, onClick, selectable }: NFTCardProps) {
  const imageUrl = nft.image?.cachedUrl
    ? nft.image.cachedUrl
    : nft.metadata?.image
    ? storjGatewayURL(nft.metadata.image)
    : "";

  const handleClick = (e: React.MouseEvent) => {
    if (selectable) {
      e.preventDefault(); // Prevent OpenSea navigation when selectable
      onClick?.();
    }
  };

  return (
    <div
      className={`relative rounded-2xl overflow-hidden group cursor-pointer ${selected ? 'border-2 border-brand-highlight' : ''}`}
      style={{
        minWidth: size,
        maxWidth: size,
        height: size,
      }}
      onClick={handleClick}
    >
      <a
        href={selectable ? undefined : nft.openseaUrl}
        target="_blank"
        rel="noreferrer"
        className="block w-full h-full"
      >
        <img
          src={imageUrl}
          loading="lazy"
          className="object-cover w-full h-full transition-transform duration-200 group-hover:scale-110"
          alt={`NFT #${nft.tokenId}`}
        />

        {/* Selected indicator */}
        {selected && (
          <div className="absolute top-2 right-2 w-4 h-4 bg-brand-highlight rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full" />
          </div>
        )}

        {/* Collection and Token ID overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-sm p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="truncate">
            {nft?.collection?.name} #{nft.tokenId}
          </div>
        </div>
      </a>
    </div>
  );
}

export default NFTCard;