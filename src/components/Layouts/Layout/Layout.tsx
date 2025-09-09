import { FC, ReactNode, useState, createContext, useEffect, useRef } from "react";
import { Header } from "@components/Header";
import { brandFont } from "../../../fonts/fonts";
import { useRouter } from "next/router";
import PWAInstallPrompt from "../../PWAInstallPrompt";
import OfflineIndicator from "../../OfflineIndicator";
import { Footer } from "@src/components/Footer/Footer";
import { useAccount } from "wagmi";
import MigrationBanner from "@src/components/MigrationBanner/MigrationBanner";

// Context to allow toggling chat from anywhere
export const ChatSidebarContext = createContext<{
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
  isRemixing: boolean;
  setIsRemixing: (isRemixing: boolean) => void;
}>({
  isChatOpen: false,
  setIsChatOpen: () => {},
  isRemixing: false,
  setIsRemixing: () => {}
});

interface LayoutProps {
  children: ReactNode;
}

export const Layout: FC<LayoutProps> = ({ children }) => {
  const router = useRouter();
  const { isConnected } = useAccount();
  const remixParam = !!router.query.remix;
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isRemixing, setIsRemixing] = useState(false);
  const hasHandledRemixParam = useRef(false);

  // Handle remix param only once when wallet is connected (with 1 second delay)
  useEffect(() => {
    if (remixParam && isConnected && !hasHandledRemixParam.current) {
      const timer = setTimeout(() => {
        setIsChatOpen(true);
        hasHandledRemixParam.current = true;
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [remixParam, isConnected]);

  // Reset chat window state and ref when route changes (but not when just handling remix param)
  useEffect(() => {
    // Don't reset if we just set isChatOpen due to remix param
    if (!remixParam) {
      setIsChatOpen(false);
      setIsRemixing(false);
    }
    hasHandledRemixParam.current = false;
  }, [router.asPath, remixParam]);

  // Prevent body scroll when chat is open
  useEffect(() => {
    if (isChatOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isChatOpen]);

  return (
    <ChatSidebarContext.Provider value={{ isChatOpen, setIsChatOpen, isRemixing, setIsRemixing }}>
      <div
        className={`${brandFont.className} min-h-screen flex flex-col relative transition-all duration-300`}
      >
        <MigrationBanner />
        <OfflineIndicator />
        <Header />
        <div className="relative flex-1 flex flex-col w-full max-w-full flex-grow min-h-full transition-transform duration-300">
          <main className="flex-1 flex flex-col bg-background text-secondary w-full max-w-full flex-grow min-h-full">
            {children}
          </main>
          <Footer />
        </div>
        <PWAInstallPrompt />
      </div>
    </ChatSidebarContext.Provider>
  );
};
