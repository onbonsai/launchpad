module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    // CSS optimization only in production
    ...(process.env.NODE_ENV === 'production' && {
      '@fullhuman/postcss-purgecss': {
        content: [
          './pages/**/*.{js,ts,jsx,tsx}',
          './src/**/*.{js,ts,jsx,tsx}',
        ],
        defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || [],
        safelist: [
          // Keep important classes that might be added dynamically
          /^btn/,
          /^card/,
          /^modal/,
          /^dropdown/,
          /^tooltip/,
          /^badge/,
          /^alert/,
          /^toast/,
          /^loading/,
          /^progress/,
          /^range/,
          /^toggle/,
          /^checkbox/,
          /^radio/,
          // Animation classes
          /^animate-/,
          // Font classes
          /^font-/,
          // Dynamic color classes
          /^(bg|text|border)-(brand|bullish|bearish)/,
          // Keep Lens and React Hot Toast classes
          /^lens-/,
          /^react-hot-toast/,
          // Keep Web3 wallet classes
          /^ck-/,
          /^connectkit/,
          // Keep TradingView classes (if using charting library)
          /^tv-/,
          /^tradingview/,
        ],
      },
      cssnano: {
        preset: ['default', {
          discardComments: { removeAll: true },
          normalizeWhitespace: true,
          discardEmpty: true,
          minifySelectors: true,
          mergeLonghand: true,
          mergeRules: true,
          colormin: true,
          normalizeUrl: true,
          svgo: true,
        }],
      },
    }),
  },
}
