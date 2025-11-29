// Design System - QuickBite
// Centralized design tokens for consistent UI across the application

export const COLORS = {
  // Primary Brand Colors - Orange/Amber theme
  primary: {
    50: '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#f97316',  // Main primary color
    600: '#ea580c',
    700: '#c2410c',
    800: '#9a3412',
    900: '#7c2d12',
  },

  // Secondary Colors - Purple/Fuchsia accents
  secondary: {
    50: '#fdf4ff',
    100: '#fae8ff',
    200: '#f5d0fe',
    300: '#f0abfc',
    400: '#e879f9',
    500: '#d946ef',  // Main secondary color
    600: '#c026d3',
    700: '#a21caf',
    800: '#86198f',
    900: '#701a75',
  },

  // Neutral/Gray scale
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },

  // Semantic colors
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
  },

  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
  },

  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
  },

  info: {
    50: '#eff6ff',
    100: '#dbeafe',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
  },
};

export const GRADIENTS = {
  primary: 'bg-gradient-to-r from-orange-500 to-pink-500',
  primaryHover: 'bg-gradient-to-r from-orange-600 to-pink-600',
  secondary: 'bg-gradient-to-r from-purple-500 to-fuchsia-500',
  background: 'bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50',
  card: 'bg-gradient-to-br from-white to-orange-50',
  text: 'bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent',
};

export const TYPOGRAPHY = {
  fontFamily: {
    sans: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    display: '"Inter", ui-sans-serif, system-ui, sans-serif',
  },

  fontSize: {
    xs: '0.75rem',      // 12px
    sm: '0.875rem',     // 14px
    base: '1rem',       // 16px
    lg: '1.125rem',     // 18px
    xl: '1.25rem',      // 20px
    '2xl': '1.5rem',    // 24px
    '3xl': '1.875rem',  // 30px
    '4xl': '2.25rem',   // 36px
    '5xl': '3rem',      // 48px
    '6xl': '3.75rem',   // 60px
  },

  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },

  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },
};

export const SPACING = {
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
  24: '6rem',     // 96px
};

export const BORDER_RADIUS = {
  none: '0',
  sm: '0.25rem',    // 4px
  base: '0.375rem', // 6px
  md: '0.5rem',     // 8px
  lg: '0.75rem',    // 12px
  xl: '1rem',       // 16px
  '2xl': '1.5rem',  // 24px
  full: '9999px',
};

export const SHADOWS = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  glow: '0 0 20px rgba(249, 115, 22, 0.3)',
};

export const TRANSITIONS = {
  fast: '150ms',
  base: '200ms',
  slow: '300ms',
  slower: '500ms',
};

export const BREAKPOINTS = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

export const Z_INDEX = {
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  modalBackdrop: 40,
  modal: 50,
  popover: 60,
  tooltip: 70,
};

// Component-specific constants
export const BUTTON_STYLES = {
  primary: `
    bg-gradient-to-r from-orange-500 to-pink-500
    hover:from-orange-600 hover:to-pink-600
    text-white font-semibold
    px-6 py-3 rounded-lg
    shadow-md hover:shadow-lg
    transition-all duration-200
    disabled:opacity-50 disabled:cursor-not-allowed
  `,

  secondary: `
    bg-white text-orange-600
    border-2 border-orange-500
    hover:bg-orange-50
    font-semibold px-6 py-3 rounded-lg
    shadow-sm hover:shadow-md
    transition-all duration-200
    disabled:opacity-50 disabled:cursor-not-allowed
  `,

  outline: `
    bg-transparent text-gray-700
    border-2 border-gray-300
    hover:border-orange-500 hover:text-orange-600
    font-medium px-6 py-3 rounded-lg
    transition-all duration-200
    disabled:opacity-50 disabled:cursor-not-allowed
  `,

  ghost: `
    bg-transparent text-gray-700
    hover:bg-gray-100
    font-medium px-6 py-3 rounded-lg
    transition-all duration-200
    disabled:opacity-50 disabled:cursor-not-allowed
  `,
};

export const INPUT_STYLES = {
  base: `
    w-full px-4 py-3
    border-2 border-gray-300
    rounded-lg
    focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
    transition-all duration-200
    text-gray-900 placeholder-gray-400
    disabled:bg-gray-100 disabled:cursor-not-allowed
  `,

  error: `
    border-red-500
    focus:ring-red-500
  `,
};

export const CARD_STYLES = {
  base: `
    bg-white rounded-xl shadow-md
    border border-gray-100
    overflow-hidden
    transition-all duration-200
  `,

  hover: `
    hover:shadow-xl hover:scale-[1.02]
  `,

  interactive: `
    cursor-pointer
    hover:shadow-xl hover:scale-[1.02]
    active:scale-[0.98]
  `,
};

// Animation variants for Framer Motion
export const ANIMATION_VARIANTS = {
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },

  slideUp: {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  },

  slideDown: {
    hidden: { opacity: 0, y: -20 },
    visible: { opacity: 1, y: 0 },
  },

  slideLeft: {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 },
  },

  slideRight: {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  },

  scale: {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
  },

  stagger: {
    visible: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  },
};

export const CUISINE_TYPES = [
  'Italian', 'Chinese', 'Japanese', 'Indian', 'Mexican',
  'Thai', 'French', 'American', 'Mediterranean', 'Korean',
];

export const MEAL_TYPES = [
  'Breakfast', 'Lunch', 'Dinner', 'Snack',
  'Dessert', 'Appetizer', 'Side Dish', 'Main Course',
];

export const DIFFICULTY_LEVELS = ['Easy', 'Medium', 'Hard'];

export const PRICE_RANGES = [
  { label: 'Budget', min: 0, max: 10 },
  { label: 'Moderate', min: 10, max: 20 },
  { label: 'Premium', min: 20, max: 50 },
  { label: 'Luxury', min: 50, max: 999 },
];
