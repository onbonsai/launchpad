/**
 * Simple haptic feedback utility for Bonsai PWA
 */

// Simple haptic feedback functions
export const haptics = {
  light: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  },
  
  medium: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  },
  
  success: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100]);
    }
  },
  
  error: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 100, 100, 100, 100]);
    }
  },
  
  trade: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([75, 25, 75]);
    }
  }
}; 