import React, { useState } from "react";
import Link from "next/link";

const MigrationBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white relative z-50">
      <div className="mx-auto max-w-7xl px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-white">
              <span className="md:hidden">Bonsai Launchpad has migrated to Iasnob!</span>
              <span className="hidden md:inline">
                📢 The Bonsai Launchpad has been migrated to IASNOB. $BONSAI is dead, long live $IASNOB!
              </span>
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              href="https://fountain.ink/p/bonsai/bonsai-is-dead-long-live-iasnob"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-emerald-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-emerald-50 transition-colors"
            >
              Read Announcement
            </Link>
            <button type="button" onClick={() => setIsVisible(false)} className="text-white hover:text-emerald-200 p-1">
              <span className="sr-only">Dismiss</span>
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MigrationBanner;
