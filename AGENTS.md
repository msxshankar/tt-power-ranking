<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AI Agent Developer Guide & Reference

Welcome! This document provides information on the project architecture, tech stack, codebase structure, and workflows to help future AI coding agents build, test, and debug this application.

---

## 🏓 Project Overview
**TT Power Ranker** is a Next.js application that tracks table tennis matches between players, calculates live Elo rankings, displays recent matches, and provides an admin interface for data curation.

### Tech Stack
- **Framework**: Next.js 16.2.9 (App Router)
- **Database**: Dual-driver architecture (`src/lib/db.ts`):
  - **Local Development**: Local JSON file (`db.json`).
  - **Production**: Vercel/Neon Postgres (triggered when `DATABASE_URL` or `POSTGRES_URL` is set).
- **Styling**: Modern vanilla CSS with liquid-glass aesthetics and client-side light/dark mode support.

---

## 📂 Codebase Structure & Key Files

### 1. Data & Server Actions Layer
- [db.ts](file:///home/mayur/Documents/repos/tt-power-ranking/src/lib/db.ts): Contains database wrappers for both local `JsonDatabase` and remote `NeonDatabase` implementations. Supports adding players, renaming players, deleting players, adding matches (with optional `created_at` date), and updating/deleting matches.
- [actions.ts](file:///home/mayur/Documents/repos/tt-power-ranking/src/lib/actions.ts): Next.js Server Actions wrapping the database operations, enforcing validation rules, and calling `revalidatePath` to trigger server-side rendering refreshes.
- [elo.ts](file:///home/mayur/Documents/repos/tt-power-ranking/src/lib/elo.ts): Contains core Elo calculation logic, game score validators, and the match stats calculator (`calculateRankings`).

### 2. Client Components
- [AddMatchSection.tsx](file:///home/mayur/Documents/repos/tt-power-ranking/src/components/AddMatchSection.tsx): Form interface to record a match. Includes a date picker (defaulting to local today's date in `YYYY-MM-DD` format) and sends dates combined with current local time to preserve chronological order.
- [PlayersTable.tsx](file:///home/mayur/Documents/repos/tt-power-ranking/src/components/PlayersTable.tsx): Displays the player stats leaderboard (Wins, Losses, ELO). Includes the search filter, mobile-friendly horizontal badges layout, and the **"＋ Add Player"** modal dialog.
- [AdminDashboard.tsx](file:///home/mayur/Documents/repos/tt-power-ranking/src/components/AdminDashboard.tsx): Admin console secured by the password `tabletennis`. Allows deleting players/matches and editing match scores and dates.

### 3. App Core
- [layout.tsx](file:///home/mayur/Documents/repos/tt-power-ranking/src/app/layout.tsx): Top-level layout. Includes an inline head script to read client system color preferences (`prefers-color-scheme`) and apply dark/light theme dynamically.
- [page.tsx](file:///home/mayur/Documents/repos/tt-power-ranking/src/app/page.tsx): Main dashboard page. Fetches database records on the server, calculates Elo rankings, and passes the computed props down.

---

## ⚙️ Development, Testing & Verification Commands

Use these exact commands when developing features:

### 1. Running the Development Server
```bash
npm run dev
```

### 2. Building the Project (Compilation & TS Check)
```bash
npm run build
```

### 3. Running Business Logic Unit Tests
To run tests validating ELO computations and match validation rules:
```bash
npx tsx src/lib/elo.test.ts
```

### 4. Running the Linter
```bash
npm run lint
```
*Note*: ESLint is configured via [eslint.config.mjs](file:///home/mayur/Documents/repos/tt-power-ranking/eslint.config.mjs) to ignore `scratch/**` and disable several rules (`@typescript-eslint/no-explicit-any`, `react-hooks/set-state-in-effect`, and `prefer-const`) to match the codebase style.

---

## 💡 Key Development Rules for Future Agents
1. **Local vs Neon DB**: Never hardcode Neon SQL queries without checking if process.env database variables are available. If not, fallback to using `db.json` via process-level methods.
2. **Preventing Timezone Off-by-One Issues**: When dealing with user date inputs (e.g. `YYYY-MM-DD`), parse using local date parts (`year, monthIndex, day`) to construct standard ISO strings on the client. Combining selected dates with `now.getHours()` / `now.getMinutes()` is recommended to maintain chronological log sorting.
3. **Theme Preservation**: Ensure the inline head script in `layout.tsx` is preserved. It prevents visual flash during initial load by evaluating the theme prior to page hydration.
