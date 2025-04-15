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
          bullish: "#0B9981",
          bearish: "#CD3030",
        },
      },
    ],
  },
  theme: {
    extend: {
      keyframes: {
        'fade-in-down': {
          '0%': {
            opacity: '0',
            transform: 'translateY(-20px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)'
          },
        }
      },
      animation: {
        'fade-in-down': 'fade-in-down 0.5s ease-out forwards'
      },
      screens: {
        "xs": "510px",
        "md-plus": "920px",
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
        'true-black': "#000",
        navy: "#232F3F",
        background: "#000",
        "dark-grey": "#262626",
        "button": "rgba(255, 255, 255, 0.08)",
        "card": "rgba(255, 255, 255, 0.08)",
        footer: "rgba(255, 255, 255, 0.6)",
        "card-dark": "rgba(255, 255, 255, 0.02)",
        "card-light": "rgba(255, 255, 255, 0.04)",
        "card-lightest": "rgba(255, 255, 255, 0.12)",
        bullish: "#0B9981",
        bearish: "#CD3030",
        // New branding
        "brand-highlight": "#5be39d",
        "brand-primary": "#4D7F79",
        white: "#F3F6FF",
        black: "#191919",
        secondary: "#F3F6FF",
        "brand-secondary": "#1D212A",
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
