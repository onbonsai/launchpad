// components/SafeImage.tsx
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
}

export function SafeImage({ src, alt, width, height, className, sizes, fill, unoptimized }: SafeImageProps) {
  const [useFallback, setUseFallback] = useState(false)

  if (useFallback) {
    return (
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
      />
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={() => setUseFallback(true)}
      sizes={sizes}
      fill={fill}
      unoptimized={unoptimized}
    />
  )
}