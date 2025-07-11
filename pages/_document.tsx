import Document, { Head, Html, Main, NextScript } from "next/document";
import React from "react";
import { SITE_URL } from "@src/constants/constants";

class MyDocument extends Document {
  render() {
    return (
      <Html lang="en" className="w-full h-full bg-background">
        <Head>
          <link rel="shortcut icon" href="/favicon.ico" />
          <link href="/webclip.png" rel="apple-touch-icon image_src" />
          <meta name="msapplication-TileColor" content="#da532c" />
          <meta name="theme-color" content="#000000" />

          {/* PWA Manifest */}
          <link rel="manifest" href="/manifest.json" />

          {/* Apple Touch Icons */}
          <link rel="apple-touch-icon" href="/webclip.png" />
          <link rel="apple-touch-icon" sizes="152x152" href="/webclip.png" />
          <link rel="apple-touch-icon" sizes="180x180" href="/webclip.png" />
          <link rel="apple-touch-icon" sizes="167x167" href="/webclip.png" />

          {/* Apple Mobile Web App Capable */}
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          <meta name="apple-mobile-web-app-title" content="Bonsai" />

          {/* Microsoft Tiles */}
          <meta name="msapplication-TileImage" content="/logo.png" />
          <meta name="msapplication-config" content="/browserconfig.xml" />

          {/* Font preconnects for performance - actual fonts loaded via next/font and next/script */}
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
          <link rel="preconnect" href="https://use.typekit.net" />
          <link rel="preconnect" href="https://p.typekit.net" />

          {/* Base OpenGraph Meta Tags - These will be overridden by HandleSEO.jsx */}
          <meta property="og:logo" content={`${SITE_URL}/logo.png`} />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
