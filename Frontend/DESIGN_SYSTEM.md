# QuickBite Design System

## Overview

This document outlines the design system for the QuickBite application, including color schemes, typography, spacing, and component guidelines to ensure UI consistency across the application.

## Color Palette

### Primary Colors

The application uses a consistent **orange-to-pink gradient** theme:

- **Orange**: `from-orange-500` (#f97316)
- **Pink**: `to-pink-500` (#ec4899)
- **Purple**: Supporting accent `purple-50` backgrounds

### Usage Examples

```jsx
// Primary gradient button
className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"

// Background gradient
className="bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50"

// Text gradient
className="bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent"

// Badge/pill backgrounds
className="bg-orange-100 text-orange-800"
className="bg-pink-100 text-pink-800"
```

### Grayscale

- **Headings**: `text-gray-800`
- **Body text**: `text-gray-600` or `text-gray-700`
- **Borders**: `border-gray-200` or `border-gray-300`
- **Backgrounds**: `bg-gray-50`, `bg-gray-100`

## Typography

### Font Sizes

- **Extra Small**: `text-xs` (12px)
- **Small**: `text-sm` (14px)
- **Base**: `text-base` (16px)
- **Large**: `text-lg` (18px)
- **XL**: `text-xl` (20px)
- **2XL**: `text-2xl` (24px)
- **3XL**: `text-3xl` (30px)
- **4XL**: `text-4xl` (36px)
- **5XL**: `text-5xl` (48px)

### Font Weights

- **Normal**: `font-normal` (400)
- **Medium**: `font-medium` (500)
- **Semibold**: `font-semibold` (600)
- **Bold**: `font-bold` (700)

### Common Patterns

```jsx
// Page headings
className="text-4xl md:text-5xl font-bold text-gray-800"

// Section headings
className="text-2xl font-bold text-gray-800"

// Card titles
className="text-xl font-bold text-gray-900"

// Body text
className="text-base text-gray-600"
```

## Spacing

Use Tailwind's spacing scale consistently:

- **Padding**: `p-4`, `p-6`, `p-8` (common page/card padding)
- **Margin**: `mb-4`, `mb-6`, `mb-8` (common vertical spacing)
- **Gap**: `gap-2`, `gap-3`, `gap-4` (flex/grid gaps)

## Border Radius

- **Buttons**: `rounded-lg` or `rounded-full`
- **Cards**: `rounded-2xl`
- **Inputs**: `rounded-lg`
- **Modals**: `rounded-2xl`
- **Small badges**: `rounded-full`

## Shadows

- **Cards**: `shadow-lg` or `shadow-xl`
- **Buttons**: `shadow-md hover:shadow-lg`
- **Modals**: `shadow-2xl`
- **Dropdowns**: `shadow-lg`

## Components

### Buttons

Always use the `Button` component from `@/components/common/Button`:

```jsx
import Button from '@/components/common/Button';

// Primary button
<Button variant="primary" size="md">Click Me</Button>

// Secondary button
<Button variant="secondary" size="md">Cancel</Button>

// With icon
<Button variant="primary" icon={<FiShoppingCart />}>Add to Cart</Button>
```

**Variants:**
- `primary` - Orange-to-pink gradient (default)
- `secondary` - White with orange border
- `outline` - Transparent with gray border
- `ghost` - Transparent background
- `danger` - Red
- `success` - Green

**Sizes:**
- `sm` - Small (32px height)
- `md` - Medium (44px height)
- `lg` - Large (56px height)

### Inputs

Always use the `Input` component from `@/components/common/Input`:

```jsx
import Input from '@/components/common/Input';

<Input
    label="Email Address"
    type="email"
    name="email"
    value={form.email}
    onChange={handleChange}
    icon={<FiMail />}
    required
/>
```

**Features:**
- Floating labels
- Icon support
- Error messages
- Password toggle
- Consistent styling

### Loading States

Use consistent loading indicators:

```jsx
<motion.div
    animate={{
        rotate: 360,
        scale: [1, 1.1, 1]
    }}
    transition={{
        rotate: { duration: 2, repeat: Infinity, ease: "linear" },
        scale: { duration: 1.5, repeat: Infinity, repeatType: "reverse" }
    }}
    className="w-16 h-16 rounded-full border-4 border-orange-500 border-t-transparent"
/>
```

## Animation Guidelines

### Durations
- **Fast**: 0.2s (micro-interactions)
- **Normal**: 0.3s (button hover, transitions)
- **Slow**: 0.5-0.6s (page transitions, reveals)

### Common Patterns

```jsx
// Page entrance
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.5 }}

// Hover scale
whileHover={{ scale: 1.02 }}
whileTap={{ scale: 0.98 }}

// Stagger children
variants={{
    visible: {
        transition: {
            staggerChildren: 0.1
        }
    }
}}
```

## Layout Patterns

### Container Widths
```jsx
// Standard container
className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"

// Narrow container (forms, content)
className="max-w-md mx-auto"
className="max-w-2xl mx-auto"
```

### Grid Layouts
```jsx
// Responsive card grid
className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8"

// Two column layout
className="grid lg:grid-cols-3 gap-8"
// with lg:col-span-2 for main content and lg:col-span-1 for sidebar
```

## Background Decorations

Use the animated blob pattern for auth/landing pages:

```jsx
<div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute top-20 left-10 w-72 h-72 bg-orange-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob" />
    <div className="absolute top-40 right-10 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000" />
    <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000" />
</div>
```

## Icons

Use React Icons consistently:

```jsx
import { FiShoppingCart, FiUser, FiMail } from 'react-icons/fi';
import { RiRestaurantFill } from 'react-icons/ri';
```

## Common Mistakes to Avoid

### ❌ Don't Do This
```jsx
// Using different color schemes
className="bg-indigo-600"
className="text-cyan-500"
className="text-fuchsia-600"

// Inconsistent button styles
<button className="bg-blue-500 px-4 py-2">Click</button>

// Mixed hover colors
className="hover:text-amber-500"
```

### ✅ Do This Instead
```jsx
// Use the brand colors
className="bg-gradient-to-r from-orange-500 to-pink-500"
className="text-orange-500"
className="text-gray-600"

// Use the Button component
<Button variant="primary">Click</Button>

// Consistent hover colors
className="hover:text-orange-500"
```

## Design Token Reference

All design tokens are available in `src/styles/designTokens.js`:

```jsx
import { colors, gradients, spacing, typography } from '@/styles/designTokens';
```

## Recent Fixes (2025)

The following UI inconsistencies were fixed:

1. **GetStarted Page**: Changed from cyan/blue/indigo colors to orange/pink gradient
2. **Navbar**: Changed `amber-500` hover colors to `orange-500`
3. **Home Page**: Changed loading text from `fuchsia-600` to orange-pink gradient
4. **Checkout**: Changed payment section from purple/fuchsia to orange/pink gradient

## Need Help?

When adding new components or pages:

1. ✅ Use the Button and Input components
2. ✅ Follow the color palette (orange-pink-purple)
3. ✅ Use consistent spacing and border radius
4. ✅ Add animations using framer-motion
5. ✅ Test on mobile and desktop viewports

For questions, refer to existing components like:
- [Button.jsx](src/components/common/Button.jsx)
- [Input.jsx](src/components/common/Input.jsx)
- [Signin.jsx](src/pages/Signin.jsx)
- [Checkout.jsx](src/pages/Checkout.jsx)
