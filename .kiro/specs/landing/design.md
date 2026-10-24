# Design: Landing Page for Rare Disease Detective

> Implements visual direction from docs/ART_DIRECTION.md
> Status: APPROVED for implementation

## Design System Implementation

### Typography
- **Headings**: Newsreader, Georgia, serif stack
- **Body text**: Source Sans 3, system-ui sans-serif stack
- **Font sizes**: Using CSS custom properties defined in landing/src/design.css
- **Line heights**: --lh-text (1.5) for body, --lh-head (1.1) for headings

### Color Palette
Implemented as CSS custom properties in landing/src/design.css:
- **Primary colors**: --bg, --surface, --hair, --ink, --accent
- **Text colors**: --ink, --ink-2, --ink-3, --on-dark
- **Semantic colors**: --mark (positive), --focus (interaction)

### Spacing System
Based on 8px grid with custom properties:
- **Base unit**: 4px (--s-1)
- **Scale**: --s-1 through --s-10 (4px to 128px)
- **Responsive gutters**: --gutter adjusts at 900px and 600px breakpoints

### Components Styling

#### 1. Hero Section
- **Background**: --accent (#2B55C0)
- **Text color**: --on-dark (#FFFFFF)
- **Primary button**: --surface background, --ink text, --r-l border radius
- **Secondary button**: --surface border and text, transparent background, hover: --surface background, --ink text
- **Process cards**: rgba(--surface, 0.1) background with backdrop blur

#### 2. Problem Section
- **Background**: --surface (#F5F6F8)
- **Stat cards**: --bg (#FFFFFF) with --shadow-pop
- **Stat numbers**: --accent color with large typography
- **Source links**: --ink-3 with underline on hover

#### 3. How It Works Section
- **Background**: --bg (#FFFFFF)
- **Step cards**: --surface background with --shadow-pop
- **Step numbers**: --accent color
- **Example boxes**: rgba(--ink, 0.05) with --accent left border

#### 4. Trust Section
- **Background**: --surface (#F5F6F8)
- **Trust cards**: --bg (#FFFFFF) with --shadow-pop
- **Data source badges**: --ink-2 background, --on-dark text
- **Warning boxes**: Semantic colors for limitations (#e53e3e) and value (#38a169)

## Layout Architecture

### Responsive Breakpoints
- **Mobile**: < 600px (--gutter: 16px)
- **Tablet**: 600px - 900px (--gutter: 24px)
- **Desktop**: > 900px (--gutter: 48px)

### Container System
- **Max content width**: --content (1056px)
- **Container class**: .container provides max-width and gutter padding
- **Column system**: Based on --col (184px) for complex layouts

### Component Layouts

#### Hero Layout
```
Mobile: Column layout, content above process
Tablet+: Row layout, 50/50 split
```

#### Statistics Grid
```
Mobile: 1 column
Tablet: 2 columns
Desktop: 4 columns
```

#### How It Works Steps
```
Mobile: Column layout
Desktop: Staggered row layout (alternating left/right)
```

## Interaction Design

### Button States
- **Default**: Base styling with border radius
- **Hover**: translateY(-2px) with --shadow-pop
- **Focus**: 2px --focus outline with 3px offset
- **Active**: Scale down slightly (0.98)

### Card Interactions
- **Hover**: Enhanced shadow for depth
- **Focus**: Visible focus ring for keyboard navigation

### Animation Principles
- **Duration**: --dur-base (220ms) for interactions
- **Easing**: --ease (cubic-bezier(0.2, 0, 0, 1))
- **Reduced motion**: Respects prefers-reduced-motion

## Accessibility Implementation

### Focus Management
- **Focus rings**: 2px --focus outline with 3:1 contrast minimum
- **Focus visible**: Only show focus rings for keyboard navigation
- **Focus order**: Logical reading order matches visual order

### Color Contrast
- **Text on backgrounds**: Minimum 4.5:1 ratio
- **Large text**: Minimum 3:1 ratio
- **Interactive elements**: Minimum 3:1 for focus states

### Semantic Structure
- **Heading hierarchy**: h1 for page title, h2 for sections, h3 for subsections
- **Landmark regions**: header, main, footer with appropriate roles
- **ARIA labels**: For interactive elements without visible labels

## Implementation Notes

### CSS Architecture
- **Design tokens**: All values as CSS custom properties in :root
- **Component styles**: Inline styles in React components using design tokens
- **Utility classes**: Minimal, only for layout and spacing when needed
- **No frameworks**: Pure CSS implementation without Tailwind or other CSS frameworks

### Image Optimization
- **SVG icons**: Inline where possible for accessibility
- **Performance**: No large background images or complex animations

### Performance Considerations
- **Critical CSS**: Inline in index.html for above-the-fold content
- **Font loading**: Font-display: swap for web fonts
- **JavaScript**: Minimal React hydration with code splitting if needed

## Mobile Navigation (Future Enhancement)
For responsive navigation at mobile breakpoints:
- **Hamburger menu**: Collapsed navigation at < 768px
- **Slide-out panel**: Full-screen navigation overlay
- **Touch targets**: 44×44px minimum for all interactive elements

## Verification Checklist
- [ ] All colors use design token custom properties
- [ ] All typography uses correct font stacks and sizes
- [ ] Spacing follows 8px grid system
- [ ] Responsive breakpoints work correctly
- [ ] Focus states are visible and accessible
- [ ] Color contrast meets WCAG AA standards
- [ ] Semantic HTML structure is correct
- [ ] No Tailwind-style utility classes remain
- [ ] Build outputs to correct directory