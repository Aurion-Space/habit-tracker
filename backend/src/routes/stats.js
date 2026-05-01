import { Router } from 'express';
import db from '../database.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Apply auth middleware
router.use(authMiddleware);

/**
 * GET /api/stats
 * Get habit tracking statistics for current user
 */
router.get('/', asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Get total habits count
  const totalHabits = db.prepare('SELECT COUNT(*) as count FROM habits WHERE user_id = ?').get(userId).count;

  // Get total logs count for user's habits
  const totalLogs = db.prepare(`
    SELECT COUNT(*) as count FROM habit_logs h
    JOIN habits hbt ON h.habit_id = hbt.id
    WHERE hbt.user_id = ?
  `).get(userId).count;

  // Get logs by frequency
  const habitFrequencies = db.prepare(`
    SELECT frequency, COUNT(*) as count FROM habits WHERE user_id = ? GROUP BY frequency
  `).all(userId);

  const habitsByFrequency = { daily: 0, weekly: 0, monthly: 0 };
  habitFrequencies.forEach(row => {
    habitsByFrequency[row.frequency] = row.count;
  });

  // Get completion stats for the last 7 days
  const last7Days = db.prepare(`
    SELECT h.completed_date, COUNT(*) as count 
    FROM habit_logs h
    JOIN habits hbt ON h.habit_id = hbt.id
    WHERE hbt.user_id = ? AND h.completed_date >= date('now', '-7 days')
    GROUP BY h.completed_date
    ORDER BY h.completed_date DESC
  `).all(userId);

  // Get completion stats for the current month
  const currentMonth = db.prepare(`
    SELECT COUNT(*) as count 
    FROM habit_logs h
    JOIN habits hbt ON h.habit_id = hbt.id
    WHERE hbt.user_id = ? AND strftime('%Y-%m', h.completed_date) = strftime('%Y-%m', 'now')
  `).get(userId).count;

  // Get completion stats for the current year
  const currentYear = db.prepare(`
    SELECT COUNT(*) as count 
    FROM habit_logs h
    JOIN habits hbt ON h.habit_id = hbt.id
    WHERE hbt.user_id = ? AND strftime('%Y', h.completed_date) = strftime('%Y', 'now')
  `).get(userId).count;

  // Get streak data
  const streakData = db.prepare(`
    SELECT DISTINCT h.completed_date 
    FROM habit_logs h
    JOIN habits hbt ON h.habit_id = hbt.id
    WHERE hbt.user_id = ?
    ORDER BY h.completed_date DESC
  `).all(userId);

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let previousDate = null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const row of streakData) {
    const logDate = new Date(row.completed_date);
    logDate.setHours(0, 0, 0, 0);

    if (previousDate === null) {
      const daysDiff = Math.floor((today - logDate) / (1000 * 60 * 60 * 24));
      if (daysDiff <= 1) {
        currentStreak = 1;
      }
      tempStreak = 1;
    } else {
      const daysDiff = Math.floor((previousDate - logDate) / (1000 * 60 * 60 * 24));
      if (daysDiff === 1) {
        tempStreak++;
        if (currentStreak > 0) {
          currentStreak++;
        }
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
        if (currentStreak > 0) {
          currentStreak = 0;
        }
      }
    }
    previousDate = logDate;
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  // Get completion rate per habit
  const completionByHabit = db.prepare(`
    SELECT 
      h.id,
      h.name,
      h.frequency,
      COUNT(l.id) as total_completions,
      (SELECT COUNT(*) FROM habit_logs l2 
       JOIN habits h2 ON l2.habit_id = h2.id
       WHERE l2.habit_id = h.id 
       AND h2.user_id = ?
       AND l2.completed_date >= date('now', '-30 days')) as completions_last_30_days
    FROM habits h
    LEFT JOIN habit_logs l ON h.id = l.habit_id
    WHERE h.user_id = ?
    GROUP BY h.id
    ORDER BY completions_last_30_days DESC
  `).all(userId, userId);

  // Get average completions per day (last 30 days)
  const avgCompletionsPerDay = db.prepare(`
    SELECT 
      CAST(COUNT(*) AS FLOAT) / 30 as average
    FROM habit_logs h
    JOIN habits hbt ON h.habit_id = hbt.id
    WHERE hbt.user_id = ? AND h.completed_date >= date('now', '-30 days')
  `).get(userId).average || 0;

  res.json({
    success: true,
    data: {
      overview: {
        total_habits: totalHabits,
        total_logs: totalLogs,
        habits_by_frequency: habitsByFrequency
      },
      streaks: {
        current_streak: currentStreak,
        longest_streak: longestStreak
      },
      completions: {
        last_7_days: last7Days,
        current_month: currentMonth,
        current_year: currentYear,
        avg_per_day_last_30_days: Math.round(avgCompletionsPerDay * 100) / 100
      },
      by_habit: completionByHabit
    }
  });
}));

export default router;
