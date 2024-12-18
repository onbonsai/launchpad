
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
        const parts = fullUrl.split('/');
        console.log(JSON.stringify(parts));
        return parts[parts.length - 2] + '/' + parts[parts.length - 1];
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
            <Image
              src={
                tree.image?.cachedUrl
                  ? tree.image.cachedUrl
                  : tree.metadata?.image
                  ? storjGatewayURL(tree.metadata?.image)
                  : ""
              }
              fill
              className="object-cover"
              alt="bonsai"
              sizes={size}
            />
        </a>
      </div>
    );
  }

export default BonsaiNFT;
