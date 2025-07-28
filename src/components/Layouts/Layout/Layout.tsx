import { FC, ReactNode, useState, createContext, useEffect } from "react";
import { Header } from "@components/Header";
import { brandFont } from "../../../fonts/fonts";
import { useRouter } from "next/router";
import PWAInstallPrompt from "../../PWAInstallPrompt";
import OfflineIndicator from "../../OfflineIndicator";
import { Footer } from "@src/components/Footer/Footer";

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
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isRemixing, setIsRemixing] = useState(false);
  const router = useRouter();

  // Reset chat window state when route changes
  useEffect(() => {
    setIsChatOpen(false);
    setIsRemixing(false);
  }, [router.asPath]);

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
