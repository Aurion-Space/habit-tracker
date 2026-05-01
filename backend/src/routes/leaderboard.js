import { Router } from 'express';
import db from '../database.js';
import { asyncHandler, NotFoundError } from '../middleware/errorHandler.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Apply auth middleware
router.use(authMiddleware);

/**
 * GET /api/leaderboard
 * Get leaderboard data (default: all-time)
 */
router.get('/', asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const { type = 'all', category = '', limit = 20, offset = 0 } = req.query;

    let dateFilter = '';
    
    switch (type) {
      case 'weekly':
        dateFilter = "AND ul.updated_at >= date('now', '-7 days')";
        break;
      case 'monthly':
        dateFilter = "AND ul.updated_at >= date('now', '-30 days')";
        break;
      case 'all':
      default:
        dateFilter = '';
    }

    // Build the main query
    let query = `
      SELECT 
        u.id,
        u.name,
        ul.total_xp,
        ul.level,
        COUNT(DISTINCT h.id) as total_habits,
        COUNT(DISTINCT l.id) as total_completions
      FROM user_levels ul
      JOIN users u ON ul.user_id = u.id
      LEFT JOIN habits h ON h.user_id = u.id
      LEFT JOIN habit_logs l ON l.habit_id = h.id
      WHERE ul.total_xp > 0
    `;

    if (category) {
      query += ` AND EXISTS (SELECT 1 FROM habits h2 WHERE h2.user_id = u.id AND h2.category = '${category}')`;
    }

    if (dateFilter) {
      query += ` ${dateFilter.replace('ul.', 'ul.')}`;
    }

    query += `
      GROUP BY u.id
      ORDER BY ul.total_xp DESC
      LIMIT ? OFFSET ?
    `;

    const leaderboard = db.prepare(query).all(parseInt(limit) + 1, parseInt(offset));

    // Check if there are more results
    const hasMore = leaderboard.length > parseInt(limit);
    const results = hasMore ? leaderboard.slice(0, parseInt(limit)) : leaderboard;

    // Calculate ranks
    const rankedResults = results.map((entry, index) => ({
      ...entry,
      rank: parseInt(offset) + index + 1
    }));

    // Find current user's rank
    const userRank = db.prepare(`
      SELECT COUNT(*) + 1 as rank FROM user_levels
      WHERE total_xp > (
        SELECT total_xp FROM user_levels WHERE user_id = ?
      )
    `).get(userId).rank;

    // Get surrounding users (user's rank and those before/after)
    const surroundingLimit = 3;
    const surroundingStart = Math.max(0, userRank - surroundingLimit);
    const surroundingEnd = userRank + surroundingLimit;

    const surrounding = db.prepare(`
      SELECT 
        u.id,
        u.name,
        ul.total_xp,
        ul.level
      FROM user_levels ul
      JOIN users u ON ul.user_id = u.id
      ORDER BY ul.total_xp DESC
      LIMIT ? OFFSET ?
    `).all(surroundingEnd - surroundingStart, surroundingStart);

    const surroundingRanks = surrounding.map((entry, index) => ({
      ...entry,
      rank: surroundingStart + index + 1,
      is_current_user: entry.id === userId
    }));

    // Calculate leaderboard stats
    const totalUsers = db.prepare(`
      SELECT COUNT(*) as count FROM user_levels WHERE total_xp > 0
    `).get().count;

    res.json({
      success: true,
      data: {
        leaderboard: rankedResults,
        user_rank: userRank,
        surrounding_users: surroundingRanks,
        total_users: totalUsers,
        has_more: hasMore,
        type: type
      }
    });
  } catch (error) {
    console.error('Leaderboard endpoint error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to load leaderboard',
      message: error.message
    });
  }
}));

/**
 * GET /api/leaderboard/weekly
 * Get weekly leaderboard (XP earned this week)
 */
