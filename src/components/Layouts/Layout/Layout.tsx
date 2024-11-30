import { FC, ReactNode } from "react";

import { Header } from "@components/Header";
import { Footer } from "../../Footer/Footer";
import { inter } from '../../../fonts/fonts';

interface LayoutProps {
  children: ReactNode;
}

export const Layout: FC<LayoutProps> = ({ children }) => {
  return (
    <>
      <div className={`${inter.className}`}>
        <Header />
        <main className={`bg-background text-secondary w-full max-w-full`}>{children}</main>
        <Footer />
      </div>
    </>
  );
};
