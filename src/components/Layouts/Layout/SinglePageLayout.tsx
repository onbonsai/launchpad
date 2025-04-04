import { FC, ReactNode } from "react";
import { Header } from "@components/Header";
import { Footer } from "../../Footer/Footer";
import { brandFont } from '../../../fonts/fonts';

interface LayoutProps {
  children: ReactNode;
}

export const SinglePageLayout: FC<LayoutProps> = ({ children }) => {
  return (
    <div className={`${brandFont.className} flex flex-col min-h-screen xs:h-screen xs:overflow-hidden`}>
      <Header />
      <main className="flex-1 flex flex-col bg-background text-secondary w-full max-w-full flex-grow  xs:overflow-auto">
        {children}
      </main>
      <Footer short />
    </div>
  );
};