router.get('/weekly', asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0 } = req.query;

    // Get weekly XP earned
    const leaderboard = db.prepare(`
      SELECT 
        u.id,
        u.name,
        SUM(xp.amount) as weekly_xp,
        ul.level as level
      FROM xp_points xp
      JOIN users u ON xp.user_id = u.id
      JOIN user_levels ul ON ul.user_id = u.id
      WHERE xp.created_at >= date('now', '-7 days')
      GROUP BY u.id
      ORDER BY weekly_xp DESC, xp.created_at ASC
      LIMIT ? OFFSET ?
    `).all(parseInt(limit) + 1, parseInt(offset));

    const hasMore = leaderboard.length > parseInt(limit);
    const results = hasMore ? leaderboard.slice(0, parseInt(limit)) : leaderboard;

    const rankedResults = results.map((entry, index) => ({
      ...entry,
      rank: parseInt(offset) + index + 1
    }));

    // Current user's weekly XP
    const userWeeklyXP = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as weekly_xp
      FROM xp_points
      WHERE user_id = ? AND created_at >= date('now', '-7 days')
    `).get(userId).weekly_xp;

    res.json({
      success: true,
      data: {
        leaderboard: rankedResults,
        user_weekly_xp: userWeeklyXP,
        type: 'weekly',
        has_more: hasMore
      }
    });
  } catch (error) {
    console.error('Weekly leaderboard error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to load weekly leaderboard',
      message: error.message
    });
  }
}));

/**
 * GET /api/leaderboard/monthly
 * Get monthly leaderboard
 */
router.get('/monthly', asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0 } = req.query;

    const leaderboard = db.prepare(`
      SELECT 
        u.id,
        u.name,
        SUM(xp.amount) as monthly_xp,
        ul.level as level
      FROM xp_points xp
      JOIN users u ON xp.user_id = u.id
      JOIN user_levels ul ON ul.user_id = u.id
      WHERE xp.created_at >= date('now', '-30 days')
      GROUP BY u.id
      ORDER BY monthly_xp DESC, xp.created_at ASC
      LIMIT ? OFFSET ?
    `).all(parseInt(limit) + 1, parseInt(offset));

    const hasMore = leaderboard.length > parseInt(limit);
    const results = hasMore ? leaderboard.slice(0, parseInt(limit)) : leaderboard;

    const rankedResults = results.map((entry, index) => ({
      ...entry,
      rank: parseInt(offset) + index + 1
    }));

    const userMonthlyXP = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as monthly_xp
      FROM xp_points
      WHERE user_id = ? AND created_at >= date('now', '-30 days')
    `).get(userId).monthly_xp;

    res.json({
      success: true,
      data: {
        leaderboard: rankedResults,
        user_monthly_xp: userMonthlyXP,
        type: 'monthly',
        has_more: hasMore
      }
    });
  } catch (error) {
    console.error('Monthly leaderboard error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to load monthly leaderboard',
      message: error.message
    });
  }
}));

/**
 * GET /api/leaderboard/streaks
 * Get streak leaderboard based on completions in last 7 days
 * SIMPLIFIED: Uses simple unique day count instead of complex CTEs
 */
router.get('/streaks', asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0 } = req.query;

    // SIMPLE APPROACH: Count unique days with completions in last 7 days
    // This is much more efficient than complex streak CTEs
    const streakData = db.prepare(`
      SELECT 
        u.id,
        u.name,
        ul.level,
        COUNT(DISTINCT DATE(h.completed_date)) as current_streak
      FROM users u
      JOIN user_levels ul ON u.id = ul.user_id
      LEFT JOIN habits hbt ON hbt.user_id = u.id
      LEFT JOIN habit_logs h ON h.habit_id = hbt.id 
        AND h.completed_date >= date('now', '-7 days')
      WHERE ul.total_xp > 0
      GROUP BY u.id
      ORDER BY current_streak DESC, u.name ASC
      LIMIT ? OFFSET ?
    `).all(parseInt(limit) + 1, parseInt(offset));

    const hasMore = streakData.length > parseInt(limit);
    const results = hasMore ? streakData.slice(0, parseInt(limit)) : streakData;

    // Get current user's simple streak count
    const userStreakData = db.prepare(`
      SELECT COUNT(DISTINCT DATE(h.completed_date)) as streak
      FROM habit_logs h
      JOIN habits hbt ON h.habit_id = hbt.id
      WHERE hbt.user_id = ?
        AND h.completed_date >= date('now', '-7 days')
    `).get(userId);

    const userStreak = userStreakData?.streak || 0;

    const rankedResults = results.map((entry, index) => ({
      id: entry.id,
      name: entry.name,
      level: entry.level,
      current_streak: entry.current_streak,
      rank: parseInt(offset) + index + 1,
      is_current_user: entry.id === userId
    }));

    // Find user's rank in results
    const userRankIndex = rankedResults.findIndex(e => e.id === userId);
    const userStreakRank = userRankIndex >= 0 
      ? parseInt(offset) + userRankIndex + 1 
      : null;

    // Total users with activity
    const totalCount = db.prepare(`
      SELECT COUNT(DISTINCT hbt.user_id) as count
      FROM habit_logs h
      JOIN habits hbt ON h.habit_id = hbt.id
      WHERE h.completed_date >= date('now', '-7 days')
    `).get().count;

    res.json({
      success: true,
      data: {
        leaderboard: rankedResults,
        user_streak: userStreak,
        user_streak_rank: userStreakRank,
        total_users: totalCount,
        type: 'streaks',
        has_more: hasMore
      }
    });
  } catch (error) {
    console.error('Streaks endpoint error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to load streaks leaderboard',
      message: error.message
    });
  }
}));

