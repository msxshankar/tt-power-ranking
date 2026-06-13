# 🏓 TT Power Ranker

**TT Power Ranker** is a responsive, modern web application designed to track and calculate live table tennis rankings for a group of friends. Using the Elo rating algorithm, it automatically generates a power leaderboard, logs matches, and allows users to easily manage games.

---

## ✨ Features

- **Live Power Leaderboard**: Computes real-time Elo ratings and highlights the Top 5 players on a podium.
- **Match Recording Form**:
  - Record singles matches (1v1).
  - Select any custom date for the match (defaults to today's date).
  - Supports game point limits of **11** and **21** points.
  - Validates game scores automatically, enforcing the table tennis rule of winning by 2 clear points.
- **Player Stats Table**: Displays a detailed breakdown of wins, losses, and Elo scores segmented by game point rules (11 vs 21 points).
- **Recent Activity Log**: Shows a live log of the last 5 matches played.
- **Interactive ELO History Chart**: Visualizes how players' rankings evolve over time.
- **🛡️ Admin Panel**:
  - Secure login with the password `tabletennis`.
  - Rename or delete players.
  - Edit or delete historical matches, including scores and dates.
- **🎨 Glassmorphic Interface**: Responsive layout using fluid animations, Apple's liquid glass styling, and a light/dark mode toggle that automatically defaults to device/browser system preferences.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (with React 19)
- **Database**:
  - **Local Development**: Local JSON file database (`db.json`).
  - **Production**: PostgreSQL via [Neon Database](https://neon.tech/).
- **Styling**: Modern vanilla CSS with a glassmorphism design system.
- **Tests**: Direct TypeScript business logic validation runs.

---

## 🚀 Getting Started

### Prerequisites

Make sure you have Node.js (v20+) installed on your machine.

### Installation

1. Clone this repository to your local machine.
2. Install dependencies:
   ```bash
   npm install
   ```

### Running Locally

To run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the app.

---

## 🧪 Testing and Building

### Running Tests
To run core ELO calculation and score validation tests:
```bash
npx tsx src/lib/elo.test.ts
```

### Production Build
To test the build process:
```bash
npm run build
```

---

## 🔐 Admin Password
The password to unlock the Admin Panel features is: `tabletennis`
