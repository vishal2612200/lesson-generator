/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    // Core layout and spacing
    'p-2', 'p-4', 'p-6', 'p-8',
    'm-2', 'm-4', 'm-6', 'm-8',
    'mx-auto', 'my-2', 'my-4',
    'mt-2', 'mt-4', 'mb-2', 'mb-4',
    'space-x-2', 'space-x-4', 'space-y-2', 'space-y-4',
    
    // Sizing
    'w-6', 'w-10', 'w-12', 'w-16', 'h-6', 'h-10', 'h-12', 'h-16',
    'max-w-sm', 'max-w-md', 'max-w-lg', 'max-w-xl',
    'min-h-screen',
    
    // Flexbox and Grid
    'flex', 'flex-shrink-0', 'items-center', 'justify-center',
    'grid', 'grid-cols-1', 'grid-cols-2', 'gap-4',
    
    // Colors - backgrounds
    'bg-white', 'bg-gray-50', 'bg-gray-100', 'bg-gray-500',
    'bg-blue-50', 'bg-blue-500', 'bg-green-50', 'bg-green-500',
    'bg-red-50', 'bg-red-500', 'bg-yellow-50',
    
    // Colors - text
    'text-black', 'text-white', 'text-gray-500', 'text-gray-700',
    'text-blue-500', 'text-blue-800', 'text-green-500', 'text-green-800',
    'text-red-500', 'text-yellow-800',
    'text-sm', 'text-lg', 'text-xl', 'text-2xl',
    
    // Borders and rounded
    'border', 'border-2', 'border-blue-200', 'border-green-200', 'border-red-200', 'border-yellow-200',
    'rounded', 'rounded-lg', 'rounded-xl', 'rounded-full',
    
    // Shadows and effects
    'shadow-md', 'shadow-lg',
    
    // Font styles
    'font-medium', 'font-semibold', 'font-bold',
    'text-center',
    
    // Hover states
    'hover:bg-blue-700',
    
    // Animations
    'animate-spin',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        secondary: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['Fira Code', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      animation: {
        'fadeIn': 'fadeIn 0.6s ease-out forwards',
        'slideInRight': 'slideInRight 0.6s ease-out forwards',
        'slideInLeft': 'slideInLeft 0.6s ease-out forwards',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(30px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-30px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      boxShadow: {
        'inner-lg': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.1)',
        'glow': '0 0 20px rgba(59, 130, 246, 0.5)',
        'glow-lg': '0 0 40px rgba(59, 130, 246, 0.6)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
