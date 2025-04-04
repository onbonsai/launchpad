// import { Darker_Grotesque } from 'next/font/google';

// export const brandFont = Darker_Grotesque({
//     subsets: ['latin'],
//     variable: '--font-brand',
//     display: 'swap',
// });

import localFont from "next/font/local";

export const brandFont = localFont({
    src: "./abc-favorit.woff2",
});