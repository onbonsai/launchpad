import { FC, ReactNode, useState, createContext, useEffect } from "react";
import { Header } from "@components/Header";
import { Footer } from "../../Footer/Footer";
import { brandFont } from "../../../fonts/fonts";
import { useRouter } from "next/router";
import useIsMobile from "@src/hooks/useIsMobile";

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
  const sidebarWidth = 320; // px, matches w-80
  const router = useRouter();
  const isMobile = useIsMobile();

  // Reset chat window state when route changes
  useEffect(() => {
    setIsChatOpen(false);
    setIsRemixing(false);
  }, [router.asPath]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isMobile && isChatOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobile, isChatOpen]);

  return (
    <ChatSidebarContext.Provider value={{ isChatOpen, setIsChatOpen, isRemixing, setIsRemixing }}>
      <div
        className={`${brandFont.className} min-h-screen flex flex-col relative transition-all duration-300 ${
          isChatOpen ? (isMobile ? "mr-0" : "mr-80 sm:mr-96") : ""
        }`}
      >
        {(!isMobile || !isChatOpen) && <Header />}
        <div className="relative flex-1 flex flex-col w-full max-w-full flex-grow min-h-full transition-transform duration-300">
          <main className="flex-1 flex flex-col bg-background text-secondary w-full max-w-full flex-grow min-h-full">
            {children}
          </main>
          <Footer />
        </div>
        {/* Chat Sidebar, fixed and underneath main content */}
        <div
          className={`fixed top-0 right-0 h-full ${
            isMobile ? 'w-full' : 'w-80 sm:w-96'
          } z-30 pointer-events-none transition-transform duration-300 ${
            isChatOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* The actual ChatWindowButton will be rendered here via portal or layout consumer */}
        </div>
      </div>
    </ChatSidebarContext.Provider>
  );
};
