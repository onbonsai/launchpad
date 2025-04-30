import React, { useState, useRef, useEffect } from 'react';
import { AlchemyNFTMetadata, useGetWhitelistedNFTs } from '@src/hooks/useGetWhitelistedNFTs';
import NFTCard from './NFTCard';
import { useAccount } from 'wagmi';
import ReactCrop, { Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import Popper from '@mui/material/Popper';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import { Button } from '@src/components/Button';
import type { AspectRatio } from '@src/components/ImageUploader/ImageUploader';
import { ipfsOrNot } from '@src/utils/pinata';
import { NFTMetadata } from '@src/services/madfi/studio';

const ASPECT_RATIOS: { [key in AspectRatio]: { width: number; height: number; label: string } } = {
  "16:9": { width: 16, height: 9, label: "16:9" },
  "9:16": { width: 9, height: 16, label: "9:16" },
  "1:1": { width: 1, height: 1, label: "1:1" },
  "4:3": { width: 4, height: 3, label: "4:3" },
  "3:4": { width: 3, height: 4, label: "3:4" },
  "21:9": { width: 21, height: 9, label: "21:9" },
};

// Preview icon component for aspect ratios
const AspectRatioIcon: React.FC<{ width: number; height: number }> = ({ width, height }) => {
  const scale = 16 / Math.max(width, height);
  const scaledWidth = Math.round(width * scale);
  const scaledHeight = Math.round(height * scale);

  return (
    <span className="inline-block border border-current mr-1" style={{
      width: `${scaledWidth}px`,
      height: `${scaledHeight}px`
    }} />
  );
};

interface WhitelistedNFTsSectionProps {
  setSelectedNFT?: (nft: AlchemyNFTMetadata) => void;
  selectedNFT?: AlchemyNFTMetadata;
  selectedAspectRatio?: AspectRatio;
  onAspectRatioChange?: (ratio: AspectRatio) => void;
  loadRemixNFT?: NFTMetadata;
}

const WhitelistedNFTsSection = ({
  setSelectedNFT,
  selectedNFT,
  selectedAspectRatio,
  onAspectRatioChange,
  loadRemixNFT,
}: WhitelistedNFTsSectionProps) => {
  const { address } = useAccount();
  const { data: nfts, isLoading } = useGetWhitelistedNFTs(address as `0x${string}`, loadRemixNFT);
  const [crop, setCrop] = useState<Crop>();
  const [cropperAnchorEl, setCropperAnchorEl] = useState<HTMLElement | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [internalSelectedRatio, setInternalSelectedRatio] = useState<AspectRatio>(selectedAspectRatio || "1:1");

  // Use either controlled or internal state
  const currentRatio = selectedAspectRatio || internalSelectedRatio;
  const setCurrentRatio = (ratio: AspectRatio) => {
    if (onAspectRatioChange) {
      onAspectRatioChange(ratio);
    } else {
      setInternalSelectedRatio(ratio);
    }
  };

  // Update crop when aspect ratio changes
  useEffect(() => {
    if (!imgRef.current) return;

    const { naturalWidth: width, naturalHeight: height } = imgRef.current;
    const ratio = ASPECT_RATIOS[currentRatio];
    const aspect = ratio.width / ratio.height;

    const crop = centerAspectCrop(width, height, aspect);
    setCrop(crop);
  }, [currentRatio]);

  const handleNFTSelect = (nft: AlchemyNFTMetadata) => {
    setSelectedNFT?.(nft);
    // Set the anchor element to the NFT card element
    const nftCard = document.querySelector(`[data-nft-id="${nft.contract.address}-${nft.tokenId}"]`);
    if (nftCard) {
      // Temporarily close the popper
      setCropperAnchorEl(null);
      // Reset crop
      setCrop(undefined);
      // Reopen the popper with the new NFT
      setTimeout(() => {
        setCropperAnchorEl(nftCard as HTMLElement);
      }, 0);
    }
  };

  const centerAspectCrop = (
    mediaWidth: number,
    mediaHeight: number,
    aspect: number,
  ) => {
    let cropWidth = mediaWidth;
    let cropHeight = mediaHeight;

    if (cropWidth / cropHeight > aspect) {
      cropWidth = cropHeight * aspect;
    } else {
      cropHeight = cropWidth / aspect;
    }

    const x = (mediaWidth - cropWidth) / 2;
    const y = (mediaHeight - cropHeight) / 2;

    return {
      unit: '%' as const,
      width: (cropWidth / mediaWidth) * 100,
      height: (cropHeight / mediaHeight) * 100,
      x: (x / mediaWidth) * 100,
      y: (y / mediaHeight) * 100,
    };
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth: width, naturalHeight: height } = e.currentTarget;
    const ratio = ASPECT_RATIOS[currentRatio];
    const aspect = ratio.width / ratio.height;

    const crop = centerAspectCrop(width, height, aspect);
    setCrop(crop);
  };

  const handleClose = () => {
    if (!selectedNFT || !imgRef.current || !crop) return;

    const canvas = document.createElement('canvas');
    const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height;

    // Use the original image dimensions for the canvas
    const pixelCrop = {
      x: (crop.x * imgRef.current.naturalWidth) / 100,
      y: (crop.y * imgRef.current.naturalHeight) / 100,
      width: (crop.width * imgRef.current.naturalWidth) / 100,
      height: (crop.height * imgRef.current.naturalHeight) / 100
    };

    // Set canvas dimensions to match the crop size
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    const ctx = canvas.getContext('2d');

    if (!ctx) {
      console.error('Failed to get canvas context');
      return;
    }

    // Set the rendering quality
    ctx.imageSmoothingQuality = 'high';
    ctx.imageSmoothingEnabled = true;

    // Draw the cropped portion of the image
    ctx.drawImage(
      imgRef.current,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      canvas.width,
      canvas.height
    );

    // Convert the canvas to a base64 string
    const base64String = canvas.toDataURL('image/png', 1.0);

    // Update the selected NFT with the base64 string
    const updatedNFT = {
      ...selectedNFT,
      image: {
        ...selectedNFT.image,
        croppedBase64: base64String
      }
    };

    setSelectedNFT?.(updatedNFT);
    setCropperAnchorEl(null);
    setCrop(undefined);
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
            <div
              key={`${nft.contract.address}-${nft.tokenId}`}
              data-nft-id={`${nft.contract.address}-${nft.tokenId}`}
            >
              <NFTCard
                nft={nft}
                selectable
                selected={selectedNFT?.tokenId === nft.tokenId && selectedNFT?.contract.address === nft.contract.address}
                onClick={() => handleNFTSelect(nft)}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col border-spacing-3 border mt-3 border-dashed border-card-lightest justify-center items-center px-3 w-full h-[82px] bg-white/5 rounded-2xl">
          <p className="text-sm text-gray-400">
            No NFTs found from whitelisted collections
          </p>
        </div>
      )}

      <Popper
        open={Boolean(cropperAnchorEl)}
        anchorEl={cropperAnchorEl}
        placement="bottom-start"
        style={{ zIndex: 1400 }}
        modifiers={[
          {
            name: 'offset',
            options: {
              offset: [0, 8],
            },
          },
        ]}
      >
        <ClickAwayListener onClickAway={handleClose}>
          <div className="mt-2 bg-dark-grey rounded-lg shadow-lg w-[400px] overflow-hidden">
            <div className="relative">
              <ReactCrop
                crop={crop}
                onChange={setCrop}
                aspect={ASPECT_RATIOS[currentRatio].width / ASPECT_RATIOS[currentRatio].height}
                className="max-h-[400px] overflow-hidden flex items-center justify-center bg-card-light"
                locked={true}
                ruleOfThirds
              >
                <div className="relative w-fit flex items-center justify-center">
                  <img
                    ref={imgRef}
                    src={ipfsOrNot(selectedNFT?.image?.cachedUrl || selectedNFT?.image?.originalUrl || selectedNFT?.raw?.metadata?.image)}
                    alt="Aspect ratio preview"
                    className="max-h-[400px] w-auto object-contain"
                    onLoad={onImageLoad}
                    crossOrigin="anonymous"
                  />
                </div>
              </ReactCrop>
            </div>

            <div className="p-2.5 space-y-2.5">
              {/* Aspect Ratio Selector */}
              <div className="flex justify-center gap-1">
                {Object.entries(ASPECT_RATIOS).map(([ratio, { width, height, label }]) => (
                  <button
                    key={ratio}
                    onClick={() => setCurrentRatio(ratio as AspectRatio)}
                    className={`flex items-center justify-center px-2 py-1 rounded border text-sm transition-colors ${
                      currentRatio === ratio
                        ? "bg-white text-black border-white"
                        : "bg-card-light text-white border-card-lightest hover:bg-card-lightest"
                    }`}
                  >
                    <span className="flex items-center">
                      <AspectRatioIcon width={width} height={height} />
                      {label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 justify-end pt-2 border-t border-card-lightest">
                <Button onClick={handleClose} variant="primary" size="xs">Done</Button>
              </div>
            </div>
          </div>
        </ClickAwayListener>
      </Popper>
    </div>
  );
};

WhitelistedNFTsSection.displayName = 'WhitelistedNFTsSection';

export default WhitelistedNFTsSection;