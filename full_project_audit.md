## CRITICAL PRODUCTION REQUIREMENTS

🚨 THIS PROJECT GOES LIVE TODAY — NO DEMO/MOCK DATA ALLOWED 🚨

ZERO TOLERANCE RULES:
- NO mock data anywhere in the codebase
- NO hardcoded wallet addresses
- NO fake/generated/synthesized data
- NO placeholder text (Lorem ipsum, "Coming soon", "Demo", "Test")
- NO disabled features with fake fallbacks
- Every feature must work with REAL data or show proper empty state

Before implementing anything — search polymarket-docs MCP to find
the correct real endpoint. If real data is unavailable for a feature
→ show empty state UI, never fake data.

MOCK DATA AUDIT (do this in Step 1 before anything else):
Run these searches across the entire codebase:
- grep -r "mock\|Mock\|MOCK" --include="*.ts" --include="*.tsx"
- grep -r "demo\|Demo\|DEMO" --include="*.ts" --include="*.tsx"  
- grep -r "fake\|Fake\|FAKE" --include="*.ts" --include="*.tsx"
- grep -r "dummy\|Dummy" --include="*.ts" --include="*.tsx"
- grep -r "placeholder\|lorem" --include="*.ts" --include="*.tsx"
- grep -r "Math.random\|Math.floor.*Math.random" --include="*.ts"
- grep -r "\[\].*\/\/ mock\|\/\/ fake\|\/\/ demo\|\/\/ test" --include="*.ts"

For EVERY match found:
- ❌ Replace with real Polymarket API data
- OR ❌ Replace with proper empty state component
- Document every replacement in the audit report

PRODUCTION CHECKLIST (verify before going live):
- [ ] All .env variables set in production environment
- [ ] Supabase production database (not dev/staging)
- [ ] Vercel deployment configured
- [ ] Vercel Cron active and tested
- [ ] All API rate limits handled
- [ ] Error boundaries on every page
- [ ] No 500 errors on any route
- [ ] Mobile tested on real device
- [ ] Wallet connect tested with real wallet
- [ ] Real order placement tested end-to-end

You are a senior full-stack TypeScript/Next.js/React engineer,
blockchain developer, UI/UX specialist and QA engineer.

Connect these MCP servers before starting:
- polymarket-docs — for ALL Polymarket API validation
- context7 — for Next.js, React, Tailwind, Supabase, Jest, Playwright

IMPORTANT: Use MCP servers before implementing anything.
Search documentation first, then write code.

---

## Project Context
This is PolyParlay — a Polymarket prediction market parlay app.
Stack: Next.js 14, TypeScript, Tailwind CSS, Supabase, wagmi/viem,
Polymarket CLOB API, Gamma API, Data API.

Already completed in previous sessions:
✅ Supabase migration (parlays, comments, leaderboard, gamification)
✅ Bridge UI (BridgeModal with Deposit/Withdraw/Swap tabs)
✅ Dead code removal (Prisma deleted, /api/sign removed)
✅ Real analytics data (data-api + gamma-api, no mocked data)
✅ Arkham analytics dashboard (6 modules built)
✅ HTTP 425 exponential backoff in gamma.ts
✅ Order polling & status tracking
✅ Balance/allowance checks before orders
✅ console.log cleanup (except cron)
✅ Leaderboard time filters (weekly/monthly/all-time)
✅ package.json Prisma scripts removed

Previously interrupted on: Task 3 — Design System & UI Unification
Design audit was started but not completed.

---

## STEP 1 — Full Project Audit (do this first)

Before doing anything else — scan the ENTIRE project and report:

### 1.1 — Code Quality Audit
- Any remaining mock/hardcoded data in API routes
- Any remaining console.log in production code (except cron)
- Any TODO/FIXME comments
- Any unused imports or dead code files
- Any .env variables used in code but missing from .env.example
- Duplicate logic across files

