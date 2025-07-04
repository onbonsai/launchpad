import React, { useEffect, useState } from "react";
import Head from "next/head";
import { useOfflineRedirect } from "@src/hooks/useOfflineRedirect";
import { usePWA } from "@src/hooks/usePWA";

const OfflinePage: React.FC = () => {
  const [showOnlineMessage, setShowOnlineMessage] = useState(false);
  const { isOnline } = usePWA();

  // Auto-redirect when back online
  useOfflineRedirect({ redirectOnOnline: true });

  // Show online message briefly when connection is restored
  useEffect(() => {
    if (isOnline) {
      setShowOnlineMessage(true);
      const timer = setTimeout(() => {
        setShowOnlineMessage(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  const handleRefresh = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  const handleGoHome = () => {
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  return (
    <>
      <Head>
        <title>You're Offline - Bonsai</title>
        <meta name="description" content="You're currently offline. Check your internet connection." />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      {/* Online Status Banner */}
      {showOnlineMessage && (
        <div className="fixed top-0 left-0 right-0 bg-green-500 text-white text-center py-2 px-4 z-50">
          <div className="flex items-center justify-center space-x-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm font-medium">You're back online! Redirecting...</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full bg-card rounded-2xl shadow-xl p-8 text-center">
          {/* Offline Icon */}
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto mb-4 bg-gray-700 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18.364 5.636l-12.728 12.728m0-12.728l12.728 12.728M8 12l-2-2m0 0l2-2m-2 2l2 2m2-2h.01M16 12l2-2m0 0l-2-2m2 2l-2 2m2-2h-.01"
                />
              </svg>
            </div>
            <div className="w-16 h-1 bg-red-800 rounded-full mx-auto">
              <div className="w-4 h-1 bg-red-500 rounded-full"></div>
            </div>
          </div>

          {/* Content */}
          <h1 className="text-2xl font-bold text-white mb-3">You're Offline</h1>

          <p className="text-gray-300 mb-6 leading-relaxed">
            It looks like you've lost your internet connection. Don't worry - you can still browse cached content.
          </p>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleRefresh}
              className="w-full bg-white text-black py-3 px-6 rounded-lg font-semibold hover:bg-gray-200 transition-colors duration-200"
            >
              Try Again
            </button>

            <button
              onClick={handleGoHome}
              className="w-full bg-gray-700 text-gray-300 py-3 px-6 rounded-lg font-semibold hover:bg-gray-600 transition-colors duration-200"
            >
              Go to Home
            </button>
          </div>

          {/* Network Status */}
          <div className="mt-6 pt-6 border-t border-gray-700">
            <p className="text-xs text-gray-400">
              Your connection will be restored automatically when you're back online
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default OfflinePage;
