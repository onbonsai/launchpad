
import { storjGatewayURL } from '@src/utils/storj';
import Image from 'next/image';

function BonsaiNFT({ tree, index }) {
    return (
        <div className="min-w-[78px] max-w-[78px] h-[78px]" key={`tree-${index}`}>
            <div className="rounded-2xl overflow-hidden relative h-[78px]">
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
                        sizes="78px"
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
