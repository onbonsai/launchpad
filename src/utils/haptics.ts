/**
 * Haptic feedback utility for Bonsai PWA
 * Provides tactile feedback using the Vibration API
 */

// Vibration patterns for different interactions
export const HapticPatterns = {
  // Quick tap feedback
  light: [10],
  
  // Button press feedback
  medium: [50],
  
  // Success feedback
  success: [100, 50, 100],
  
  // Error feedback
  error: [100, 100, 100, 100, 100],
  
  // Notification feedback
  notification: [200, 100, 200],
  
  // Trading action feedback
  trade: [75, 25, 75],
  
  // Long press feedback
  longPress: [150],
  
  // Selection feedback
  select: [25],
  
  // Navigation feedback
  navigation: [30],
  
  // Collect/mint feedback
  collect: [100, 50, 50, 50, 100],
};

type HapticPatternKey = keyof typeof HapticPatterns;

class HapticManager {
  private isSupported: boolean;
  private isEnabled: boolean;

  constructor() {
    this.isSupported = 'vibrate' in navigator;
    // Check if user has disabled haptics in localStorage
    this.isEnabled = localStorage.getItem('haptics-enabled') !== 'false';
  }

  /**
   * Check if haptic feedback is supported on this device
   */
  isHapticSupported(): boolean {
    return this.isSupported;
  }

  /**
   * Check if haptic feedback is currently enabled
   */
  isHapticEnabled(): boolean {
    return this.isEnabled && this.isSupported;
  }

  /**
   * Enable or disable haptic feedback
   */
  setHapticEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    localStorage.setItem('haptics-enabled', enabled.toString());
  }

  /**
   * Trigger a vibration with the specified pattern
   */
  vibrate(pattern: number | number[]): boolean {
    if (!this.isHapticEnabled()) {
      return false;
    }

    try {
      return navigator.vibrate(pattern);
    } catch (error) {
      console.warn('Haptic vibration failed:', error);
      return false;
    }
  }

  /**
   * Trigger a predefined haptic pattern
   */
  triggerHaptic(patternKey: HapticPatternKey): boolean {
    const pattern = HapticPatterns[patternKey];
    return this.vibrate(pattern);
  }

  /**
   * Stop any ongoing vibration
   */
  stop(): boolean {
    if (!this.isSupported) {
      return false;
    }

    try {
      return navigator.vibrate(0);
    } catch (error) {
      console.warn('Failed to stop haptic vibration:', error);
      return false;
    }
  }

  /**
   * Trigger haptic feedback for button interactions
   */
  button(): boolean {
    return this.triggerHaptic('medium');
  }

  /**
   * Trigger haptic feedback for successful actions
   */
  success(): boolean {
    return this.triggerHaptic('success');
  }

  /**
   * Trigger haptic feedback for errors
   */
  error(): boolean {
    return this.triggerHaptic('error');
  }

  /**
   * Trigger haptic feedback for notifications
   */
  notification(): boolean {
    return this.triggerHaptic('notification');
  }

  /**
   * Trigger haptic feedback for trading actions
   */
  trade(): boolean {
    return this.triggerHaptic('trade');
  }

  /**
   * Trigger haptic feedback for navigation
   */
  navigation(): boolean {
    return this.triggerHaptic('navigation');
  }

  /**
   * Trigger haptic feedback for collect/mint actions
   */
  collect(): boolean {
    return this.triggerHaptic('collect');
  }

  /**
   * Trigger light haptic feedback for selections
   */
  select(): boolean {
    return this.triggerHaptic('select');
  }

  /**
   * Create a custom vibration pattern
   */
  custom(pattern: number[]): boolean {
    return this.vibrate(pattern);
  }
}

// Export a singleton instance
export const haptics = new HapticManager();

// Convenience functions
export const triggerHaptic = (pattern: HapticPatternKey) => haptics.triggerHaptic(pattern);
export const isHapticSupported = () => haptics.isHapticSupported();
export const isHapticEnabled = () => haptics.isHapticEnabled();
export const setHapticEnabled = (enabled: boolean) => haptics.setHapticEnabled(enabled);

// React hook for haptic feedback
export const useHaptics = () => {
  return {
    haptics,
    triggerHaptic,
    isSupported: isHapticSupported(),
    isEnabled: isHapticEnabled(),
    setEnabled: setHapticEnabled,
  };
}; 