/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg:      'var(--bg)',
        bg2:     'var(--bg2)',
        bg3:     'var(--bg3)',
        bg4:     'var(--bg4)',
        border:  'var(--border)',
        border2: 'var(--border2)',
        acc:     'var(--acc)',
        acc2:    'var(--acc2)',
        green:   'var(--green)',
        red:     'var(--red)',
        amber:   'var(--amber)',
        purple:  'var(--purple)',
        blue:    'var(--blue)',
        t1:      'var(--t1)',
        t2:      'var(--t2)',
        t3:      'var(--t3)',
        /* Legacy */
        accent:        'var(--acc)',
        'accent-hover':'var(--acc2)',
      },
      fontFamily: {
        sans: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderColor: {
        DEFAULT: 'var(--border)',
      },
    },
  },
  plugins: [],
};
