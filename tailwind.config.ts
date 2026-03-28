import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg:       '#f0f4f0',
        surface:  '#ffffff',
        surface2: '#f7faf7',
        border:   '#d4e4d4',
        accent:   '#2d7a4f',
        accent2:  '#3aa063',
        text:     '#1a2e1a',
        text2:    '#4a6b4a',
        text3:    '#8aaa8a',
        green:    '#2d7a4f',
        red:      '#c0392b',
        blue:     '#2563eb',
        amber:    '#d97706',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        body:    ['DM Sans', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '10px',
        lg: '14px',
        xl: '18px',
      },
      boxShadow: {
        card:  '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)',
        soft:  '0 2px 8px rgba(45,122,79,0.10)',
        modal: '0 8px 40px rgba(0,0,0,0.18)',
      },
    },
  },
  plugins: [],
};
export default config;