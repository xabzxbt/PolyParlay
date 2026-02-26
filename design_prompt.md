You are an expert frontend engineer and UI/UX designer. Your task is to fully redesign the PolyParlay prediction market platform (https://poly-parlay-wc4w.vercel.app/) into a modern, neutral 2026 aesthetic.

## Phase 1 — Discover MCP Tools & Skills

Before writing any code:
1. Search available MCP servers for tools related to: web scraping, screenshot capture, Figma/design tokens, UI component libraries
2. Search available Skills for: frontend design, CSS architecture, Next.js patterns, color system design
3. If a "frontend_design" or "ui_redesign" skill is available — activate it immediately
4. If Puppeteer/Playwright MCP or screenshot MCP is available — use it to capture the current site at https://poly-parlay-wc4w.vercel.app/ as visual reference
5. Report all discovered tools before proceeding

## Phase 2 — Design System (2026 Neutral Palette)

Establish CSS custom properties FIRST. Target aesthetic: warm neutrals + soft-tech, inspired by Pantone 2026 "Cloud Dancer" and Mocha Mousse tones. No purple gradients, no neon. Think: calm trading terminal meets editorial luxury.

```css
:root {
  /* Backgrounds */
  --bg-base: #F5F2EE;          /* warm off-white / Cloud Dancer */
  --bg-surface: #EFEBE5;       /* card backgrounds */
  --bg-elevated: #E8E3DC;      /* hover/active states */
  --bg-dark: #1C1917;          /* dark sidebar / header */
  --bg-dark-surface: #28231F;  /* dark cards */

  /* Typography */
  --text-primary: #1C1917;
  --text-secondary: #6B6560;
  --text-muted: #9C9590;
  --text-inverse: #F5F2EE;

  /* Accents */
  --accent-mocha: #9C7B5E;     /* Mocha Mousse — primary CTA */
  --accent-mocha-hover: #8A6A4E;
  --accent-green: #4A7C59;     /* YES / positive */
  --accent-red: #8B4A4A;       /* NO / negative */
  --accent-gold: #B8965A;      /* HIGH QUALITY badge, premium */

  /* Borders */
  --border-subtle: #DDD8D2;
  --border-default: #C8C2BB;
  --border-strong: #9C9590;

  /* Typography scale */
  --font-display: 'DM Serif Display', Georgia, serif;
  --font-body: 'DM Sans', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
}
Phase 3 — Component Architecture
Redesign ALL components. For each component below, output the complete updated file:

3.1 Global Layout & Navigation
Top navbar: dark bg-dark with warm text-inverse, logo in var(--font-display), nav links spaced with subtle underline on hover

Ticker/marquee strip: replace ■ bullets with thin | dividers, reduce font weight, soft animation

Remove aggressive ALL-CAPS from nav links (use Title Case)

3.2 Market Cards
Background: var(--bg-surface), 12px border-radius, 1px var(--border-subtle)

Category badge: pill shape, muted accent, uppercase tracking-wider size-10

Title: DM Serif Display, 18px, text-primary

Volume display: DM Sans mono variant, text-secondary

YES/NO buttons: YES → soft green outlined, NO → soft red outlined; on hover fill

"Build Parlay" CTA: var(--accent-mocha) fill, text-inverse, no border-radius above 8px

Payout multiplier: var(--font-mono), accent-gold color, large and bold

3.3 HOT RIGHT NOW Strip
Replace emoji 🔥 with SVG flame icon (inline, stroke-based, no fill)

Horizontal scroll with subtle shadow fade on edges

Cards: compact pill style with probability + volume

3.4 Sidebar / Filter Panel
Background: var(--bg-surface) with left border var(--border-default)

Filter pills: outlined by default, var(--accent-mocha) filled when active

Search input: borderless with bottom border only (underline style), DM Sans

3.5 Parlay Builder
"Build Your Parlay" section: editorial style, DM Serif Display heading

Example calculation block: monospace font, clean table layout

Probability visualization: thin horizontal bar, mocha gradient fill

3.6 Footer
Dark background var(--bg-dark), warm text

Social links: text-only with arrow →, no icons

Copyright: var(--font-mono) text-muted

Phase 4 — Typography & Motion
Add Google Fonts import for DM Serif Display + DM Sans + JetBrains Mono

Page load animation: stagger market cards with 40ms delay per card (CSS animation-delay)

Card hover: translateY(-2px) + box-shadow elevation, 200ms ease-out

Button interactions: scale(0.98) on active press

Marquee strip: CSS-only infinite scroll, pauses on hover

Phase 5 — Implementation
Apply all changes to the existing Next.js project (do NOT create a new project)

Update globals.css with the complete design token system

Update all component files identified in Phase 1

Ensure dark/light mode uses the same warm neutral system (no cold greys)

Run next build to verify zero TypeScript/CSS errors

If Vercel MCP is available — trigger a preview deployment and return the URL

Constraints
Keep ALL existing functionality intact (wallet connect, Polymarket API, parlay builder)

Do NOT change any API calls, data fetching logic, or TypeScript interfaces

Do NOT add new npm dependencies except Google Fonts (via next/font)

Every CSS change must use the design tokens — no hardcoded hex values in components

Mobile-first: ensure all components work at 375px width

Output Format
After completing all phases, provide:

List of all MCP tools and Skills discovered and used

Summary of changed files with brief description of each change

Preview URL (if Vercel MCP available)

Any TypeScript warnings encountered and how they were resolved