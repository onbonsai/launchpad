import { useState, useEffect } from "react"

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
}

// Define the shape type
type Point = { x: number; y: number }

// Bonsai tree shape coordinates
const getBonsaiShape = (): Point[] => {
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
  height = 480,
  gridSize = 40,
  dotSizes = { bonsai: 8, background: 3 },
  colors = {
    bonsai: "#2D5A3D",
    background: ["#1A4A32", "#0F2419", "#2D5A3D"],
  },
  backgroundDensity = 0.15,
  className = "",
}: AnimatedBonsaiGridProps) {
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
    const bonsaiShape = getBonsaiShape()

    // Add bonsai shape dots
    bonsaiShape.forEach(({ x, y }, index) => {
      newDots.push({
        x,
        y,
        baseOpacity: 0.8,
        color: colors.bonsai,
        isBonsai: true,
        animationDelay: (index * 0.1) % 4,
        size: dotSizes.bonsai,
      })
    })

    setDots(newDots)
  }, [colors.bonsai, dotSizes.bonsai])

  // Calculate the scale factor based on the width and gridSize
  const scaleFactor = typeof width === "number" ? width / gridSize : 12

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
          0% {
            opacity: 0.9;
            transform: scale(1);
            background-color: #2D5A3D;
          }
          25% {
            opacity: 1;
            transform: scale(1.15);
            background-color: #4AE582;
          }
          50% {
            opacity: 0.8;
            transform: scale(1);
            background-color: #1A4A32;
          }
          75% {
            opacity: 1;
            transform: scale(1.08);
            background-color: #7FFF9F;
          }
          100% {
            opacity: 0.9;
            transform: scale(1);
            background-color: #2D5A3D;
          }
        }
      `}</style>

      {dots.map((dot, index) => (
        <div
          key={index}
          className="absolute rounded-full"
          style={{
            left: `${dot.x * scaleFactor}px`,
            top: `${dot.y * scaleFactor}px`,
            width: `${dot.size}px`,
            height: `${dot.size}px`,
            backgroundColor: dot.color,
            opacity: dot.baseOpacity,
            animation: `bonsaiPulse 4s infinite ease-in-out ${dot.animationDelay}s`,
            zIndex: 10,
          }}
        />
      ))}
    </div>
  )
}
