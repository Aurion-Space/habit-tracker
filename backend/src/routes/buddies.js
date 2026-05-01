import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import db from '../database.js';
import { asyncHandler, NotFoundError, ValidationError } from '../middleware/errorHandler.js';
import { authMiddleware } from '../middleware/auth.js';


// Inline XP functions to avoid circular dependency with xp.js
function awardXPInline(userId, amount, reason, type) {
  try {
    db.prepare(`
      INSERT INTO xp_points (user_id, amount, reason, source_type)
      VALUES (?, ?, ?, ?)
    `).run(userId, amount, reason, type);
    
    // Update total
    db.prepare(`
      INSERT INTO user_levels (user_id, total_xp, level)
      VALUES (?, ?, 1)
      ON CONFLICT(user_id) DO UPDATE SET total_xp = total_xp + ?
    `).run(userId, amount, amount);
  } catch (e) {
    console.error('XP award error:', e.message);
  }
}

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

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
 * GET /api/buddies
 * Get all buddies (accepted) for current user
 */
router.get('/', asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Get accepted buddies where user is either user_id or buddy_id
  const buddies = db.prepare(`
    SELECT 
      b.id,
      b.status,
      b.created_at,
      b.updated_at,
      CASE 
        WHEN b.user_id = ? THEN b.buddy_id 
        ELSE b.user_id 
      END as other_user_id
    FROM buddies b
    WHERE (b.user_id = ? OR b.buddy_id = ?) AND b.status = 'accepted'
  `).all(userId, userId, userId);

  // Get user details and stats for each buddy
  const buddiesWithStats = buddies.map(b => {
    const otherUser = db.prepare(`
      SELECT id, name, email FROM users WHERE id = ?
    `).get(b.other_user_id);

    // Get buddy's total habits count
    const totalHabits = db.prepare(`
      SELECT COUNT(*) as count FROM habits WHERE user_id = ?
    `).get(b.other_user_id).count;

    // Get buddy's longest streak
    const longestStreak = getLongestStreak(b.other_user_id);

    // Get buddy's today's completions
    const today = new Date().toISOString().split('T')[0];
    const todayCompletions = db.prepare(`
      SELECT COUNT(*) as count FROM habit_logs h
      JOIN habits hbt ON h.habit_id = hbt.id
      WHERE hbt.user_id = ? AND h.completed_date = ?
    `).get(b.other_user_id, today).count;

    // Get buddy's current streak
    const currentStreak = getCurrentStreak(b.other_user_id);

    // Get buddy's XP and level
    const userLevel = db.prepare(`
      SELECT level, total_xp FROM user_levels WHERE user_id = ?
    `).get(b.other_user_id);

    return {
      ...b,
      user: otherUser,
      stats: {
        total_habits: totalHabits,
        longest_streak: longestStreak,
        current_streak: currentStreak,
        today_completions: todayCompletions,
        level: userLevel?.level || 1,
        total_xp: userLevel?.total_xp || 0
      }
    };
  });

  res.json({
    success: true,
    data: buddiesWithStats
  });
}));

/**
 * Helper: Get longest streak for a user
 */
