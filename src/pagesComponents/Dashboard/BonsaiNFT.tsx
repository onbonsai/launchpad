
import { storjGatewayURL } from '@src/utils/storj';
import Image from 'next/image';

interface BonsaiNFTProps {
  tree: any;
  index: number;
  size?: string;
}

function BonsaiNFT(props: BonsaiNFTProps) {
  const { tree, index } = props;
  const size = props.size || "91px";

  const ipfshHash = (fullUrl: string) => {
    if (fullUrl.startsWith('https://ipfs.io/ipfs') && fullUrl.endsWith('.svg')) {
      const parts = fullUrl.split('/');
      const finalUrl = storjGatewayURL(parts[parts.length - 2] + '/' + parts[parts.length - 1]);
      return finalUrl;
    }
    return fullUrl;
  }

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
        <img
          src={
            tree.image?.cachedUrl
              ? ipfshHash(tree.image.cachedUrl)
              : tree.metadata?.image
                ? storjGatewayURL(tree.metadata?.image)
                : ""
          }
          className="object-cover"
          alt="bonsai"
          sizes={size}
        />
      </a>
    </div>
  );
}

export default BonsaiNFT;
