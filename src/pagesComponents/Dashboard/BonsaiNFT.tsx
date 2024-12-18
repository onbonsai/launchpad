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
    console.log(tree.image);
  const imageUrl = tree.image?.cachedUrl
    ? tree.image.cachedUrl
    : tree.raw?.metadata?.image
      ? storjGatewayURL(tree.raw.metadata.image)
      : "";

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
        <Image
          src={imageUrl}
          fill
          className="object-cover"
          alt="bonsai tree"
          unoptimized={true}
          sizes={size}
        />
      </a>
    </div>
  );
}

export default BonsaiNFT;