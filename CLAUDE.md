# CLAUDE.md - Developer Quick Reference

## 🛠️ CLI Commands
- **Start Dev Server**: `npm run dev`
- **Production Build**: `npm run build`
- **Lint Code**: `npm run lint`
- **Run Unit Tests**: `npx tsx src/lib/elo.test.ts`

## 🏓 Architecture & Guide
For a comprehensive overview of files, local/postgres DB driver wrappers, Next.js rules, styling, and timezone offset helpers, see:
👉 **[AGENTS.md](file:///home/mayur/Documents/repos/tt-power-ranking/AGENTS.md)**

## 🛡️ Admin Password
- Admin panel unlock password: `tabletennis`

## ✍️ Code Guidelines
- **Typing**: The `@typescript-eslint/no-explicit-any` rule is disabled; using `any` is allowed for compatibility with existing DB drivers.
- **Effects**: State setters inside `useEffect` are allowed (rule `react-hooks/set-state-in-effect` is disabled).
- **Git Flow**: Stage, commit, and push modifications directly to `main` branch.
