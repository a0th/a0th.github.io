# Theme Rules & Design System

Design system documentation for a0th.github.io portfolio site.

## Overview

The site uses Tailwind CSS (CDN) with a custom dark mode implementation. Theme preference is persisted in localStorage and respects system preferences on first visit.

## Color System

### Light Mode Palette

**Base Colors**
- Background: `bg-white`
- Text: `text-gray-800`
- Muted text: `text-gray-600`
- Subtle text: `text-gray-500`

**Borders & Dividers**
- Standard: `border-gray-200`
- Hover: `border-gray-300`

**Interactive Elements**
- Hover background: `hover:bg-gray-100`
- Focus states: Default Tailwind focus rings

### Dark Mode Palette

**Base Colors**
- Background: `dark:bg-gray-950`
- Text: `dark:text-gray-100`
- Muted text: `dark:text-gray-300`
- Subtle text: `dark:text-gray-400`

**Borders & Dividers**
- Standard: `dark:border-gray-800`
- Hover: `dark:border-gray-700`

**Interactive Elements**
- Hover background: `dark:hover:bg-gray-900`

### Accent Colors

**Primary Gradient (Purple-Indigo)**
- Light: `from-purple-600 to-indigo-600`
- Dark: Same gradient, adjusted context

**Brand Dot**
- `from-sky-500 via-fuchsia-500 to-amber-400`

**Project Cards**
- Light: `from-blue-50 to-indigo-50`
- Dark: `dark:from-blue-950/30 dark:to-indigo-950/30`

## Typography

### Font Stack
- Primary: Inter (weights: 400, 500, 600, 700, 800)
- Fallback: `ui-sans-serif`, `system-ui`, `sans-serif`
- Load from Google Fonts with preconnect optimization

### Text Sizes

**Hero Heading**
- Mobile: `text-4xl`
- Tablet: `sm:text-5xl`
- Desktop: `md:text-6xl`
- Weight: `font-extrabold`
- Letter spacing: `tracking-tight`

**Section Headings**
- Size: `text-2xl`
- Weight: `font-bold`

**Card Headings**
- Size: `text-lg`
- Weight: `font-semibold`

**Body Text**
- Hero subtitle: `text-lg`
- Card description: `text-sm`
- Footer: `text-sm`

### Text Gradients

**Hero Title**
- Light: `from-gray-900 via-purple-900 to-indigo-900`
- Dark: `dark:from-white dark:via-purple-200 dark:to-indigo-200`
- Apply with: `bg-gradient-to-r ... bg-clip-text text-transparent`

## Component Patterns

### Header

**Structure**
- Sticky: `sticky top-0 z-30`
- Backdrop blur: `backdrop-blur supports-[backdrop-filter]:bg-white/60`
- Height: `h-16`
- Max width: `max-w-7xl`
- Padding: `px-4 sm:px-6 lg:px-8`

**Colors**
- Light: `bg-white/80` with backdrop filter support
- Dark: `dark:bg-gray-950/80`
- Border: `border-b border-gray-200 dark:border-gray-800`

### Hero Section

**Background Layers**
1. Base gradient: `bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50`
   - Dark: `dark:from-gray-950 dark:via-purple-950/20 dark:to-indigo-950/20`
2. Radial overlay: `bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100/30 via-transparent to-transparent`
   - Dark: `dark:from-blue-900/20`

**Spacing**
- Padding: `py-16 sm:py-20 md:py-24`
- Max width: `max-w-7xl`
- Container padding: `px-4 sm:px-6 lg:px-8`

### Buttons

**Primary CTA**
- Background: `bg-gradient-to-r from-purple-600 to-indigo-600`
- Text: `text-white`
- Padding: `px-6 py-3`
- Border radius: `rounded-lg`
- Shadow: `shadow-lg hover:shadow-xl`
- Transform: `hover:scale-105`
- Transition: `transition-all duration-200`

**Secondary Button**
- Border: `border border-gray-300 dark:border-gray-700`
- Hover: `hover:bg-gray-100 dark:hover:bg-gray-900`
- Transform: `hover:scale-105`
- Transition: `transition-all duration-200`

**Theme Toggle**
- Style: Secondary button variant
- Size: `text-sm font-medium`
- Padding: `px-3 py-1.5`
- Border radius: `rounded-md`

### Project Cards

**Container**
- Border: `border border-gray-200 dark:border-gray-800`
- Border radius: `rounded-xl`
- Padding: `p-6`
- Shadow: `shadow-sm hover:shadow-lg`
- Transform: `hover:-translate-y-1`
- Transition: `transition-all duration-300`

**Background**
- Gradient: `bg-gradient-to-br from-blue-50 to-indigo-50`
- Dark: `dark:from-blue-950/30 dark:to-indigo-950/30`

**Typography**
- Heading: `text-lg font-semibold text-blue-900 dark:text-blue-100`
- Description: `text-sm text-blue-700 dark:text-blue-200`

**Arrow Indicator**
- Default: `text-blue-400 dark:text-blue-300`
- Hover: `group-hover:text-blue-600 dark:group-hover:text-blue-100`
- Size: `text-xl`
- Transition: `transition-colors`
- External link: `↗` (U+2197)
- Internal link: `→` (U+2192)

### Footer

**Structure**
- Border: `border-t border-gray-200 dark:border-gray-800`
- Padding: `py-8`
- Text size: `text-sm`
- Colors: `text-gray-600 dark:text-gray-400`

**Layout**
- Responsive: `flex-col sm:flex-row`
- Alignment: `items-center justify-between`
- Gap: `gap-2`

## Layout System

