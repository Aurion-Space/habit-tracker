import express from 'express';
import cors from 'cors';
import { initializeDatabase } from './database.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/auth.js';
import habitsRouter from './routes/habits.js';
import logsRouter from './routes/logs.js';
import statsRouter from './routes/stats.js';
import authRouter from './routes/auth.js';
import buddiesRouter from './routes/buddies.js';
import profilesRouter from './routes/profiles.js';
import groupsRouter from './routes/groups.js';
import leaderboardRouter from './routes/leaderboard.js';
import sharedRouter from './routes/shared.js';
import xpRouter from './routes/xp.js';
import db from './database.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Habit Tracker API is running',
    timestamp: new Date().toISOString()
  });
});

// Auth routes (public)
app.use('/api/auth', authRouter);

// Protected /me endpoint
app.get('/api/me', authMiddleware, (req, res) => {
  res.json({
    success: true,
    data: req.user
  });
});

// Protected routes
app.use('/api/habits', habitsRouter);
app.use('/api/logs', logsRouter);
app.use('/api/stats', statsRouter);
app.use('/api/buddies', buddiesRouter);
app.use('/api/profiles', profilesRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/shared', sharedRouter);
app.use('/api/xp', xpRouter);

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.method} ${req.url} not found`
  });
});

// Error handling middleware
app.use(errorHandler);

// Initialize database and start server
initializeDatabase();

app.listen(PORT, () => {
  console.log(`🚀 Habit Tracker API running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Auth: http://localhost:${PORT}/api/auth/register, /api/auth/login`);
});

export default app;
