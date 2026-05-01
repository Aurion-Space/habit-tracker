import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import db from '../database.js';
import { asyncHandler, NotFoundError, ValidationError } from '../middleware/errorHandler.js';
import { authMiddleware } from '../middleware/auth.js';
const router = Router();

/**
 * Inline getLevel function - queries database directly
 */
function getLevel(userId) {
  const userLevel = db.prepare('SELECT level FROM user_levels WHERE user_id = ?').get(userId);
  return userLevel ? userLevel.level : 1;
}

/**
 * Validation middleware
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }
  next();
};

/**
 * GET /api/profiles/:username
 * Get public profile for a user
 */
router.get('/:username', asyncHandler(async (req, res) => {
  const { username } = req.params;

  // Find user by name
  const user = db.prepare(`
    SELECT id, name, email FROM users WHERE name = ? OR email = ?
  `).get(username, username);

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Check if profile is public
  const profile = db.prepare(`
    SELECT * FROM public_profiles WHERE user_id = ?
  `).get(user.id);

  // Check if current user is viewing (for privacy)
  let isOwnProfile = false;
  if (req.user && req.user.id === user.id) {
    isOwnProfile = true;
  }

  // If profile doesn't exist, default to public
  const isPublic = profile ? !!profile.is_public : true;

  // If not public and not own profile, return limited info
  if (!isPublic && !isOwnProfile) {
    return res.json({
      success: true,
      data: {
        name: user.name,
        is_public: false,
        message: 'This profile is private'
      }
    });
  }

  // Get user stats
  const stats = getUserStats(user.id);

  // Get level
  const level = getLevel(user.id);

  // Get badges
  const badges = db.prepare(`
    SELECT badge_id, badge_name, badge_description, badge_icon, earned_at 
    FROM user_badges 
    WHERE user_id = ?
    ORDER BY earned_at DESC
    LIMIT 10
  `).all(user.id);

  // Get top habits (with highest completion rates)
  const topHabits = db.prepare(`
    SELECT 
      h.id,
      h.name,
      h.category,
      h.frequency,
      COUNT(l.id) as total_completions,
      (julianday('now') - julianday(h.created_at)) as days_active
    FROM habits h
    LEFT JOIN habit_logs l ON h.id = l.habit_id
    WHERE h.user_id = ?
    GROUP BY h.id
    ORDER BY total_completions DESC
    LIMIT 5
  `).all(user.id);

  // Calculate completion rates for top habits
  const topHabitsWithRates = topHabits.map(habit => {
    const daysActive = Math.max(1, Math.ceil(habit.days_active));
    let expectedCompletions;
    
    if (habit.frequency === 'daily') expectedCompletions = daysActive;
    else if (habit.frequency === 'weekly') expectedCompletions = Math.ceil(daysActive / 7);
    else expectedCompletions = Math.ceil(daysActive / 30);

    const completionRate = Math.min(100, Math.round((habit.total_completions / expectedCompletions) * 100));

    return {
      ...habit,
      completion_rate: completionRate,
      days_active: daysActive
    };
  });

  res.json({
    success: true,
    data: {
      user_id: user.id,
      name: user.name,
      bio: profile?.bio || '',
      avatar_url: profile?.avatar_url || '',
      is_public: isPublic,
      stats: {
        ...stats,
        level: level
      },
      badges: badges,
      top_habits: topHabitsWithRates
    }
  });
}));

/**
 * Helper: Get user stats
 */
