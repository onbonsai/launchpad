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
  width = 320,
  height = 320,
  gridSize = 40,
  dotSizes = { bonsai: 6, background: 4 },
  colors = {
    bonsai: "#C6FFD9",
    background: ["#B8D9C5", "#4D7F79", "#9DC4D5"],
  },
  backgroundDensity = 0.1,
  className = "",
}: AnimatedBonsaiGridProps) {
  const [dots, setDots] = useState<
    {
      x: number
      y: number
      baseOpacity: number
      color: string
      isBonsai: boolean
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
    }[] = []
    const bonsaiShape = getBonsaiShape()

    // Only create dots for the bonsai shape
    bonsaiShape.forEach(({ x, y }) => {
      newDots.push({
        x,
        y,
        baseOpacity: 0.6,
        color: colors.bonsai,
        isBonsai: true,
      })
    })

    setDots(newDots)
  }, [colors])

  // Calculate the scale factor based on the width and gridSize
  const scaleFactor = typeof width === "number" ? width / gridSize : 8

  return (
    <div
      className={`relative ${className}`}
      style={{
        width: typeof width === "string" ? width : `${width}px`,
        height: typeof height === "string" ? height : `${height}px`,
      }}
    >
      <style jsx>{`
        @keyframes pulse {
          0% {
            opacity: 0.7;
            background-color: #C6FFD9;
          }
          25% {
            opacity: 0.9;
            background-color: #5BE39D;
          }
          50% {
            opacity: 0.7;
            background-color: #B8D9C5;
          }
          75% {
            opacity: 0.9;
            background-color: #9DC4D5;
          }
          100% {
            opacity: 0.7;
            background-color: #C6FFD9;
          }
        }
      `}</style>

      {dots.map((dot, index) => (
        <div
          key={index}
          className="absolute rounded-full z-10"
          style={{
            left: `${dot.x * scaleFactor}px`,
            top: `${dot.y * scaleFactor}px`,
            width: `${dotSizes.bonsai}px`,
            height: `${dotSizes.bonsai}px`,
            opacity: 0.7,
            animation: 'pulse 4s infinite',
            animationTimingFunction: 'ease-in-out',
          }}
        />
      ))}
    </div>
  )
}
