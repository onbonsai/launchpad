import { remapStorjToPinata } from '@src/utils/pinata'
import Image from 'next/image'
import { useState } from 'react'

interface SafeImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  sizes?: string
  fill?: boolean
  unoptimized?: boolean
  loading?: "lazy" | "eager"
}

// List of allowed domains from next.config.js
const ALLOWED_DOMAINS = [
  "arweave.net",
  "api.grove.storage",
  "media.firefly.land",
  "lh3.googleusercontent.com",
  "img.seadn.io",
  "ipfs.infura.io",
  "ipfs.io",
  "madfinance.mypinata.cloud",
  "placeimg.com",
  "ik.imagekit.io",
  "www.storj-ipfs.com",
  "link.storjshare.io",
  "lens.infura-ipfs.io",
  "gateway.storjshare.io",
  "pbs.twimg.com",
  "cdn.stamp.fyi",
  "oaidalleapiprodscus.blob.core.windows.net",
  "gw.ipfs-lens.dev",
  "nft-cdn.alchemy.com",
  "ipfs.4everland.io",
  "imagedelivery.net",
  "wrpcd.net",
  "raw.seadn.io",
  "pink-splendid-urial-219.mypinata.cloud",
  "storage.googleapis.com",
  "app.onbons.ai",
  "onbonsai.mypinata.cloud",
  "token-media.defined.fi",
]

function isDomainAllowed(url: string): boolean {
  try {
    const hostname = new URL(url).hostname
    return ALLOWED_DOMAINS.some(domain => {
      // Handle wildcard domains like "statics-polygon-lens.s3.*.amazonaws.com"
      if (domain.includes('*')) {
        const regex = new RegExp(domain.replace(/\*/g, '.*'))
        return regex.test(hostname)
      }
      return hostname === domain
    })
  } catch {
    return false
  }
}

export function SafeImage({ src, alt, width, height, className, sizes, fill, unoptimized, loading }: SafeImageProps) {
  const [useFallback, setUseFallback] = useState(false)
  const [currentSrc, setCurrentSrc] = useState(src)
  const [hasTriedPinata, setHasTriedPinata] = useState(false)

  // Check if we should use fallback immediately
  const shouldUseFallback = useFallback || !isDomainAllowed(currentSrc)

  if (shouldUseFallback) {
    return (
      <img
        src={currentSrc}
        alt={alt}
        width={width}
        height={height}
        className={className}
        onError={() => {
          // If we haven't tried Pinata yet and it's a Storj URL, try Pinata
          if (!hasTriedPinata && currentSrc?.includes("storj-ipfs")) {
            const pinataUrl = remapStorjToPinata(currentSrc)
            if (pinataUrl !== currentSrc) {
              setCurrentSrc(pinataUrl)
              setHasTriedPinata(true)
              return
            }
          }
        }}
      />
    )
  }

  return (
    <Image
      src={currentSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      // style={!fill ? {
      //   width: 'auto',
      //   height: 'auto',
      //   ...(width && height ? { maxWidth: `${width}px`, maxHeight: `${height}px` } : {})
      // } : undefined}
      onError={() => {
        // If we haven't tried Pinata yet and it's a Storj URL, try Pinata
        if (!hasTriedPinata && currentSrc?.includes("storj-ipfs")) {
          const pinataUrl = remapStorjToPinata(currentSrc)
          if (pinataUrl !== currentSrc) {
            setCurrentSrc(pinataUrl)
            setHasTriedPinata(true)
            return
          }
        }
        // If we've already tried Pinata or it's not a Storj URL, fall back to img tag
        setUseFallback(true)
      }}
      sizes={sizes}
      fill={fill}
      unoptimized={unoptimized}
      loading={loading}
    />
  )
}