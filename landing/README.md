# Rare Disease Detective Landing Page

A standalone Vite + React + TypeScript landing page for the Rare Disease Detective project.

## Features

- ✅ **Hero section** with primary promise and CTA
- ✅ **Problem section** with verified statistics and sources
- ✅ **How it works** with 4-step workflow
- ✅ **Trust section** with data attribution and safety notes
- ✅ **Footer** with proper attributions and disclaimers
- ✅ **Responsive design** for all screen sizes
- ✅ **CSS variables** for easy restyling
- ✅ **Accessibility** best practices
- ✅ **Build output**: `landing/dist` only (never `landing/dist/app`)

## Development

```bash
cd landing
npm install          # Install dependencies
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
```

## Design System

All styling uses CSS custom properties defined in `src/design.css`:

- **Colors**: Neutral palette with medical/trustworthy feel
- **Typography**: Inter for body, Space Grotesk for headings
- **Spacing**: Consistent spacing scale
- **Responsive**: Mobile-first responsive design

## Content Guidelines

All text follows these principles:

1. **Verified statistics only** - All numbers include peer-reviewed sources
2. **English only** - Consistent language throughout
3. **Medical accuracy** - No invented claims or overpromises
4. **Clear boundaries** - Emphasizes "decision support, not a diagnosis"
5. **Source attribution** - All data sources properly cited

## Building for Production

```bash
npm run build
```

Outputs to `landing/dist/`:
- `dist/index.html` - Main HTML file
- `dist/assets/` - Compiled CSS and JS bundles
- **Never creates `dist/app/`** as per requirements

## Data Attribution

This project uses:
- **Human Phenotype Ontology (HPO)** - Used under attribution requirements
- **Orphanet** - Used under CC BY 4.0 license
- **Monarch Initiative API** - Used under BSD-3 Clause license

All attributions are included in the footer.

## Safety and Medical Disclaimers

The landing page clearly states:
- "Decision support, not a diagnosis"
- "Always consult qualified healthcare professionals"
- "For research and educational purposes"

## Kiro Development Note

This landing page was created following the strict AI-assisted development workflow:
- Uses `.kiro/steering/design.md` for design system
- Follows project structure requirements
- Implements verified content only
- Maintains proper data attribution
- Builds to correct output directory