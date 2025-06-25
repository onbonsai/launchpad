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
          
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
          <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;700&display=swap" rel="stylesheet" />

          <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons" />
          <link
            href="https://fonts.googleapis.com/css?family=Source+Code+Pro:500,500italic,300,300italic,400,400italic&display=optional"
            rel="stylesheet"
            type="text/css"
          />

          {/* Base OpenGraph Meta Tags - These will be available to crawlers */}
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content="Bonsai Smart Media" />
          <meta property="og:locale" content="en_US" />
          <meta property="og:url" content={SITE_URL} />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
          <meta property="og:logo" content={`${SITE_URL}/logo.png`} />
          <meta property="og:image:alt" content="Bonsai" />

          {/* Base Twitter Meta Tags */}
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:site" content="@onbonsai" />
          <meta name="twitter:creator" content="@onbonsai" />
          <meta name="twitter:image" content={`${SITE_URL}/opengraph-image.jpg`} />

          <meta name="twitter:player" content={SITE_URL} />
          <meta name="twitter:player:width" content="360" />
          <meta name="twitter:player:height" content="560" />
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
