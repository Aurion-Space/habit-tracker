# Habit Tracker

Habit Tracker is a full-stack app for building habits, logging progress, tracking streaks, and sharing accountability with buddies or groups.

## Demo

Live demo: https://habit-tracker.aurarios.cloud

Use the live site to preview the app without installing dependencies locally.

## Features

- User registration and login.
- Habit creation and daily completion logging.
- Streaks, XP, badges, and leaderboard views.
- Buddy and group habit workflows.
- Calendar and profile views for progress review.

## Tech Stack

- React + Vite frontend
- Express backend
- SQLite via `better-sqlite3`
- JWT authentication
- Docker Compose deployment

## Local Development

Install and run the backend:

```bash
cd backend
npm install
npm start
```

Install and run the frontend:

```bash
cd frontend
npm install
npm run dev
```

## Environment

Start from `.env.example` and set a strong `JWT_SECRET` for any non-local deployment. Runtime databases, `.env` files, and generated build output are intentionally ignored.

