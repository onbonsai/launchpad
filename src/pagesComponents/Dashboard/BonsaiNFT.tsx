
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
    return (
        <div className={`min-w-[${size}] max-w-[${size}] h-[${size}]`} key={`tree-${index}`}>
            <div className={`rounded-2xl overflow-hidden relative h-[${size}]`}>
                <a href={tree.openseaUrl} target="_blank" rel="noreferrer">
                    <Image
                        src={
                            tree.image?.cachedUrl
                                ? tree.image.cachedUrl
                                : tree.metadata?.image
                                    ? storjGatewayURL(tree.metadata?.image)
                                    : ""
                        }
                        fill={true}
                        sizes={size}
                        className="object-cover"
                        alt="bonsai tree"
                        unoptimized={true}
                    />
                </a>
            </div>
        </div>
    );
}

export default BonsaiNFT;
