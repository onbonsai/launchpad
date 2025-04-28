import React from 'react';
import { useGetWhitelistedNFTs } from '@src/hooks/useGetWhitelistedNFTs';
import NFTCard from './NFTCard';
import { NFTMetadata } from '@src/hooks/useGetWhitelistedNFTs';
import { useAccount } from 'wagmi';

interface WhitelistedNFTsSectionProps {
  setSelectedNFT?: (nft: NFTMetadata) => void;
  selectedNFT?: NFTMetadata;
}

const WhitelistedNFTsSection = ({ setSelectedNFT, selectedNFT }: WhitelistedNFTsSectionProps) => {
  const { address } = useAccount();
  const { data: nfts, isLoading } = useGetWhitelistedNFTs(address as `0x${string}`);

  const handleNFTSelect = (nft: NFTMetadata) => {
    setSelectedNFT?.(nft);
  };

  if (!address) return null;

  return (
    <div className="flex flex-col rounded-sm border-zinc-700 gap-y-2 mt-8 overflow-hidden">
      {isLoading ? (
        <div className="flex space-x-2 w-full overflow-x-auto mt-2 h-[200px]">
          {[...Array(3)].map((_, index) => (
            <div
              key={`skeleton-${index}`}
              className="min-w-[200px] h-[200px] bg-[#0891B2]/10 rounded-2xl"
            />
          ))}
        </div>
      ) : nfts && nfts.length > 0 ? (
        <div className="flex space-x-2 w-full overflow-x-auto mt-2 pb-2">
          {nfts.map((nft) => (
            <NFTCard
              key={`${nft.contract.address}-${nft.tokenId}`}
              nft={nft}
              selectable
              selected={selectedNFT?.tokenId === nft.tokenId && selectedNFT?.contract.address === nft.contract.address}
              onClick={() => handleNFTSelect(nft)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col border-spacing-3 border mt-3 border-dashed border-card-lightest justify-center items-center px-3 w-full h-[82px] bg-white/5 rounded-2xl">
          <p className="text-sm text-gray-400">
            No NFTs found from whitelisted collections
          </p>
        </div>
      )}
    </div>
  );
};

WhitelistedNFTsSection.displayName = 'WhitelistedNFTsSection';

export default WhitelistedNFTsSection;