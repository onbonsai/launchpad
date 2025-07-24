import { remapStorjToPinata } from '@src/utils/pinata'
import Image from 'next/image'
import { useMemo } from 'react'

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

export function SafeImage({ 
  src, 
  alt, 
  width, 
  height, 
  className, 
  sizes, 
  fill, 
  unoptimized, 
  loading 
}: SafeImageProps) {
  // Convert storj URLs to pinata URLs
  const convertedSrc = useMemo(() => remapStorjToPinata(src), [src])

  return (
    <Image
      src={convertedSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      sizes={sizes}
      fill={fill}
      unoptimized={unoptimized}
      loading={loading}
    />
  )
}