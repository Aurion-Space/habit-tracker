import { Router } from 'express';
import db from '../database.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Apply auth middleware
router.use(authMiddleware);

/**
 * Badge definitions
 */
const BADGES = {
  // Starter badges
  FIRST_HABIT: {
    id: 'first_habit',
    name: 'First Step',
    description: 'Completed your first habit',
    icon: '🌱',
    check: (userId) => {
      const count = db.prepare(`
        SELECT COUNT(*) as count FROM habit_logs h
        JOIN habits hbt ON h.habit_id = hbt.id
        WHERE hbt.user_id = ?
      `).get(userId).count;
      return count >= 1;
    }
  },
  FIRST_WEEK: {
    id: 'first_week',
    name: 'Week Warrior',
    description: 'Maintained a 7-day streak',
    icon: '🔥',
    check: (userId) => {
      try {
        const result = db.prepare(`
          SELECT COUNT(DISTINCT h.completed_date) as days
          FROM habit_logs h
          JOIN habits hbt ON h.habit_id = hbt.id
          WHERE hbt.user_id = ?
            AND h.completed_date >= date('now', '-7 days')
          LIMIT 1
        `).get(userId);
        return result && result.days >= 7;
      } catch (err) {
        return false;
      }
    }
  },
  FIRST_MONTH: {
    id: 'first_month',
    name: 'Month Master',
    description: 'Maintained a 30-day streak',
    icon: '💎',
    check: (userId) => {
      try {
        const result = db.prepare(`
          SELECT COUNT(DISTINCT h.completed_date) as days
          FROM habit_logs h
          JOIN habits hbt ON h.habit_id = hbt.id
          WHERE hbt.user_id = ?
            AND h.completed_date >= date('now', '-30 days')
          LIMIT 1
        `).get(userId);
        return result && result.days >= 30;
      } catch (err) {
        return false;
      }
    }
  },
  CENTURY: {
    id: 'century',
    name: 'Century Club',
    description: 'Completed 100 habit logs',
    icon: '💯',
    check: (userId) => {
      const count = db.prepare(`
        SELECT COUNT(*) as count FROM habit_logs h
        JOIN habits hbt ON h.habit_id = hbt.id
        WHERE hbt.user_id = ?
      `).get(userId).count;
      return count >= 100;
    }
  },
  
  // XP-based level badges
  LEVEL_5: {
    id: 'level_5',
    name: 'Rising Star',
    description: 'Reached Level 5',
    icon: '⭐',
    check: (userId) => {
      const level = getLevel(userId);
      return level >= 5;
    }
  },
  LEVEL_10: {
    id: 'level_10',
    name: 'Habit Hero',
    description: 'Reached Level 10',
    icon: '🦸',
    check: (userId) => {
      const level = getLevel(userId);
      return level >= 10;
    }
  },
  LEVEL_25: {
    id: 'level_25',
    name: 'Habit Legend',
    description: 'Reached Level 25',
    icon: '👑',
    check: (userId) => {
      const level = getLevel(userId);
      return level >= 25;
    }
  },
  LEVEL_50: {
    id: 'level_50',
    name: 'Habit Master',
    description: 'Reached Level 50',
    icon: '🏆',
    check: (userId) => {
      const level = getLevel(userId);
      return level >= 50;
    }
  },

  // Social badges
  FIRST_BUDDY: {
    id: 'first_buddy',
    name: 'Social Butterfly',
    description: 'Made your first buddy',
    icon: '🦋',
    check: (userId) => {
      const count = db.prepare(`
        SELECT COUNT(*) as count FROM buddies
        WHERE (user_id = ? OR buddy_id = ?) AND status = 'accepted'
      `).get(userId, userId).count;
      return count >= 1;
    }
  },
  FIVE_BUDDIES: {
    id: 'five_buddies',
    name: 'Popular',
    description: 'Made 5 buddies',
    icon: '🎉',
    check: (userId) => {
      const count = db.prepare(`
        SELECT COUNT(*) as count FROM buddies
        WHERE (user_id = ? OR buddy_id = ?) AND status = 'accepted'
      `).get(userId, userId).count;
      return count >= 5;
    }
  },
  
  // Habit variety badges
  FIVE_HABITS: {
    id: 'five_habits',
    name: 'Habit Builder',
    description: 'Created 5 habits',
    icon: '🏗️',
    check: (userId) => {
      const count = db.prepare(`
        SELECT COUNT(*) as count FROM habits WHERE user_id = ?
      `).get(userId).count;
      return count >= 5;
    }
  },
  TEN_HABITS: {
    id: 'ten_habits',
    name: 'Habit Architect',
    description: 'Created 10 habits',
    icon: '🏛️',
    check: (userId) => {
      const count = db.prepare(`
        SELECT COUNT(*) as count FROM habits WHERE user_id = ?
      `).get(userId).count;
      return count >= 10;
    }
  },

  // Group habit badges
  FIRST_GROUP: {
    id: 'first_group',
    name: 'Team Player',
    description: 'Joined a group habit',
    icon: '👥',
    check: (userId) => {
      const count = db.prepare(`
        SELECT COUNT(*) as count FROM group_habit_members WHERE user_id = ?
      `).get(userId).count;
      return count >= 1;
    }
  },
  
  // Sharing badges
  FIRST_SHARE: {
    id: 'first_share',
    name: 'Sharing is Caring',
    description: 'Shared your first habit template',
    icon: '📤',
    check: (userId) => {
      const count = db.prepare(`
        SELECT COUNT(*) as count FROM shared_habits WHERE user_id = ?
      `).get(userId).count;
      return count >= 1;
    }
  },
  
  // Consistency badges
  PERFECT_WEEK: {
    id: 'perfect_week',
    name: 'Perfect Week',
    description: 'Completed all habits for 7 days straight',
    icon: '✨',
    check: (userId) => {
      return checkPerfectDays(userId, 7);
    }
  },
  PERFECT_MONTH: {
    id: 'perfect_month',
    name: 'Perfect Month',
    description: 'Completed all habits for 30 days straight',
    icon: '🌟',
    check: (userId) => {
      return checkPerfectDays(userId, 30);
    }
  }
};

