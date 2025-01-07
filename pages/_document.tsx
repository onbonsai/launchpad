import Document, { Head, Html, Main, NextScript } from "next/document";
import React from "react";

const frameData = {
  // Frame spec version. Required.
  // Example: "next"
  version: "next",

  // Frame image.
  // Max 512 characters.
  // Image must be 3:2 aspect ratio and less than 10 MB.
  // Example: "https://yoink.party/img/start.png"
  imageUrl: "https://launch.bonsai.meme/splash.jpg",

  // Button attributes
  button: {
    // Button text.
    // Max length of 32 characters.
    // Example: "Yoink Flag"
    title: "Trade 💰",

    // Action attributes
    action: {
      // Action type. Must be "launch_frame".
      type: "launch_frame",

      // App name
      // Max length of 32 characters.
      // Example: "Yoink!"
      name: "Bonsai Launchpad",

      // Frame launch URL.
      // Max 512 characters.
      // Example: "https://yoink.party/"
      url: "https://launch.bonsai.meme/",

      // Splash image URL.
      // Max 512 characters.
      // Image must be 200x200px and less than 1MB.
      // Example: "https://yoink.party/img/splash.png"
      splashImageUrl: "https://launch.bonsai.meme/splash.jpg",

      // Hex color code.
      // Example: "#eeeee4"
      splashBackgroundColor: "#000000",
    },
  },
};

class MyDocument extends Document {
  render() {
    return (
      <Html lang="en" className="w-full h-full bg-background">
        <Head>
          <link rel="shortcut icon" href="/favicon.ico" />
          <link href="/webclip.png" rel="apple-touch-icon image_src" />
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
          <meta name="fc:frame" content={JSON.stringify(frameData)} />
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