function getUserStats(userId) {
  // Total habits
  const totalHabits = db.prepare(`
    SELECT COUNT(*) as count FROM habits WHERE user_id = ?
  `).get(userId).count;

  // Total completions
  const totalCompletions = db.prepare(`
    SELECT COUNT(*) as count FROM habit_logs h
    JOIN habits hbt ON h.habit_id = hbt.id
    WHERE hbt.user_id = ?
  `).get(userId).count;

  // Longest streak
  const streakData = db.prepare(`
    SELECT DISTINCT h.completed_date 
    FROM habit_logs h
    JOIN habits hbt ON h.habit_id = hbt.id
    WHERE hbt.user_id = ?
    ORDER BY h.completed_date DESC
  `).all(userId);

  let longestStreak = 0;
  let tempStreak = 0;
  let previousDate = null;

  for (const row of streakData) {
    if (previousDate === null) {
      tempStreak = 1;
    } else {
      const diff = Math.floor((new Date(previousDate) - new Date(row.completed_date)) / (1000 * 60 * 60 * 24));
      if (diff === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    previousDate = row.completed_date;
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  // Current streak
  let currentStreak = 0;
  if (streakData.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const firstDate = new Date(streakData[0].completed_date);
    firstDate.setHours(0, 0, 0, 0);
    const daysDiff = Math.floor((today - firstDate) / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= 1) {
      currentStreak = 1;
      let prevDate = firstDate;
      for (let i = 1; i < streakData.length; i++) {
        const currDate = new Date(streakData[i].completed_date);
        currDate.setHours(0, 0, 0, 0);
        const diff = Math.floor((prevDate - currDate) / (1000 * 60 * 60 * 24));
        if (diff === 1) {
          currentStreak++;
          prevDate = currDate;
        } else {
          break;
        }
      }
    }
  }

  // Total XP
  const userLevel = db.prepare(`
    SELECT total_xp FROM user_levels WHERE user_id = ?
  `).get(userId);

  // Member since
  const memberSince = db.prepare(`
    SELECT created_at FROM users WHERE id = ?
  `).get(userId).created_at;

  return {
    total_habits: totalHabits,
    total_completions: totalCompletions,
    longest_streak: longestStreak,
    current_streak: currentStreak,
    total_xp: userLevel?.total_xp || 0,
    member_since: memberSince
  };
}

/**
 * GET /api/profiles/me
 * Get current user's own profile settings
 */
router.get('/settings/me', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Get or create profile
  let profile = db.prepare(`
    SELECT * FROM public_profiles WHERE user_id = ?
  `).get(userId);

  if (!profile) {
    // Create default profile
    db.prepare(`
      INSERT INTO public_profiles (user_id, is_public, bio)
      VALUES (?, 1, '')
    `).run(userId);
    
    profile = db.prepare(`
      SELECT * FROM public_profiles WHERE user_id = ?
    `).get(userId);
  }

  // Get stats
  const stats = getUserStats(userId);
  const level = getLevel(userId);

  res.json({
    success: true,
    data: {
      ...profile,
      stats: {
        ...stats,
        level: level
      }
    }
  });
}));

/**
 * PUT /api/profiles/settings
 * Update profile settings (privacy, bio, etc.)
 */
router.put('/settings',
  authMiddleware,
  [
    body('is_public')
      .optional()
      .isBoolean().withMessage('is_public must be a boolean'),
    body('bio')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Bio must be at most 500 characters'),
    body('avatar_url')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Avatar URL must be at most 500 characters')
  ],
  validate,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { is_public, bio, avatar_url } = req.body;

    // Check if profile exists
    const existingProfile = db.prepare(`
      SELECT * FROM public_profiles WHERE user_id = ?
    `).get(userId);

    if (existingProfile) {
      // Update existing profile
      const updates = [];
      const values = [];

      if (is_public !== undefined) {
        updates.push('is_public = ?');
        values.push(is_public ? 1 : 0);
      }
      if (bio !== undefined) {
        updates.push('bio = ?');
        values.push(bio);
      }
      if (avatar_url !== undefined) {
        updates.push('avatar_url = ?');
        values.push(avatar_url);
      }

      if (updates.length > 0) {
        values.push(userId);
        db.prepare(`
          UPDATE public_profiles SET ${updates.join(', ')} WHERE user_id = ?
        `).run(...values);
      }
    } else {
      // Create new profile
      db.prepare(`
        INSERT INTO public_profiles (user_id, is_public, bio, avatar_url)
        VALUES (?, ?, ?, ?)
      `).run(userId, is_public ? 1 : 0, bio || '', avatar_url || '');
    }

    const updatedProfile = db.prepare(`
      SELECT * FROM public_profiles WHERE user_id = ?
    `).get(userId);

    res.json({
      success: true,
      data: updatedProfile,
      message: 'Profile updated successfully'
    });
  })
);

/**
 * GET /api/profiles/badges/:userId
 * Get badges for a specific user (public)
 */
router.get('/badges/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // Check if user's profile is public
  const profile = db.prepare(`
    SELECT * FROM public_profiles WHERE user_id = ?
  `).get(userId);

  const isPublic = profile ? !!profile.is_public : true;

  // Get user
  const user = db.prepare('SELECT id, name FROM users WHERE id = ?').get(userId);

  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (!isPublic) {
    return res.json({
      success: true,
      data: {
        name: user.name,
        badges: [],
        message: 'This user\'s profile is private'
      }
    });
  }

  const badges = db.prepare(`
    SELECT badge_id, badge_name, badge_description, badge_icon, earned_at 
    FROM user_badges 
    WHERE user_id = ?
    ORDER BY earned_at DESC
  `).all(userId);

  res.json({
    success: true,
    data: {
      name: user.name,
      badges: badges,
      earned_count: badges.length
    }
  });
}));

export default router;
