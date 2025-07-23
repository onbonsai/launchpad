import { useState, useEffect, useMemo } from "react"
import useIsMobile from "@src/hooks/useIsMobile"

// Define types for the component props
export interface AnimatedBonsaiGridProps {
  width?: number | string
  height?: number | string
  gridSize?: number
  dotSizes?: {
    bonsai: number
    background: number
  }
  colors?: {
    bonsai: string
    background: string[]
  }
  backgroundDensity?: number
  className?: string
  reduceMotion?: boolean
}

// Define the shape type
type Point = { x: number; y: number }

// Simplified bonsai tree shape coordinates (fewer points for better performance)
const getBonsaiShape = (simplified: boolean = false): Point[] => {
  if (simplified) {
    // Ultra-simplified version for mobile
    return [
      // Trunk
      { x: 20, y: 20 }, { x: 20, y: 25 }, { x: 20, y: 30 },
      // Top crown
      { x: 15, y: 12 }, { x: 20, y: 10 }, { x: 25, y: 12 },
      // Side branches
      { x: 15, y: 18 }, { x: 25, y: 18 },
      // Base
      { x: 18, y: 30 }, { x: 22, y: 30 }
    ]
  }

  // Create the bonsai tree shape
  const shape: Point[] = []

  // Tree trunk - vertical line
  for (let y = 12; y <= 30; y++) {
    shape.push({ x: 20, y })
  }

  // Base/roots widening
  for (let x = 18; x <= 22; x++) {
    shape.push({ x, y: 30 })
  }
  for (let x = 17; x <= 23; x++) {
    shape.push({ x, y: 31 })
  }

  // Top foliage layer (largest)
  for (let x = 10; x <= 30; x++) {
    shape.push({ x, y: 12 })
  }
  for (let x = 12; x <= 28; x++) {
    shape.push({ x, y: 11 })
  }
  for (let x = 15; x <= 25; x++) {
    shape.push({ x, y: 10 })
  }

  // Middle-top foliage layer (left)
  for (let x = 10; x <= 19; x++) {
    shape.push({ x, y: 16 })
  }
  for (let x = 12; x <= 17; x++) {
    shape.push({ x, y: 15 })
  }

  // Middle-top foliage layer (right)
  for (let x = 21; x <= 30; x++) {
    shape.push({ x, y: 16 })
  }
  for (let x = 23; x <= 28; x++) {
    shape.push({ x, y: 15 })
  }

  // Bottom foliage layer
  for (let x = 10; x <= 30; x++) {
    shape.push({ x, y: 24 })
  }
  for (let x = 12; x <= 28; x++) {
    shape.push({ x, y: 23 })
  }
  for (let x = 15; x <= 25; x++) {
    shape.push({ x, y: 22 })
  }

  // Left branch
  for (let y = 16; y <= 19; y++) {
    shape.push({ x: 15, y })
  }

  // Right branch
  for (let y = 16; y <= 19; y++) {
    shape.push({ x: 25, y })
  }

  return shape
}

export default function AnimatedBonsaiGrid({
  width = 480,
  height = 300,
  gridSize = 40,
  dotSizes = { bonsai: 8, background: 3 },
  colors = {
    bonsai: "#2D5A3D",
    background: ["#1A4A32", "#0F2419", "#2D5A3D"],
  },
  backgroundDensity = 0.15,
  className = "",
  reduceMotion = false,
}: AnimatedBonsaiGridProps) {
  const isMobile = useIsMobile()
  const [dots, setDots] = useState<
    {
      x: number
      y: number
      baseOpacity: number
      color: string
      isBonsai: boolean
      animationDelay: number
      size: number
    }[]
  >([])

  // Check for user's motion preference
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  const shouldReduceMotion = reduceMotion || prefersReducedMotion || isMobile

  const { shiftedShape, shapeHeight } = useMemo(() => {
    const shape = getBonsaiShape(isMobile) // Use simplified shape on mobile
    if (shape.length === 0) {
      return { shiftedShape: [], shapeHeight: 0 }
    }
    const yCoords = shape.map(p => p.y)
    const minY = Math.min(...yCoords)
    const maxY = Math.max(...yCoords)
    const height = maxY - minY
    const shifted = shape.map(p => ({ x: p.x, y: p.y - minY }))
    return { shiftedShape: shifted, shapeHeight: height }
  }, [isMobile])

  // Generate the dot pattern
  useEffect(() => {
    const newDots: {
      x: number
      y: number
      baseOpacity: number
      color: string
      isBonsai: boolean
      animationDelay: number
      size: number
    }[] = []

    // Add bonsai shape dots
    shiftedShape.forEach(({ x, y }, index) => {
      newDots.push({
        x,
        y,
        baseOpacity: 0.8,
        color: colors.bonsai,
        isBonsai: true,
        animationDelay: shouldReduceMotion ? 0 : (index * 0.1) % 4,
        size: dotSizes.bonsai,
      })
    })

    setDots(newDots)
  }, [colors.bonsai, dotSizes.bonsai, shiftedShape, shouldReduceMotion])

  // Calculate the scale factor based on the width and gridSize
  const scaleFactor = typeof width === "number" ? width / gridSize : 12

  const verticalPadding = useMemo(() => {
    if (typeof height !== "number") return 0
    const renderedShapeHeight = shapeHeight * scaleFactor
    return (height - renderedShapeHeight) / 2
  }, [height, shapeHeight, scaleFactor])



  return (
    <div
      className={`relative ${className}`}
      style={{
        width: typeof width === "string" ? width : `${width}px`,
        height: typeof height === "string" ? height : `${height}px`,
      }}
    >
      <style jsx>{`
        @keyframes bonsaiPulse {
          0%, 100% {
            opacity: 0.8;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
        }

        @keyframes bonsaiPulseReduced {
          0%, 100% {
            opacity: 0.4;
            transform: scale(0.95);
          }
          50% {
            opacity: 1;
            transform: scale(1);
          }
        }

        .bonsai-dot-reduced {
          animation: bonsaiPulseReduced 3s infinite ease-in-out;
        }

        .bonsai-dot-full {
          animation: bonsaiPulse 3s infinite ease-in-out;
        }

        @media (prefers-reduced-motion: reduce) {
          .bonsai-dot-full {
            animation: bonsaiPulseReduced 4s infinite ease-in-out !important;
            animation-delay: 0s !important;
          }
        }
      `}</style>

      {dots.map((dot, index) => (
        <div
          key={index}
          className={`absolute rounded-full ${shouldReduceMotion ? 'bonsai-dot-reduced' : 'bonsai-dot-full'}`}
          style={{
            left: `${dot.x * scaleFactor}px`,
            top: `${dot.y * scaleFactor + verticalPadding}px`,
            width: `${dot.size}px`,
            height: `${dot.size}px`,
            backgroundColor: dot.color,
            opacity: dot.baseOpacity,
            animationDelay: shouldReduceMotion ? '0s' : `${dot.animationDelay}s`,
            zIndex: 10,
          }}
        />
      ))}
    </div>
  )
}
