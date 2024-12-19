import React from 'react';

interface ViewSelectorProps {
  activeView: string;
  setActiveView: (view: string) => void;
}

export const MobileViewSelector = ({ activeView, setActiveView }: ViewSelectorProps) => {
  return (
    <div className="flex w-full mt-4 gap-2 mb-4 lg:hidden bg-card rounded-xl">
      <button
        onClick={() => setActiveView('profile')}
        className={`flex-1 py-2 px-4 rounded-xl ${
          activeView === 'profile' ? 'bg-white text-true-black' : 'bg-transparent'
        }`}
      >
        Profile
      </button>
      <button
        onClick={() => setActiveView('holdings')}
        className={`flex-1 py-2 px-4 rounded-xl ${
          activeView === 'holdings' ? 'bg-white text-true-black' : 'bg-transparent'
        }`}
      >
        Holdings
      </button>
      <button
        onClick={() => setActiveView('feed')}
        className={`flex-1 py-2 px-4 rounded-xl ${
          activeView === 'feed' ? 'bg-white text-true-black' : 'bg-transparent'
        }`}
      >
        Feed
      </button>
    </div>
  );
};

export default MobileViewSelector;