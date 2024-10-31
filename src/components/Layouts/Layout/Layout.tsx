import { FC, ReactNode } from "react";

import { Header } from "@components/Header";

import { Footer } from "../../Footer/Footer";

interface LayoutProps {
  children: ReactNode;
}

export const Layout: FC<LayoutProps> = ({ children }) => {
  return (
    <>
      <Header />
      <main className="bg-background text-secondary font-sans w-full max-w-full">{children}</main>
      <Footer />
    </>
  );
};
