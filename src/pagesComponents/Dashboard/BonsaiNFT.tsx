import React, { useEffect, useState } from "react";
import { storjGatewayURL } from "@src/utils/storj";

interface BonsaiNFTProps {
  tree: any;
  index: number;
  size?: string;
}

function BonsaiNFT(props: BonsaiNFTProps) {
  const { tree, index } = props;
  const size = props.size || "91px";

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
      : "";

  useEffect(() => {
    setSvgContent(null);

    if (rawUrl && rawUrl.endsWith(".svg")) {
      fetch(rawUrl)
        .then((res) => res.text())
        .then((data) => {
          // Remove <style>...</style> sections to stop the animation 
          // that's causing our performance issues
          const stripped = data.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
          setSvgContent(stripped);
        })
        .catch((err) => {
          console.error("Failed to fetch SVG:", err);
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
          <div
            dangerouslySetInnerHTML={{ __html: svgContent }}
            style={{ width: "100%", height: "100%" }}
          />
        ) : (
          <img
            src={rawUrl || ""}
            loading="lazy"
            className="object-cover"
            alt="bonsai"
            sizes={size}
          />
        )}
      </a>
    </div>
  );
}

export default BonsaiNFT;