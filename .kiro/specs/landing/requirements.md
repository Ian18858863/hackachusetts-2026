# Requirements: Landing Page for Rare Disease Detective

> Status: v1.0 APPROVED, implements design from docs/ART_DIRECTION.md

## Introduction

A standalone landing page (landing/) that introduces Rare Disease Detective to potential users and stakeholders. The page must communicate the value proposition, demonstrate trustworthiness, cite verified medical statistics, and guide users to the application. Built as a Vite + React + TypeScript project with a medical-grade design system.

## Target Audience

1. **Families** navigating rare disease diagnostic journeys
2. **Clinicians** considering tools for their practice
3. **Judges/Evaluators** reviewing the project for competitions

## Design Principles

1. **Medical Trustworthiness**: Clear, factual language with verified statistics and proper attribution
2. **Accessibility**: WCAG AA compliance with semantic HTML and keyboard navigation
3. **Responsive Design**: Mobile-first approach with flexible layouts
4. **Professional Tone**: Neutral, evidence-based communication without hype

## Core Requirements

### Section 1: Hero Section
**Purpose**: Immediate value proposition and primary call to action

1.1 THE PAGE SHALL feature a prominent headline that communicates the core benefit: "A specialist‑ready brief in minutes, not a diagnosis in years"
1.2 THE PAGE SHALL include a clear, accessible primary call to action: "Try a demo case" that links to /app/?demo=demo-dmd
1.3 THE PAGE SHALL include a secondary call to action: "How it works" that scrolls to the how-it-works section
1.4 THE PAGE SHALL visually demonstrate the 4-step workflow through concise bullet points
1.5 THE PAGE SHALL use the approved design tokens from docs/ART_DIRECTION.md (Newsreader + Source Sans 3 fonts, color system)

### Section 2: Problem Statement
**Purpose**: Establish context and urgency with verified statistics

2.1 THE PAGE SHALL present 4 verified rare disease statistics with proper academic citations:
   - Global prevalence estimate (263–446 million, Orphanet 2020)
   - Average diagnostic delay (4.7 years, Eur J Hum Genet 2024)
   - Misdiagnosis rate (73%, Eur J Hum Genet 2024)
   - Multiple clinician visits (22% saw 8+ clinicians, Eur J Hum Genet 2024)

2.2 EACH STATISTIC SHALL include:
   - Prominent numerical value
   - Clear description
   - Source citation with DOI link
   - Note about being peer-reviewed

2.3 THE PAGE SHALL contextualize the statistics with "The human impact" narrative explaining consequences

### Section 3: How It Works
**Purpose**: Demonstrate the workflow with concrete examples

3.1 THE PAGE SHALL describe the 4-step process:
   - Describe symptoms in plain words
   - Confirm extracted clinical features
   - See ranked possibilities with evidence
   - Take a one-page brief to the specialist

3.2 EACH STEP SHALL include:
   - Clear step title
   - Brief description
   - 3-4 key features
   - Concrete example showing real clinical features

3.3 EXAMPLES SHALL use actual HPO terms and realistic clinical scenarios without diagnostic claims

### Section 4: Why Trust This Approach
**Purpose**: Build credibility through transparency and evidence

4.1 THE PAGE SHALL present 4 trust pillars:
   - Traceable evidence (transparent algorithms)
   - Open ontologies & data (publicly available resources)
   - Clinical collaboration focus (supports, not replaces doctors)
   - Safety-first design (clear limitations)

4.2 THE PAGE SHALL list open data sources with licenses:
   - Human Phenotype Ontology (HPO) - Free use with attribution
   - Orphanet - CC BY 4.0
   - Monarch Initiative - BSD-3 Clause
   - HPO annotations - Free use with attribution

4.3 THE PAGE SHALL include prominent safety disclaimers:
   - "Important limitations" warning about decision support vs diagnosis
   - "Clinical value" with evidence from actual research (Köhler et al. 2021, Zemojtel et al. 2014)
   - "Decision support, not a diagnosis" as clear framing

### Section 5: Technical Implementation

5.1 THE PAGE SHALL be built as a standalone Vite + React + TypeScript project in landing/ directory
5.2 THE BUILD OUTPUT SHALL be landing/dist/ (NOT landing/dist/app/)
5.3 THE PAGE SHALL use CSS custom properties based on docs/ART_DIRECTION.md design tokens
5.4 THE PAGE SHALL NOT use Tailwind CSS or other frameworks (pure CSS with design system)
5.5 THE PAGE SHALL be fully responsive with:
   - Mobile-first breakpoints
   - Flexible layouts that work at 1440×900, 1000×600, and 375×812
   - Minimum touch targets of 44×44px

### Section 6: Navigation and Footer

6.1 THE PAGE SHALL include a header with:
   - Site logo/title "Rare Disease Detective"
   - Navigation to key sections (optional for mobile)
   
6.2 THE PAGE SHALL include a footer with:
   - Copyright notice
   - Privacy policy link (placeholder)
   - Terms of use link (placeholder)
   - Project team credits

### Section 7: Medical Evidence Standards

7.1 ALL MEDICAL STATISTICS SHALL be verified and properly cited
7.2 NO PERCENTAGES OR MATCH SCORES SHALL be invented or unsupported
7.3 ALL HPO VERSION REFERENCES SHALL use actual existing versions (no future dates)
7.4 ALL RESEARCH CITATIONS SHALL be to published papers (no future publications)

### Section 8: Accessibility Requirements

8.1 THE PAGE SHALL meet WCAG 2.2 AA contrast ratios for all text and controls
8.2 THE PAGE SHALL use semantic HTML structure with proper heading hierarchy
8.3 THE PAGE SHALL support full keyboard navigation with visible focus states
8.4 THE PAGE SHALL be screen reader compatible with appropriate ARIA labels

### Section 9: Browser and Performance

9.1 THE PAGE SHALL load in under 3 seconds on 3G connection
9.2 THE PAGE SHALL work in the latest versions of Chrome, Firefox, and Safari
9.3 THE PAGE SHALL gracefully degrade when JavaScript is disabled
9.4 THE PAGE SHALL pass Lighthouse accessibility and performance audits

## Success Criteria

- Page loads and renders correctly with npm run build
- All medical statistics have proper academic citations
- Design tokens from docs/ART_DIRECTION.md are correctly implemented
- Page is fully responsive across required breakpoints
- No Tailwind-style utility classes remain in components
- All accessibility requirements are met
- Build outputs to landing/dist/ without app/ subdirectory