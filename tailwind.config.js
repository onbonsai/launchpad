/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    // "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  daisyui: {
    themes: [
      {
        mytheme: {
          primary: "#087CA7",
          secondary: "#FFFFFF",
          "secondary-content": "#0F1111",
          accent: "#1FB2A6",
          neutral: "#262626",
          "neutral-content": "#FFFFFF",
          "base-100": "#1f2937",
          info: "#3ABFF8",
          success: "#36D399",
          warning: "#FBBD23",
          error: "#F87272",
        },
      },
    ],
  },
  theme: {
    extend: {
      screens: {
        "xs": "510px",
        "md-plus": "832px",
      },
      fontFamily: {
        sans: ["Favorit", "sans-serif"],
        owners: ["owners-narrow", "sans-serif"],
        ownersx: ["owners-xnarrow", "sans-serif"],
        "helvetica-display": ["HelveticaNowDisplay", "sans-serif"],
        "helvetica-text": ["HelveticaNowText", "sans-serif"],
        "helvetica-micro": ["HelveticaNowMicro", "sans-serif"],
        "sf-pro-text": ["SF Pro Text", "system-ui", "Open Sans", "sans-serif"],
        "top-secret": ["TopSecret", "sans-serif"],
      },
      backgroundSize: {
        "size-200": "200% 200%",
      },
      backgroundPosition: {
        "pos-0": "0% 0%",
        "pos-100": "100% 100%",
      },
      colors: {
        red: {
          300: "#612625",
          400: "#612625",
          500: "#7B0100",
          600: "#5F0706",
          700: "#570100",
          800: "#350000",
        },
        grey: {
          200: "#F6F6F6",
          // border default
          300: "#F9F9F9",
          // border hover
          400: "#F9F9F9",
          // light default gradient
          500: "#EEEDED",
          // strong default gradient
          600: "#D8D8D8",
          // light hover gradient
          700: "#E0E0E0",
          // strnog hover gradient
          800: "#C6C6C6",
        },
        blue: {
          300: "#64A3BA",
          400: "#4D8194",
          500: "#087CA7",
          600: "#066588",
          700: "#096384",
          800: "#044963",
        },
        white: "#FFFFFF",
        black: "#0F1111",
        'true-black': "#000",
        navy: "#232F3F",
        background: "#000",
        primary: "#FF6400",
        secondary: "#FFF",
        "dark-grey": "#262626",
        "button": "rgba(255, 255, 255, 0.08)",
        "card": "rgba(255, 255, 255, 0.08)",
        footer: "rgba(255, 255, 255, 0.6)",
        "card-dark": "rgba(255, 255, 255, 0.02)",
        "card-light": "rgba(255, 255, 255, 0.04)",
        "card-lightest": "rgba(255, 255, 255, 0.12)",
        bullish: "#0B9981",
        bearish: "#CD3030",
      },
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
    require("@tailwindcss/forms"),
    require("daisyui"),
    require("tailwindcss-gradients")
  ],
};