### Container Widths
- Max width: `max-w-7xl` (1280px)
- Center: `mx-auto`
- Horizontal padding: `px-4 sm:px-6 lg:px-8`

### Grid Systems

**Projects Grid**
- Base: `grid-cols-1`
- Tablet: `md:grid-cols-2`
- Desktop: `lg:grid-cols-3`
- Gap: `gap-6`

**Hero Grid**
- Base: `grid-cols-1`
- Desktop: `lg:grid-cols-2`
- Alignment: `items-center`
- Gap: `gap-10`

### Spacing Scale

**Section Padding (Vertical)**
- Hero: `py-16 sm:py-20 md:py-24`
- Content sections: `py-12 sm:py-16`
- Footer: `py-8`

**Component Margins**
- Subtitle: `mt-4`
- CTA container: `mt-8`
- Section grid: `mt-6`
- Heading to description: `mb-2`
- Description to content: `mb-8`

## Responsive Breakpoints

Tailwind default breakpoints:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

### Visibility Patterns
- Hide on mobile: `hidden sm:inline-flex`
- Show on desktop: `lg:grid-cols-3`
- Responsive flex: `flex-col sm:flex-row`

## Animations & Transitions

### Standard Transitions
- Fast: `duration-200` (buttons, small interactions)
- Standard: `duration-300` (cards, larger components)
- Property: `transition-all` or specific (`transition-colors`)

### Hover Effects

**Cards**
- Shadow: `shadow-sm → hover:shadow-lg`
- Transform: `hover:-translate-y-1`

**Buttons**
- Shadow: `shadow-lg → hover:shadow-xl`
- Transform: `hover:scale-105`

**Links**
- Color shift only: `hover:text-gray-900`

### Focus States
- Use Tailwind defaults
- Ensure visible focus rings for accessibility

## Dark Mode Implementation

### Mechanism
- Mode: `class` based (not media query)
- Toggle: Add/remove `dark` class on `<html>` element
- Persistence: localStorage key `'theme'`
- Fallback: System preference via `prefers-color-scheme`

### Initialization Pattern
```javascript
(function() {
  try {
    var stored = localStorage.getItem('theme');
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (stored === 'dark' || (!stored && prefersDark)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {}
})();
```

### Toggle Implementation
```javascript
var btn = document.getElementById('theme-toggle');
if (btn) {
  btn.addEventListener('click', function() {
    var isDark = document.documentElement.classList.toggle('dark');
    try { localStorage.setItem('theme', isDark ? 'dark' : 'light'); } catch (e) {}
  });
}
```

### Dark Mode Class Pattern
- Always pair light and dark: `bg-white dark:bg-gray-950`
- Use opacity modifiers for subtle effects: `dark:from-blue-950/30`
- Maintain semantic meaning across modes

## Accessibility Guidelines

### Color Contrast
- Ensure WCAG AA compliance minimum (4.5:1 for normal text)
- Test gradients against both endpoints
- Dark mode should have comparable contrast to light mode

### Focus Management
- Visible focus indicators on all interactive elements
- Logical tab order
- Skip links where appropriate (not currently implemented)

### Semantic HTML
- Use appropriate heading hierarchy (h1 → h2 → h3)
- Use `<nav>`, `<main>`, `<footer>` landmarks
- Alt text for images (currently no images except SVG icons)
- `aria-hidden="true"` on decorative SVG
- `sr-only` for screen reader only content

### Icon Accessibility
- SVG icons include `aria-hidden="true"`
- Accompanying text or `sr-only` labels
- Theme toggle has `<span class="sr-only">Toggle theme</span>`

## Performance Considerations

### Font Loading
- Preconnect to Google Fonts: `rel="preconnect"`
- Font display: `swap` (in Google Fonts URL)
- Weights: Only load used weights (400, 500, 600, 700, 800)

### CSS Delivery
- Tailwind CDN for rapid prototyping
- Consider build step for production (PurgeCSS)

### Critical CSS
- Dark mode script runs before render (in `<head>`)
- Prevents flash of wrong theme

### Layout Shift
- Fixed header height: `h-16`
- Defined aspect ratios prevent CLS
- No loading images (all inline SVG)

## Extensibility

### Adding New Project Cards
Use this template:
```html
<a href="PATH" class="group rounded-xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
  <div class="flex items-start justify-between">
    <h3 class="text-lg font-semibold text-blue-900 dark:text-blue-100">TITLE</h3>
    <span class="text-blue-400 group-hover:text-blue-600 dark:text-blue-300 dark:group-hover:text-blue-100 text-xl transition-colors">→</span>
  </div>
  <p class="mt-2 text-sm text-blue-700 dark:text-blue-200">DESCRIPTION</p>
</a>
```

### Color Scheme Variants
To change project card colors, modify the blue scale:
- Light background: `from-{color}-50 to-indigo-50`
- Dark background: `dark:from-{color}-950/30 dark:to-indigo-950/30`
- Text colors: `text-{color}-900`, `text-{color}-700`, etc.

### New Sections
Follow this spacing pattern:
```html
<section class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
  <h2 class="text-2xl font-bold text-gray-700 dark:text-gray-200 mb-2">HEADING</h2>
  <p class="text-gray-500 dark:text-gray-400 mb-8">DESCRIPTION</p>
  <!-- Content -->
</section>
```

## Tailwind Configuration

Current config (inline):
```javascript
tailwind.config = {
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      }
    }
  }
}
```

For production builds with custom Tailwind, extract to `tailwind.config.js` and add PurgeCSS content paths.

## Version History

- **Current**: Tailwind CDN (v3.x implied by CDN)
- **Font**: Inter via Google Fonts
- **Browser Support**: Modern browsers (ES6+, CSS Grid, backdrop-filter)

