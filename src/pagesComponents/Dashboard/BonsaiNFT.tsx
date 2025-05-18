import React, { useEffect, useState } from "react";
import { storjGatewayURL } from "@src/utils/storj";
import Image from "next/image";

interface BonsaiNFTProps {
  tree: any;
  index: number;
  size?: number;
  tokenId: string;
}

const BONSAI_SVG_URL =
  "https://www.storj-ipfs.com/ipfs/bafybeicsssc7vljolfhobqyzlkxa3ngdfwko5pnvdqsfmehlvlv7mfemli/bonsai_";

function BonsaiNFT(props: BonsaiNFTProps) {
  const { tree, index, tokenId } = props;
  const size = props.size || 91;

  const [svgContent, setSvgContent] = useState<string | null>(null);

  const ipfshHash = (fullUrl: string) => {
    if (fullUrl.startsWith("https://ipfs.io/ipfs") && fullUrl.endsWith(".svg")) {
      const parts = fullUrl.split("/");
      const finalUrl = storjGatewayURL(parts[parts.length - 2] + "/" + parts[parts.length - 1]);
      return finalUrl;
    }
    return fullUrl;
  };

  const rawUrl = tree.image?.cachedUrl
    ? ipfshHash(tree.image.cachedUrl)
    : tree.metadata?.image
    ? storjGatewayURL(tree.metadata?.image)
    : `${BONSAI_SVG_URL}${tokenId}.svg`;

  useEffect(() => {
    if (rawUrl) {
      // Encode the URL to handle special characters
      const encodedUrl = encodeURIComponent(rawUrl);

      fetch(`/api/fetch-svg?url=${encodedUrl}`)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          return res.text();
        })
        .then((data) => {
          setSvgContent(data);
        })
        .catch((err) => {
          console.error("Failed to fetch SVG:", err);
          setSvgContent(null);
        });
    }
  }, [rawUrl]);

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
        {svgContent ? (
          <div dangerouslySetInnerHTML={{ __html: svgContent }} style={{ width: "100%", height: "100%" }} />
        ) : (
          <Image src={rawUrl || ""} loading="lazy" className="object-cover" alt="bonsai" width={size} height={91} />
        )}
      </a>
    </div>
  );
}

export default BonsaiNFT;
