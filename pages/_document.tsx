import Document, { Head, Html, Main, NextScript } from "next/document";
import React from "react";

class MyDocument extends Document {
  render() {
    return (
      <Html lang="en" className="w-full h-full bg-background">
        <Head>
          <link rel="shortcut icon" href="/static/images/favicon/favicon.ico" />
          <link rel="apple-touch-icon" sizes="180x180" href="/static/images/favicon/apple-touch-icon.png" />
          <link rel="icon" type="image/png" sizes="32x32" href="/static/images/favicon/favicon-32x32.png" />
          <link rel="icon" type="image/png" sizes="16x16" href="/static/images/favicon/favicon-16x16.png" />
          <link rel="manifest" href="/manifest.json" />
          <link rel="mask-icon" href="/static/images/favicon/safari-pinned-tab.svg" color="#5bbad5" />
          <meta name="msapplication-TileColor" content="#da532c" />
          <meta name="theme-color" content="#ffffff" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
          <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;700&display=swap" rel="stylesheet" />

          <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons" />
          <link
            href="https://fonts.googleapis.com/css?family=Source+Code+Pro:500,500italic,300,300italic,400,400italic&display=optional"
            rel="stylesheet"
            type="text/css"
          />
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
