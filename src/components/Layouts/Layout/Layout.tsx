import { FC, ReactNode } from "react";
import { Header } from "@components/Header";
import { Footer } from "../../Footer/Footer";
import { brandFont } from '../../../fonts/fonts';

interface LayoutProps {
  children: ReactNode;
}

export const Layout: FC<LayoutProps> = ({ children }) => {
  return (
    <div className={`${brandFont.className} min-h-screen flex flex-col`}>
      <Header />
      <main className="flex-1 flex flex-col bg-background text-secondary w-full max-w-full flex-grow min-h-full">
        {children}
      </main>
      <Footer />
    </div>
  );
};