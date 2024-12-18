import { storjGatewayURL } from '@src/utils/storj';
import Image from 'next/image';

interface BonsaiNFTProps {
  tree: any;
  index: number;
  size?: string;
}

function BonsaiNFT(props: BonsaiNFTProps) {
    const { tree, index } = props;
    const size = props.size || "78px";
    
    const imageUrl = tree.image?.cachedUrl
      ? tree.image.cachedUrl
      : tree.raw?.metadata?.image
        ? storjGatewayURL(tree.raw.metadata.image)
        : "";
  
    const isSvg = imageUrl.toLowerCase().endsWith('.svg');
    console.log('isSvg', isSvg);
    return (
      <div
        key={`tree-${index}`}
        className="relative rounded-2xl overflow-hidden"
        style={{
          minWidth: size,
          maxWidth: size,
          height: size,
        }}
      >
        <a href={tree.openseaUrl} target="_blank" rel="noreferrer">
          {isSvg ? (
            <img
              src={imageUrl}
              className="object-cover w-full h-full"
              alt="bonsai"
            />
          ) : (
            <Image
              src={imageUrl}
              fill
              className="object-cover"
              alt="bonsai"
              unoptimized={true}
              sizes={size}
            />
          )}
        </a>
      </div>
    );
  }

export default BonsaiNFT;