/**
 * Helper: Get current streak (simplified - counts recent days with completions)
 * Returns the count of unique days with completions in the last 30 days
 */
function getCurrentStreak(userId) {
  try {
    // Count unique days with completions in the last 30 days (LIMIT prevents excess)
    const result = db.prepare(`
      SELECT COUNT(DISTINCT h.completed_date) as streak
      FROM habit_logs h
      JOIN habits hbt ON h.habit_id = hbt.id
      WHERE hbt.user_id = ?
        AND h.completed_date >= date('now', '-30 days')
      LIMIT 1
    `).get(userId);
    
    return result ? result.streak : 0;
  } catch (err) {
    console.error('getCurrentStreak error:', err.message);
    return 0;
  }
}

/**
 * Helper: Check perfect days streak (simplified - uses a single efficient query)
 * Returns true if user completed all their habits for the last N days
 */
function checkPerfectDays(userId, days) {
  try {
    // Get user's habits count
    const habitCount = db.prepare('SELECT COUNT(*) as count FROM habits WHERE user_id = ?').get(userId);
    if (!habitCount || habitCount.count === 0) return false;

    // Count days where all habits were completed (single efficient query)
    const perfectDays = db.prepare(`
      SELECT COUNT(DISTINCT h.completed_date) as perfect_days
      FROM habit_logs h
      JOIN habits hbt ON h.habit_id = hbt.id
      WHERE hbt.user_id = ?
        AND h.completed_date >= date('now', '-' || ? || ' days')
      GROUP BY h.completed_date
      HAVING COUNT(DISTINCT h.habit_id) = ?
      LIMIT 1
    `).get(userId, days, habitCount.count);

    return perfectDays ? perfectDays.perfect_days >= days : false;
  } catch (err) {
    console.error('checkPerfectDays error:', err.message);
    return false;
  }
}

/**
 * Helper: Get level from XP
 */
export function getLevel(userId) {
  const userLevel = db.prepare('SELECT level FROM user_levels WHERE user_id = ?').get(userId);
  return userLevel ? userLevel.level : 1;
}

/**
 * XP to level calculation: Level = floor(sqrt(XP / 100)) + 1
 */
export function calculateLevel(totalXP) {
  return Math.floor(Math.sqrt(totalXP / 100)) + 1;
}

/**
 * XP needed for next level
 */
export function xpForLevel(level) {
  return Math.pow(level - 1, 2) * 100;
}

/**
 * Award XP to a user
 */