### 1.2 — API & Data Audit
Search polymarket-docs MCP: "endpoints overview"
- All /api/* routes — do they use correct Polymarket endpoints?
- Any route still calling Polymarket APIs directly from client?
- Any route missing error handling or returning 500 on API failure?
- Are all Supabase queries using proper TypeScript types?

### 1.3 — TypeScript Audit
- Run: npx tsc --noEmit
- List and fix ALL type errors found

### 1.4 — Dependency Audit
- Any unused packages in package.json?
- Any outdated/vulnerable packages?
- Is @prisma/client fully removed?

Output audit results as:
✅ OK | ❌ Issue found (file path + description) | ⚠️ Warning

---

## STEP 2 — Fix All Audit Issues

Fix every ❌ and ⚠️ found in Step 1.
After fixing: run npx tsc --noEmit → must be 0 errors.

---

## STEP 3 — Design System & UI Unification
(Continue from where previous session was interrupted)

Search context7 MCP: "Tailwind CSS design tokens"
Search context7 MCP: "shadcn/ui component library"

### 3.1 — Design Audit
Scan every page and component. Document:
- Inconsistent colors (hardcoded hex vs CSS variables)
- Inconsistent font sizes and weights
- Inconsistent spacing, border radius, shadows
- Inconsistent button/card/modal styles

### 3.2 — Design Tokens
Extend tailwind.config.ts with unified tokens:

Colors (dark theme — match existing Arkham analytics style):
- primary, primary-hover, primary-active
- surface-1 (background), surface-2 (card), surface-3 (elevated)
- border-default, border-subtle, border-strong
- text-primary, text-secondary, text-muted, text-disabled
- success, warning, error, info
- polymarket-yes (green), polymarket-no (red)

Typography:
- font-display, font-body, font-mono
- size scale: xs, sm, base, lg, xl, 2xl, 3xl

### 3.3 — Component Library
Create/update components/ui/:
- Button (primary, secondary, ghost, danger / sm, md, lg)
- Card (default, elevated, bordered)
- Badge (success, warning, error, info, neutral)
- Input, Select, Textarea
- Modal (unified wrapper)
- Skeleton (loading states)
- Toast (notifications)
- Table (leaderboard, traders)
- Tabs (BridgeModal, analytics)

### 3.4 — Apply Across All Pages
Priority order:
1. app/market/[id]/
2. app/portfolio/
3. app/my-parlays/
4. All modals (BridgeModal, ConfirmModal, QuickSetupModal)
5. Navbar / Header
6. Home page
7. app/analytics/ (verify Arkham style is consistent)

Rules:
- Do NOT redesign layouts — only unify colors/fonts/components
- Replace hardcoded values with design tokens
- Dark mode must work on every page
- Mobile responsive on every page
- Use Arkham analytics as visual reference standard

### 3.5 — Consistency Verification
For every page:
- ✅ Unified
- ❌ Still inconsistent + what remains

---

## STEP 4 — Automated Test Suite

Search context7 MCP: "Jest TypeScript Next.js"
Search context7 MCP: "Playwright E2E Next.js TypeScript"
Search context7 MCP: "React Testing Library hooks"

### 4.1 — Unit Tests (Jest)
- lib/polymarket/order-builder.ts
- lib/polymarket/gamma.ts (mock HTTP 425 backoff)
- lib/polymarket/bridge.ts
- lib/gamification/ (XP, streaks, achievements)
- lib/supabase/client.ts

### 4.2 — API Route Tests (Jest + supertest)
Mock Supabase + Polymarket API with fixtures in __fixtures__/
Test every /api/* route:
- /api/user/parlays (GET, POST, PATCH)
- /api/comments (pagination, ownership check)
- /api/leaderboard (all time filters)
- /api/balance (insufficient funds)
- /api/order (submit + poll)
- /api/analytics/* (all 6 arkham routes)
- /api/cron/resolve (CRON_SECRET validation)

### 4.3 — Hook Tests (React Testing Library)
- useOrderSigning (full flow)
- useGamification (Supabase sync)
- useUsdcApproval (allowance + approve)
- useWhaleActivity (fetches from backend only)
- useEdgeScore (fetches from backend only)

### 4.4 — E2E Tests (Playwright)
- Wallet connect → proxy setup
- Search market → open market page
- Build parlay → confirm → submit
- Insufficient balance → BridgeModal auto-opens
- Portfolio → view + cancel order
- Leaderboard time filters
- Analytics dashboard loads all 6 modules

### 4.5 — Coverage
- Run: npx jest --coverage
- Target: 70%+ on lib/ and app/api/
- Fix any path below 70%

---

## FINAL VERIFICATION

After all steps complete:
1. npx tsc --noEmit → 0 errors
2. npm run build → exit code 0
3. npx jest --coverage → report results

Final report must include:
- All issues found in audit + resolution status
- Design tokens created (list)
- Pages unified ✅/❌
- Test files created (full list)
- Coverage % per directory
- Files modified / created / deleted