function getLongestStreak(userId) {
  const streakData = db.prepare(`
    SELECT DISTINCT h.completed_date 
    FROM habit_logs h
    JOIN habits hbt ON h.habit_id = hbt.id
    WHERE hbt.user_id = ?
    ORDER BY h.completed_date DESC
  `).all(userId);

  if (streakData.length === 0) return 0;

  let longestStreak = 1;
  let tempStreak = 1;
  let previousDate = null;

  for (const row of streakData) {
    if (previousDate === null) {
      tempStreak = 1;
    } else {
      const daysDiff = Math.floor((new Date(previousDate) - new Date(row.completed_date)) / (1000 * 60 * 60 * 24));
      if (daysDiff === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    previousDate = row.completed_date;
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  return longestStreak;
}

/**
 * Helper: Get current streak for a user
 */
function getCurrentStreak(userId) {
  const streakData = db.prepare(`
    SELECT DISTINCT h.completed_date 
    FROM habit_logs h
    JOIN habits hbt ON h.habit_id = hbt.id
    WHERE hbt.user_id = ?
    ORDER BY h.completed_date DESC
  `).all(userId);

  if (streakData.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const firstDate = new Date(streakData[0].completed_date);
  firstDate.setHours(0, 0, 0, 0);

  const daysDiff = Math.floor((today - firstDate) / (1000 * 60 * 60 * 24));
  if (daysDiff > 1) return 0;

  let currentStreak = 1;
  let previousDate = firstDate;

  for (let i = 1; i < streakData.length; i++) {
    const currDate = new Date(streakData[i].completed_date);
    currDate.setHours(0, 0, 0, 0);

    const diff = Math.floor((previousDate - currDate) / (1000 * 60 * 60 * 24));
    if (diff === 1) {
      currentStreak++;
      previousDate = currDate;
    } else {
      break;
    }
  }

  return currentStreak;
}

/**
 * GET /api/buddies/requests
 * Get pending buddy requests (incoming)
 */
router.get('/requests', asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Get pending requests where current user is the buddy_id
  const requests = db.prepare(`
    SELECT 
      b.id,
      b.status,
      b.created_at,
      u.id as user_id,
      u.name,
      u.email
    FROM buddies b
    JOIN users u ON b.user_id = u.id
    WHERE b.buddy_id = ? AND b.status = 'pending'
    ORDER BY b.created_at DESC
  `).all(userId);

  res.json({
    success: true,
    data: requests
  });
}));

/**
 * POST /api/buddies/request
 * Send a buddy request to another user
 */
router.post('/request',
  [
    body('email')
      .isEmail().withMessage('Please enter a valid email')
      .normalizeEmail()
  ],
  validate,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { email } = req.body;

    // Find user by email
    const targetUser = db.prepare('SELECT id, name, email FROM users WHERE email = ?').get(email);

    if (!targetUser) {
      throw new NotFoundError('User not found with this email');
    }

    if (targetUser.id === userId) {
      throw new ValidationError('You cannot add yourself as a buddy');
    }

    // Check if request already exists
    const existingRequest = db.prepare(`
      SELECT * FROM buddies 
      WHERE (user_id = ? AND buddy_id = ?) OR (user_id = ? AND buddy_id = ?)
    `).get(userId, targetUser.id, targetUser.id, userId);

    if (existingRequest) {
      if (existingRequest.status === 'accepted') {
        throw new ValidationError('You are already buddies with this user');
      }
      if (existingRequest.status === 'pending') {
        if (existingRequest.user_id === userId) {
          throw new ValidationError('Buddy request already sent');
        } else {
          throw new ValidationError('You have a pending request from this user');
        }
      }
      if (existingRequest.status === 'declined') {
        // Allow re-requesting after decline
        db.prepare(`
          UPDATE buddies SET status = 'pending', updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(existingRequest.id);

        return res.status(201).json({
          success: true,
          message: 'Buddy request sent successfully',
          data: { id: existingRequest.id }
        });
      }
    }

    // Create buddy request
    const result = db.prepare(`
      INSERT INTO buddies (user_id, buddy_id, status)
      VALUES (?, ?, 'pending')
    `).run(userId, targetUser.id);

    res.status(201).json({
      success: true,
      message: 'Buddy request sent successfully',
      data: { id: result.lastInsertRowid }
    });
  })
);

/**
 * POST /api/buddies/:id/accept
 * Accept a buddy request
 */
router.post('/:id/accept',
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid request ID')
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if request exists and user is the buddy_id
    const request = db.prepare(`
      SELECT * FROM buddies WHERE id = ? AND buddy_id = ? AND status = 'pending'
    `).get(id, userId);

    if (!request) {
      throw new NotFoundError('Buddy request not found');
    }

    // Accept the request
    db.prepare(`
      UPDATE buddies SET status = 'accepted', updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(id);

    // Award XP to both users
    try {
      awardXPInline(userId, 25, 'Made a new buddy connection', 'social');
      awardXPInline(request.user_id, 25, 'Got a new buddy connection', 'social');
    } catch (e) {
      console.error('Error awarding XP for buddy:', e.message);
    }

    res.json({
      success: true,
      message: 'Buddy request accepted'
    });
  })
);

/**
 * POST /api/buddies/:id/decline
 * Decline a buddy request
 */
router.post('/:id/decline',
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid request ID')
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if request exists and user is the buddy_id
    const request = db.prepare(`
      SELECT * FROM buddies WHERE id = ? AND buddy_id = ? AND status = 'pending'
    `).get(id, userId);

    if (!request) {
      throw new NotFoundError('Buddy request not found');
    }

    // Decline the request
    db.prepare(`
      UPDATE buddies SET status = 'declined', updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(id);

    res.json({
      success: true,
      message: 'Buddy request declined'
    });
  })
);

/**
 * DELETE /api/buddies/:id
 * Remove a buddy
 */
router.delete('/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid buddy ID')
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if buddy exists
    const buddy = db.prepare(`
      SELECT * FROM buddies 
      WHERE id = ? AND status = 'accepted'
      AND (user_id = ? OR buddy_id = ?)
    `).get(id, userId, userId);

    if (!buddy) {
      throw new NotFoundError('Buddy not found');
    }

    // Delete the buddy relationship
    db.prepare('DELETE FROM buddies WHERE id = ?').run(id);

    res.json({
      success: true,
      message: 'Buddy removed successfully'
    });
  })
);

/**
 * POST /api/buddies/:buddyId/comment
 * Add a comment or reaction to a buddy's progress
 */
router.post('/:buddyId/comment',
  [
    param('buddyId').isInt({ min: 1 }).withMessage('Invalid buddy ID'),
    body('type')
      .isIn(['comment', 'react']).withMessage('Type must be comment or react'),
    body('content')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Comment must be at most 500 characters'),
    body('emoji')
      .optional()
      .trim()
      .isLength({ max: 10 }).withMessage('Emoji must be at most 10 characters')
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { buddyId } = req.params;
    const userId = req.user.id;
    const { type, content = '', emoji = '👍' } = req.body;

    // Check if buddy relationship exists
    const buddy = db.prepare(`
      SELECT * FROM buddies 
      WHERE id = ? AND status = 'accepted'
      AND (user_id = ? OR buddy_id = ?)
    `).get(buddyId, userId, userId);

    if (!buddy) {
      throw new NotFoundError('Buddy not found');
    }

    // The user being commented on
    const commentedUserId = buddy.user_id === userId ? buddy.buddy_id : buddy.user_id;

    // Create comment/reaction
    const result = db.prepare(`
      INSERT INTO buddy_comments (buddy_id, user_id, type, content, emoji)
      VALUES (?, ?, ?, ?, ?)
    `).run(buddyId, userId, type, content, emoji);

    // Award XP to the user being commented on
    try {
      const xpAmount = type === 'react' ? 2 : 5;
      awardXPInline(commentedUserId, xpAmount, 'Received a ' + type + ' from buddy', 'social');
    } catch (e) {
      console.error('Error awarding XP for comment:', e.message);
    }

    res.status(201).json({
      success: true,
      message: type === 'react' ? 'Reaction added' : 'Comment added',
      data: { id: result.lastInsertRowid }
    });
  })
);

/**
 * GET /api/buddies/:buddyId/comments
 * Get comments/reactions for a buddy
 */
router.get('/:buddyId/comments',
  [
    param('buddyId').isInt({ min: 1 }).withMessage('Invalid buddy ID')
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { buddyId } = req.params;
    const userId = req.user.id;

    // Check if buddy relationship exists
    const buddy = db.prepare(`
      SELECT * FROM buddies 
      WHERE id = ? AND status = 'accepted'
      AND (user_id = ? OR buddy_id = ?)
    `).get(buddyId, userId, userId);

    if (!buddy) {
      throw new NotFoundError('Buddy not found');
    }

    const comments = db.prepare(`
      SELECT 
        bc.*,
        u.name as user_name,
        u.email as user_email
      FROM buddy_comments bc
      JOIN users u ON bc.user_id = u.id
      WHERE bc.buddy_id = ?
      ORDER BY bc.created_at DESC
      LIMIT 50
    `).all(buddyId);

    res.json({
      success: true,
      data: comments
    });
  })
);

/**
 * GET /api/buddies/search/users
 * Search for users to add as buddies
 * Returns all users (not buddies) if no query, or filters by name/email if query provided
 */
router.get('/search/users', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { q } = req.query;

  // Base query - get users not already buddies
  let sql = `
    SELECT u.id, u.name, u.email, 
      (SELECT COUNT(*) FROM habits h WHERE h.user_id = u.id) as total_habits,
      (SELECT level FROM user_levels ul WHERE ul.user_id = u.id) as level
    FROM users u
    WHERE u.id != ? AND u.id NOT IN (
      SELECT CASE WHEN user_id = ? THEN buddy_id ELSE user_id END
      FROM buddies
      WHERE user_id = ? OR buddy_id = ?
    )
  `;
  let params = [userId, userId, userId, userId];

  // Add search filter if query provided
  if (q && q.length >= 2) {
    sql += ` AND (u.name LIKE ? OR u.email LIKE ?)`;
    params.push(`%${q}%`, `%${q}%`);
  }

  sql += ` ORDER BY u.name LIMIT 50`;
  
  const users = db.prepare(sql).all(...params);

  res.json({
    success: true,
    data: users
  });
}));

export default router;
