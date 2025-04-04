import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnimatedTextProps {
  lines: string[];
  duration?: number; // total duration in seconds
  className?: string;
}

export const AnimatedText = ({ lines, duration = 10, className = '' }: AnimatedTextProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalTime = (duration * 1000) / lines.length;

  useEffect(() => {
    if (currentIndex >= lines.length - 1) return; // Stop at last line

    const timer = setInterval(() => {
      setCurrentIndex(prev => Math.min(prev + 1, lines.length - 1));
    }, intervalTime);

    return () => clearInterval(timer);
  }, [lines.length, intervalTime, currentIndex]);

  return (
    <div className={`relative h-[1.5em] ${className}`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="absolute w-full text-center"
        >
          {lines[currentIndex]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};