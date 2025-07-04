import { FC, useState, useEffect } from 'react';
import { useHaptics } from '@src/utils/haptics';
import { Button } from '@src/components/Button';

interface HapticSettingsProps {
  className?: string;
}

export const HapticSettings: FC<HapticSettingsProps> = ({ className = '' }) => {
  const { isSupported, isEnabled, setEnabled, haptics } = useHaptics();
  const [localEnabled, setLocalEnabled] = useState(isEnabled);

  // Sync with the global haptic state
  useEffect(() => {
    setLocalEnabled(isEnabled);
  }, [isEnabled]);

  const handleToggle = () => {
    const newState = !localEnabled;
    setLocalEnabled(newState);
    setEnabled(newState);
    
    // Give haptic feedback when enabling (but not when disabling)
    if (newState) {
      setTimeout(() => haptics.success(), 100);
    }
  };

  const testHaptic = () => {
    haptics.notification();
  };

  // Don't show the setting if haptics aren't supported
  if (!isSupported) {
    return null;
  }

  return (
    <div className={`bg-card rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-white font-medium text-base">Haptic Feedback</h3>
          <p className="text-white/60 text-sm mt-1">
            Get tactile feedback when interacting with buttons and actions
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={localEnabled}
            onChange={handleToggle}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-highlight"></div>
        </label>
      </div>
      
      {localEnabled && (
        <div className="border-t border-white/10 pt-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={testHaptic}
            className="w-full"
            enableHaptics={false} // Don't double-trigger haptics
          >
            Test Haptic Feedback
          </Button>
        </div>
      )}
    </div>
  );
};

export default HapticSettings; 