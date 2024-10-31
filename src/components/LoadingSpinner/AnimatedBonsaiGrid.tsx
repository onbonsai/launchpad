import { useState, useEffect, useMemo } from "react"

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
  height = 300,
  gridSize = 40,
  dotSizes = { bonsai: 8, background: 3 },
  colors = {
    bonsai: "#2D5A3D",
    background: ["#1A4A32", "#0F2419", "#2D5A3D"],
  },
  backgroundDensity = 0.15,
  className = "",
}: AnimatedBonsaiGridProps) {

  const { shiftedShape, shapeHeight } = useMemo(() => {
    const shape = getBonsaiShape()
    if (shape.length === 0) {
      return { shiftedShape: [], shapeHeight: 0 }
    }
    const yCoords = shape.map(p => p.y)
    const minY = Math.min(...yCoords)
    const maxY = Math.max(...yCoords)
    const height = maxY - minY
    const shifted = shape.map(p => ({ x: p.x, y: p.y - minY }))
    return { shiftedShape: shifted, shapeHeight: height }
  }, [])

  // Generate the dot pattern - memoized for performance
  const dots = useMemo(() => {
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
    // More delays: increase the delay step and the max delay
    const delayStep = 0.5 // was 0.1
    const maxDelay = 8 // was 4
    shiftedShape.forEach(({ x, y }, index) => {
      newDots.push({
        x,
        y,
        baseOpacity: 0.8,
        color: colors.bonsai,
        isBonsai: true,
        animationDelay: (index * delayStep) % maxDelay,
        size: dotSizes.bonsai,
      })
    })

    return newDots
  }, [colors.bonsai, dotSizes.bonsai, shiftedShape])

  // Calculate the scale factor based on the width and gridSize - memoized for performance
  const scaleFactor = useMemo(() =>
    typeof width === "number" ? width / gridSize : 12,
    [width, gridSize]
  )

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
          0% {
            opacity: 0.9;
            transform: scale(1);
            background-color: #2D5A3D;
          }
          25% {
            opacity: 1;
            transform: scale(1.05);
            background-color: #4AE582;
          }
          50% {
            opacity: 0.8;
            transform: scale(1);
            background-color: #1A4A32;
          }
          75% {
            opacity: 1;
            transform: scale(1.03);
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
          key={`${dot.x}-${dot.y}-${index}`}
          className="absolute rounded-full"
          style={{
            left: `${dot.x * scaleFactor}px`,
            top: `${dot.y * scaleFactor + verticalPadding}px`,
            width: `${dot.size}px`,
            height: `${dot.size}px`,
            backgroundColor: dot.color,
            opacity: dot.baseOpacity,
            animation: `bonsaiPulse 4s infinite ease-in-out ${dot.animationDelay}s`,
            zIndex: 10,
            willChange: 'transform, opacity',
          }}
        />
      ))}
    </div>
  )
}