/**
 * GET /api/leaderboard/categories/:category
 * Get category-specific leaderboard
 */
router.get('/categories/:category', asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const { category } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const leaderboard = db.prepare(`
      SELECT 
        u.id,
        u.name,
        ul.level,
        COUNT(DISTINCT h.id) as category_habits,
        COUNT(DISTINCT l.id) as category_completions
      FROM users u
      JOIN user_levels ul ON ul.user_id = u.id
      JOIN habits h ON h.user_id = u.id AND h.category = ?
      LEFT JOIN habit_logs l ON l.habit_id = h.id
      WHERE ul.total_xp > 0
      GROUP BY u.id
      ORDER BY category_completions DESC
      LIMIT ? OFFSET ?
    `).all(category, parseInt(limit) + 1, parseInt(offset));

    const hasMore = leaderboard.length > parseInt(limit);
    const results = hasMore ? leaderboard.slice(0, parseInt(limit)) : leaderboard;

    const rankedResults = results.map((entry, index) => ({
      ...entry,
      rank: parseInt(offset) + index + 1
    }));

    // Current user's stats in this category
    const userCategoryStats = db.prepare(`
      SELECT 
        COUNT(DISTINCT h.id) as habits,
        COUNT(DISTINCT l.id) as completions
      FROM habits h
      LEFT JOIN habit_logs l ON l.habit_id = h.id
      WHERE h.user_id = ? AND h.category = ?
    `).get(userId, category);

    // User's rank in category
    const userRank = db.prepare(`
      SELECT COUNT(*) + 1 as rank FROM (
        SELECT u.id, COUNT(l.id) as completions
        FROM users u
        JOIN habits h ON h.user_id = u.id AND h.category = ?
        LEFT JOIN habit_logs l ON l.habit_id = h.id
        GROUP BY u.id
        HAVING completions > ?
      )
    `).get(category, userCategoryStats.completions).rank;

    res.json({
      success: true,
      data: {
        leaderboard: rankedResults,
        category: category,
        user_stats: {
          habits: userCategoryStats.habits,
          completions: userCategoryStats.completions
        },
        user_rank: userRank,
        has_more: hasMore
      }
    });
  } catch (error) {
    console.error('Categories leaderboard error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to load category leaderboard',
      message: error.message
    });
  }
}));

/**
 * GET /api/leaderboard/me
 * Get current user's rank and stats
 */
router.get('/me', asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's level info
    const userLevel = db.prepare(`
      SELECT * FROM user_levels WHERE user_id = ?
    `).get(userId);

    // Get user's overall rank
    const overallRank = db.prepare(`
      SELECT COUNT(*) + 1 as rank FROM user_levels
      WHERE total_xp > COALESCE((SELECT total_xp FROM user_levels WHERE user_id = ?), 0)
    `).get(userId).rank;

    // Get weekly XP
    const weeklyXP = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as xp FROM xp_points
      WHERE user_id = ? AND created_at >= date('now', '-7 days')
    `).get(userId).xp;

    // Get monthly XP
    const monthlyXP = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as xp FROM xp_points
      WHERE user_id = ? AND created_at >= date('now', '-30 days')
    `).get(userId).xp;

    // Get top 3 users
    const topUsers = db.prepare(`
      SELECT u.id, u.name, ul.total_xp, ul.level
      FROM user_levels ul
      JOIN users u ON ul.user_id = u.id
      ORDER BY ul.total_xp DESC
      LIMIT 3
    `).all();

    // Get user's current streak (simple day count in last 7 days)
    const streakData = db.prepare(`
      SELECT COUNT(DISTINCT DATE(h.completed_date)) as streak
      FROM habit_logs h
      JOIN habits hbt ON h.habit_id = hbt.id
      WHERE hbt.user_id = ?
        AND h.completed_date >= date('now', '-7 days')
    `).get(userId);

    const currentStreak = streakData?.streak || 0;

    // Get user's badges count
    const badgesCount = db.prepare(`
      SELECT COUNT(*) as count FROM user_badges WHERE user_id = ?
    `).get(userId).count;

    res.json({
      success: true,
      data: {
        level: userLevel?.level || 1,
        total_xp: userLevel?.total_xp || 0,
        overall_rank: overallRank,
        weekly_xp: weeklyXP,
        monthly_xp: monthlyXP,
        current_streak: currentStreak,
        badges_count: badgesCount,
        top_users: topUsers.map((u, i) => ({ ...u, rank: i + 1 }))
      }
    });
  } catch (error) {
    console.error('User stats endpoint error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to load user stats',
      message: error.message
    });
  }
}));

export default router;
