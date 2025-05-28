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

export function SafeImage({ src, alt, width, height, className, sizes, fill, unoptimized, loading }: SafeImageProps) {
  const [useFallback, setUseFallback] = useState(false)
  const [currentSrc, setCurrentSrc] = useState(src)
  const [hasTriedPinata, setHasTriedPinata] = useState(false)

  if (useFallback) {
    return (
      <img
        src={currentSrc}
        alt={alt}
        width={width}
        height={height}
        className={className}
        onError={() => {
          // If we haven't tried Pinata yet and it's a Storj URL, try Pinata
          if (!hasTriedPinata && currentSrc.includes("storj-ipfs")) {
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
      onError={() => {
        // If we haven't tried Pinata yet and it's a Storj URL, try Pinata
        if (!hasTriedPinata && currentSrc.includes("storj-ipfs")) {
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