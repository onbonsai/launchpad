import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnimatedTextProps {
  lines: string[];
  duration?: number; // duration per line in seconds
  className?: string;
}

export const AnimatedText = ({ lines, duration = 10, className = '' }: AnimatedTextProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shuffledLines, setShuffledLines] = useState<string[]>([]);

  useEffect(() => {
    // Shuffle lines randomly and start from the beginning
    setShuffledLines([...lines].sort(() => Math.random() - 0.5));
    setCurrentIndex(0);
  }, [lines]);

  useEffect(() => {
    if (shuffledLines.length === 0) {
      return;
    }

    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % shuffledLines.length);
    }, duration * 1000);

    return () => clearInterval(timer);
  }, [shuffledLines.length, duration]);

  if (shuffledLines.length === 0) {
    return null;
  }

  return (
    <div className={`relative h-[2em] ${className}`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="absolute w-full text-center tracking-wider"
        >
          <span className="text-brand-highlight/80">
            {shuffledLines[currentIndex]}
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};