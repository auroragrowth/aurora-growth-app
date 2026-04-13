import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx,js,jsx,mdx}',
    './components/**/*.{ts,tsx,js,jsx,mdx}',
    './lib/**/*.{ts,tsx,js,jsx,mdx}',
    './pages/**/*.{ts,tsx,js,jsx,mdx}',
  ],
}

export default config
