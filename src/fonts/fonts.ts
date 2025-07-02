// import { Darker_Grotesque } from 'next/font/google';

// export const brandFont = Darker_Grotesque({
//     subsets: ['latin'],
//     variable: '--font-brand',
//     display: 'swap',
// });

import { Open_Sans, Source_Code_Pro } from 'next/font/google';
import localFont from "next/font/local";

// Optimized Google Fonts with next/font
export const openSans = Open_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
  variable: '--font-open-sans',
});

export const sourceCodePro = Source_Code_Pro({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  display: 'optional',
  variable: '--font-source-code-pro',
});

// Local font (Favorit) - already optimized
export const brandFont = localFont({
    src: "./abc-favorit.woff2",
    variable: '--font-brand',
    display: 'swap',
});