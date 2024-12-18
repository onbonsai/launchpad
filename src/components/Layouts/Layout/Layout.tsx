import { FC, ReactNode } from "react";
import { Header } from "@components/Header";
import { Footer } from "../../Footer/Footer";
import { inter } from '../../../fonts/fonts';

interface LayoutProps {
  children: ReactNode;
}

const footerLinks = [
  {name: "Privacy Policy", href: "/"},
  {name: "Terms & Conditions", href: "/"},
];

export const Layout: FC<LayoutProps> = ({ children }) => {
  return (
    <div className={`${inter.className} min-h-screen flex flex-col`}>
      <Header />
      <main className="flex-1 flex flex-col bg-background text-secondary w-full max-w-full flex-grow min-h-full">
        {children}
      </main>
      <Footer links={footerLinks} />
    </div>
  );
};