import { FC, ReactNode, useState, createContext, useEffect } from "react";
import { Header } from "@components/Header";
import { Footer } from "../../Footer/Footer";
import { brandFont } from "../../../fonts/fonts";
import { useRouter } from "next/router";

// Context to allow toggling chat from anywhere
export const ChatSidebarContext = createContext<{
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
}>({ isChatOpen: false, setIsChatOpen: () => {} });

interface LayoutProps {
  children: ReactNode;
}

export const Layout: FC<LayoutProps> = ({ children }) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const sidebarWidth = 320; // px, matches w-80
  const router = useRouter();

  // Reset chat window state when route changes
  useEffect(() => {
    setIsChatOpen(false);
  }, [router.asPath]);

  return (
    <ChatSidebarContext.Provider value={{ isChatOpen, setIsChatOpen }}>
      <div
        className={`${brandFont.className} min-h-screen flex flex-col relative transition-all duration-300 ${
          isChatOpen ? "mr-80 sm:mr-96" : ""
        }`}
      >
        <Header />
        <div className="relative flex-1 flex flex-col w-full max-w-full flex-grow min-h-full transition-transform duration-300">
          <main className="flex-1 flex flex-col bg-background text-secondary w-full max-w-full flex-grow min-h-full">
            {children}
          </main>
          <Footer />
        </div>
        {/* Chat Sidebar, fixed and underneath main content */}
        <div className="fixed top-0 right-0 h-full w-80 sm:w-96 z-30 pointer-events-none">
          {/* The actual ChatWindowButton will be rendered here via portal or layout consumer */}
        </div>
      </div>
    </ChatSidebarContext.Provider>
  );
};
