/**
 * Design Tokens for QuickBite Application
 *
 * This file contains all the design tokens used throughout the application
 * to maintain consistency in colors, spacing, typography, and other UI elements.
 *
 * Usage:
 * import { colors, spacing, typography } from '@/styles/designTokens';
 */

// Color palette
export const colors = {
    // Primary brand colors
    primary: {
        orange: {
            50: 'rgb(255, 247, 237)',   // from-orange-50
            100: 'rgb(255, 237, 213)',  // bg-orange-100
            200: 'rgb(254, 215, 170)',  // bg-orange-200
            300: 'rgb(253, 186, 116)',
            400: 'rgb(251, 146, 60)',
            500: 'rgb(249, 115, 22)',   // orange-500 (primary)
            600: 'rgb(234, 88, 12)',    // orange-600
            700: 'rgb(194, 65, 12)',
            800: 'rgb(154, 52, 18)',
            900: 'rgb(124, 45, 18)',
        },
        pink: {
            50: 'rgb(253, 242, 248)',   // from-pink-50
            100: 'rgb(252, 231, 243)',
            200: 'rgb(251, 207, 232)',
            300: 'rgb(249, 168, 212)',
            400: 'rgb(244, 114, 182)',
            500: 'rgb(236, 72, 153)',   // pink-500 (primary)
            600: 'rgb(219, 39, 119)',   // pink-600
            700: 'rgb(190, 24, 93)',
            800: 'rgb(157, 23, 77)',
            900: 'rgb(131, 24, 67)',
        },
        purple: {
            50: 'rgb(250, 245, 255)',   // to-purple-50
            100: 'rgb(243, 232, 255)',
            200: 'rgb(233, 213, 255)',
            300: 'rgb(216, 180, 254)',
            400: 'rgb(192, 132, 252)',
            500: 'rgb(168, 85, 247)',
            600: 'rgb(147, 51, 234)',
            700: 'rgb(126, 34, 206)',
            800: 'rgb(107, 33, 168)',
            900: 'rgb(88, 28, 135)',
        },
    },

    // Grayscale
    gray: {
        50: 'rgb(249, 250, 251)',
        100: 'rgb(243, 244, 246)',
        200: 'rgb(229, 231, 235)',
        300: 'rgb(209, 213, 219)',
        400: 'rgb(156, 163, 175)',
        500: 'rgb(107, 114, 128)',
        600: 'rgb(75, 85, 99)',
        700: 'rgb(55, 65, 81)',
        800: 'rgb(31, 41, 55)',
        900: 'rgb(17, 24, 39)',
    },

    // Semantic colors
    semantic: {
        success: {
            light: 'rgb(134, 239, 172)',
            DEFAULT: 'rgb(34, 197, 94)',  // green-500
            dark: 'rgb(21, 128, 61)',
        },
        error: {
            light: 'rgb(252, 165, 165)',
            DEFAULT: 'rgb(239, 68, 68)',   // red-500
            dark: 'rgb(185, 28, 28)',
        },
        warning: {
            light: 'rgb(253, 224, 71)',
            DEFAULT: 'rgb(234, 179, 8)',   // yellow-500
            dark: 'rgb(161, 98, 7)',
        },
        info: {
            light: 'rgb(147, 197, 253)',
            DEFAULT: 'rgb(59, 130, 246)',  // blue-500
            dark: 'rgb(29, 78, 216)',
        },
    },

    // Background colors
    background: {
        primary: 'rgb(255, 255, 255)',  // white
        gradient: 'linear-gradient(to bottom right, rgb(255, 247, 237), rgb(253, 242, 248), rgb(250, 245, 255))',
    },
};

// Gradient patterns
export const gradients = {
    primary: 'bg-gradient-to-r from-orange-500 to-pink-500',
    primaryHover: 'hover:from-orange-600 hover:to-pink-600',
    background: 'bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50',
    text: 'bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent',
    badge: 'bg-gradient-to-r from-orange-50 to-pink-50',
};

// Spacing scale (based on Tailwind's default scale)
export const spacing = {
    xs: '0.25rem',    // 1
    sm: '0.5rem',     // 2
    md: '1rem',       // 4
    lg: '1.5rem',     // 6
    xl: '2rem',       // 8
    '2xl': '2.5rem',  // 10
    '3xl': '3rem',    // 12
    '4xl': '4rem',    // 16
    '5xl': '5rem',    // 20
};

// Typography
export const typography = {
    fontFamily: {
        sans: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    },
    fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],      // 12px
        sm: ['0.875rem', { lineHeight: '1.25rem' }],  // 14px
        base: ['1rem', { lineHeight: '1.5rem' }],     // 16px
        lg: ['1.125rem', { lineHeight: '1.75rem' }],  // 18px
        xl: ['1.25rem', { lineHeight: '1.75rem' }],   // 20px
        '2xl': ['1.5rem', { lineHeight: '2rem' }],    // 24px
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],   // 36px
        '5xl': ['3rem', { lineHeight: '1' }],           // 48px
    },
    fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
    },
};

// Border radius
export const borderRadius = {
    sm: '0.125rem',    // rounded-sm
    DEFAULT: '0.25rem',// rounded
    md: '0.375rem',    // rounded-md
    lg: '0.5rem',      // rounded-lg
    xl: '0.75rem',     // rounded-xl
    '2xl': '1rem',     // rounded-2xl
    '3xl': '1.5rem',   // rounded-3xl
    full: '9999px',    // rounded-full
};

// Shadows
export const shadows = {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
};

// Animation durations
export const animations = {
    duration: {
        fast: '0.2s',
        normal: '0.3s',
        slow: '0.5s',
        slower: '0.6s',
    },
    easing: {
        easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
        easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
        easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
};

// Z-index scale
export const zIndex = {
    dropdown: 10,
    sticky: 20,
    fixed: 30,
    modalBackdrop: 40,
    modal: 50,
    popover: 60,
    tooltip: 70,
};

// Component specific tokens
export const components = {
    button: {
        height: {
            sm: '2rem',
            md: '2.75rem',
            lg: '3.5rem',
        },
        padding: {
            sm: '1rem',
            md: '1.5rem',
            lg: '2rem',
        },
    },
    input: {
        height: '2.875rem',
        padding: '0.875rem',
        borderWidth: '2px',
    },
    card: {
        padding: '1.25rem',
        borderRadius: borderRadius['2xl'],
        shadow: shadows.lg,
    },
};

export default {
    colors,
    gradients,
    spacing,
    typography,
    borderRadius,
    shadows,
    animations,
    zIndex,
    components,
};
