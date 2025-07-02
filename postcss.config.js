module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    // Simplified CSS optimization - avoid complex PurgeCSS config that conflicts with Next.js
    ...(process.env.NODE_ENV === 'production' && {
      cssnano: {
        preset: 'default',
      },
    }),
  },
}
