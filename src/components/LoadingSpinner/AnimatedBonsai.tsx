"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"

interface AnimatedBonsaiProps {
  color?: string
  duration?: number
  width?: number
  height?: number
  strokeWidth?: number
  loop?: boolean
}

export default function AnimatedBonsai({
  color = "#c1ffd9",
  duration = 3,
  width = 250,
  height = 250,
  strokeWidth = 2,
  loop = true,
}: AnimatedBonsaiProps) {
  const [pathLength, setPathLength] = useState(0)
  const [key, setKey] = useState(0)

  useEffect(() => {
    // Start the animation after component mounts
    setPathLength(1)

    // If loop is enabled, restart animation when it completes
    if (loop) {
      const timer = setTimeout(() => {
        setPathLength(0)
        setTimeout(() => setPathLength(1), 10)
      }, duration * 1000)

      return () => clearTimeout(timer)
    }
  }, [duration, loop, key])

  // Function to manually restart the animation
  const restartAnimation = () => {
    setPathLength(0)
    setKey((prev) => prev + 1)
    setTimeout(() => setPathLength(1), 10)
  }

  return (
    <div className="flex items-center justify-center" style={{ width, height }}>
      <motion.svg
        key={key}
        width="100%"
        height="100%"
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Simplified bonsai tree shape */}
        <motion.path
          d="M100 20
          L100 140
          M100 20
          C100 20, 70 20, 60 25
          C50 30, 45 40, 55 45
          C65 50, 100 50, 100 50
          M100 50
          C100 50, 135 50, 145 45
          C155 40, 150 30, 140 25
          C130 20, 100 20, 100 20
          M100 50
          L100 80
          M100 80
          C100 80, 60 80, 50 85
          C40 90, 35 100, 45 105
          C55 110, 100 110, 100 110
          M100 80
          C100 80, 140 80, 150 85
          C160 90, 165 100, 155 105
          C145 110, 100 110, 100 110
          M100 110
          L100 140
          M100 140
          C100 140, 40 140, 30 145
          C20 150, 15 160, 25 165
          C35 170, 100 170, 100 170
          M100 140
          C100 140, 160 140, 170 145
          C180 150, 185 160, 175 165
          C165 170, 100 170, 100 170
          M100 170
          L100 180
          C100 180, 85 180, 80 185
          C75 190, 80 195, 100 195
          C120 195, 125 190, 120 185
          C115 180, 100 180, 100 180"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength }}
          transition={{
            duration,
            ease: "easeInOut",
          }}
        />

        {/* Animated dot that traces the outline */}
        {loop && (
          <motion.circle
            cx="0"
            cy="0"
            r={strokeWidth * 1.5}
            fill={color}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <motion.animateMotion
              path="M100 20
              L100 50
              C100 50, 70 20, 60 25
              C50 30, 45 40, 55 45
              C65 50, 100 50, 100 50
              C100 50, 135 50, 145 45
              C155 40, 150 30, 140 25
              C130 20, 100 20, 100 20
              L100 80
              C100 80, 60 80, 50 85
              C40 90, 35 100, 45 105
              C55 110, 100 110, 100 110
              C100 80, 140 80, 150 85
              C160 90, 165 100, 155 105
              C145 110, 100 110, 100 110
              L100 140
              C100 140, 40 140, 30 145
              C20 150, 15 160, 25 165
              C35 170, 100 170, 100 170
              C100 140, 160 140, 170 145
              C180 150, 185 160, 175 165
              C165 170, 100 170, 100 170
              L100 180
              C100 180, 85 180, 80 185
              C75 190, 80 195, 100 195
              C120 195, 125 190, 120 185
              C115 180, 100 180, 100 180"
              dur={`${duration * 1.2}s`}
              repeatCount={loop ? "indefinite" : "1"}
            />
          </motion.circle>
        )}
      </motion.svg>
    </div>
  )
}