export function awardXP(userId, amount, reason, sourceType = 'habit', sourceId = null) {
  // Insert XP record
  db.prepare(`
    INSERT INTO xp_points (user_id, amount, reason, source_type, source_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(userId, amount, reason, sourceType, sourceId);

  // Update total XP
  db.prepare(`
    INSERT INTO user_levels (user_id, total_xp, level, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET
      total_xp = total_xp + ?,
      level = ?,
      updated_at = CURRENT_TIMESTAMP
  `).run(userId, amount, calculateLevel(amount), calculateLevel(amount));

  return true;
}

/**
 * Check and award badges for a user
 */
export function checkAndAwardBadges(userId) {
  try {
    const awardedBadges = [];

    for (const badgeKey of Object.keys(BADGES)) {
      const badge = BADGES[badgeKey];
      
      try {
        // Check if user already has this badge
        const existing = db.prepare(`
          SELECT id FROM user_badges WHERE user_id = ? AND badge_id = ?
        `).get(userId, badge.id);

        if (!existing && badge.check(userId)) {
          // Award the badge
          db.prepare(`
            INSERT INTO user_badges (user_id, badge_id, badge_name, badge_description, badge_icon)
            VALUES (?, ?, ?, ?, ?)
          `).run(userId, badge.id, badge.name, badge.description, badge.icon);
          
          awardedBadges.push(badge);
        }
      } catch (err) {
        // Skip individual badge check errors
        console.error(`Badge check error for ${badgeKey}:`, err.message);
      }
    }

    return awardedBadges;
  } catch (err) {
    console.error('checkAndAwardBadges error:', err.message);
    return [];
  }
}

/**
 * GET /api/xp
 * Get current user's XP and level info
 */
router.get('/', asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const userLevel = db.prepare(`
    SELECT * FROM user_levels WHERE user_id = ?
  `).get(userId);

  const totalXP = userLevel ? userLevel.total_xp : 0;
  const currentLevel = userLevel ? userLevel.level : 1;
  const xpForNextLevel = xpForLevel(currentLevel + 1);
  const xpForCurrentLevel = xpForLevel(currentLevel);
  const xpProgress = totalXP - xpForCurrentLevel;
  const xpNeeded = xpForNextLevel - xpForCurrentLevel;

  res.json({
    success: true,
    data: {
      total_xp: totalXP,
      level: currentLevel,
      xp_progress: xpProgress,
      xp_needed: xpNeeded,
      xp_to_next_level: xpForNextLevel - totalXP
    }
  });
}));

/**
 * GET /api/xp/history
 * Get XP history for current user
 */
router.get('/history', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { limit = 50 } = req.query;

  const history = db.prepare(`
    SELECT * FROM xp_points 
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(userId, parseInt(limit));

  res.json({
    success: true,
    data: history
  });
}));

/**
 * GET /api/xp/badges
 * Get all badges for current user
 */
router.get('/badges', asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Get earned badges
  const earnedBadges = db.prepare(`
    SELECT * FROM user_badges WHERE user_id = ? ORDER BY earned_at DESC
  `).all(userId);

  // Get all badge IDs earned
  const earnedBadgeIds = earnedBadges.map(b => b.badge_id);

  // Create list of all possible badges with earned status
  const allBadges = Object.values(BADGES).map(badge => ({
    ...badge,
    earned: earnedBadgeIds.includes(badge.id),
    earned_at: earnedBadges.find(b => b.badge_id === badge.id)?.earned_at || null
  }));

  res.json({
    success: true,
    data: {
      badges: allBadges,
      earned_count: earnedBadges.length,
      total_count: Object.keys(BADGES).length
    }
  });
}));

/**
 * POST /api/xp/check-badges
 * Manually check and award badges (for testing or on-demand)
 */
router.post('/check-badges', asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const newBadges = checkAndAwardBadges(userId);

  res.json({
    success: true,
    data: {
      new_badges: newBadges,
      message: newBadges.length > 0 
        ? `Awarded ${newBadges.length} new badge(s)!` 
        : 'No new badges earned'
    }
  });
}));

/**
 * Award XP for completing a habit
 */
export function awardHabitCompletionXP(userId, habitId) {
  try {
    const habit = db.prepare('SELECT * FROM habits WHERE id = ? AND user_id = ?').get(habitId, userId);
    if (!habit) return null;

    // Base XP for completion
    let xpAmount = 10;
    
    // Bonus for frequency (harder habits give more XP)
    if (habit.frequency === 'weekly') xpAmount = 15;
    if (habit.frequency === 'monthly') xpAmount = 25;

    // Bonus for streak (using simplified streak calculation)
    const streak = getCurrentStreak(userId);
    if (streak >= 7) xpAmount += 5;
    if (streak >= 30) xpAmount += 10;
    if (streak >= 100) xpAmount += 25;

    awardXP(userId, xpAmount, `Completed habit: ${habit.name}`, 'habit', habitId);
    
    // Check badges with error handling (don't fail XP award if badge check fails)
    try {
      checkAndAwardBadges(userId);
    } catch (badgeErr) {
      console.error('Badge check failed:', badgeErr.message);
    }

    return xpAmount;
  } catch (err) {
    console.error('awardHabitCompletionXP error:', err.message);
    return null;
  }
}

export default router;
