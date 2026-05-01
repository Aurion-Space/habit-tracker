import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import db from '../database.js';
import { asyncHandler, NotFoundError, ValidationError } from '../middleware/errorHandler.js';
import { authMiddleware } from '../middleware/auth.js';


const router = Router();

// Inline XP functions to avoid circular dependency with xp.js
function awardXPInline(userId, amount, reason, type) {
  try {
    db.prepare(`
      INSERT INTO xp_points (user_id, amount, reason, source_type)
      VALUES (?, ?, ?, ?)
    `).run(userId, amount, reason, type);
    
    db.prepare(`
      INSERT INTO user_levels (user_id, total_xp, level)
      VALUES (?, ?, 1)
      ON CONFLICT(user_id) DO UPDATE SET total_xp = total_xp + ?
    `).run(userId, amount, amount);
  } catch (e) {
    console.error('XP award error:', e.message);
  }
}

// Apply auth middleware
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
 * Valid categories
 */
const VALID_CATEGORIES = [
  'health', 'fitness', 'learning', 'productivity',
  'mindfulness', 'finance', 'creative', 'social',
  'lifestyle', 'work', 'personal'
];

/**
 * GET /api/groups
 * Get all group habits the user is a member of
 */
router.get('/', asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Get user's group memberships
  const memberships = db.prepare(`
    SELECT gm.*, gh.name, gh.description, gh.category, gh.created_at, gh.created_by,
      u.name as creator_name
    FROM group_habit_members gm
    JOIN group_habits gh ON gm.group_id = gh.id
    JOIN users u ON gh.created_by = u.id
    WHERE gm.user_id = ?
    ORDER BY gm.joined_at DESC
  `).all(userId);

  // Get group stats and today's completion status
  const groupsWithStats = memberships.map(membership => {
    const memberCount = db.prepare(`
      SELECT COUNT(*) as count FROM group_habit_members WHERE group_id = ?
    `).get(membership.group_id).count;

    const today = new Date().toISOString().split('T')[0];
    const myCompletion = db.prepare(`
      SELECT 1 FROM group_habit_completions 
      WHERE group_id = ? AND user_id = ? AND completed_date = ?
    `).get(membership.group_id, userId, today);

    // Get group completion rate (last 7 days)
    const last7DaysCompletions = db.prepare(`
      SELECT COUNT(*) as count FROM group_habit_completions
      WHERE group_id = ? AND completed_date >= date('now', '-7 days')
    `).get(membership.group_id).count;

    const maxPossible = memberCount * 7;
    const completionRate = maxPossible > 0 ? Math.round((last7DaysCompletions / maxPossible) * 100) : 0;

    // Check if group streak is still alive
    const groupStreak = calculateGroupStreak(membership.group_id, memberCount);

    return {
      ...membership,
      member_count: memberCount,
      my_completed_today: !!myCompletion,
      completion_rate_7d: completionRate,
      group_streak: groupStreak,
      is_creator: membership.created_by === userId
    };
  });

  res.json({
    success: true,
    data: groupsWithStats
  });
}));

/**
 * Calculate group streak
 */
function calculateGroupStreak(groupId, memberCount) {
  let streak = 0;
  const today = new Date();
  
  for (let i = 0; i <= 365; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = checkDate.toISOString().split('T')[0];

    // Check how many members completed on this date
    const completions = db.prepare(`
      SELECT COUNT(DISTINCT user_id) as count FROM group_habit_completions
      WHERE group_id = ? AND completed_date = ?
    `).get(groupId, dateStr).count;

    // If all members completed, increment streak
    if (completions >= memberCount && memberCount > 0) {
      streak++;
    } else if (i > 0) {
      // Allow today to be incomplete, but break if any past day is incomplete
      break;
    }
  }

  return streak;
}

/**
 * POST /api/groups
 * Create a new group habit
 */
router.post('/',
  [
    body('name')
      .trim()
      .notEmpty().withMessage('Name is required')
      .isLength({ max: 100 }).withMessage('Name must be at most 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Description must be at most 500 characters'),
    body('category')
      .optional()
      .isIn(VALID_CATEGORIES).withMessage('Invalid category')
  ],
  validate,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { name, description = '', category = 'personal' } = req.body;

    // Create the group
    const result = db.prepare(`
      INSERT INTO group_habits (name, description, created_by, category)
      VALUES (?, ?, ?, ?)
    `).run(name, description, userId, category);

    const groupId = result.lastInsertRowid;

    // Add creator as first member
    db.prepare(`
      INSERT INTO group_habit_members (group_id, user_id)
      VALUES (?, ?)
    `).run(groupId, userId);

    // Award XP for creating a group
    try {
      awardXPInline(userId, 50, 'Created a group habit: ' + name, 'group');

    } catch (e) {
      console.error('Error awarding XP:', e.message);
    }

    const group = db.prepare('SELECT * FROM group_habits WHERE id = ?').get(groupId);

    res.status(201).json({
      success: true,
      data: {
        ...group,
        member_count: 1,
        my_completed_today: false,
        completion_rate_7d: 0,
        group_streak: 0,
        is_creator: true
      }
    });
  })
);

/**
 * GET /api/groups/:id
 * Get a single group habit
 */
router.get('/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid group ID')
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if user is a member
    const membership = db.prepare(`
      SELECT * FROM group_habit_members WHERE group_id = ? AND user_id = ?
    `).get(id, userId);

    if (!membership) {
      throw new NotFoundError('Group not found or you are not a member');
    }

    // Get group details
    const group = db.prepare(`
      SELECT gh.*, u.name as creator_name
      FROM group_habits gh
      JOIN users u ON gh.created_by = u.id
      WHERE gh.id = ?
    `).get(id);

    // Get all members
    const members = db.prepare(`
      SELECT gm.*, u.name, u.email
      FROM group_habit_members gm
      JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = ?
    `).all(id);

    // Get today's date and completion status
    const today = new Date().toISOString().split('T')[0];

    const membersWithStatus = members.map(member => {
      const completedToday = db.prepare(`
        SELECT 1 FROM group_habit_completions
        WHERE group_id = ? AND user_id = ? AND completed_date = ?
      `).get(id, member.user_id, today);

      return {
        ...member,
        completed_today: !!completedToday
      };
    });

    // Get recent completions (last 7 days)
    const recentCompletions = db.prepare(`
      SELECT gch.*, u.name as user_name
      FROM group_habit_completions gch
      JOIN users u ON gch.user_id = u.id
      WHERE gch.group_id = ? AND gch.completed_date >= date('now', '-7 days')
      ORDER BY gch.completed_date DESC, gch.created_at DESC
    `).all(id);

    // Calculate group stats
    const memberCount = members.length;
    const completionRate = calculateGroupCompletionRate(id, memberCount);
    const groupStreak = calculateGroupStreak(id, memberCount);

    res.json({
      success: true,
      data: {
        ...group,
        member_count: memberCount,
        completion_rate_7d: completionRate,
        group_streak: groupStreak,
        is_creator: group.created_by === userId,
        members: membersWithStatus,
        recent_completions: recentCompletions
      }
    });
  })
);

/**
 * Calculate completion rate for last 7 days
 */
function calculateGroupCompletionRate(groupId, memberCount) {
  if (memberCount === 0) return 0;

  const last7DaysCompletions = db.prepare(`
    SELECT COUNT(*) as count FROM group_habit_completions
    WHERE group_id = ? AND completed_date >= date('now', '-7 days')
  `).get(groupId).count;

  const maxPossible = memberCount * 7;
  return maxPossible > 0 ? Math.round((last7DaysCompletions / maxPossible) * 100) : 0;
}

/**
 * POST /api/groups/:id/join
 * Join a group habit
 */
router.post('/:id/join',
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid group ID')
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if group exists
    const group = db.prepare('SELECT * FROM group_habits WHERE id = ?').get(id);
    if (!group) {
      throw new NotFoundError('Group not found');
    }

    // Check if already a member
    const existingMembership = db.prepare(`
      SELECT * FROM group_habit_members WHERE group_id = ? AND user_id = ?
    `).get(id, userId);

    if (existingMembership) {
      throw new ValidationError('You are already a member of this group');
    }

    // Join the group
    db.prepare(`
      INSERT INTO group_habit_members (group_id, user_id)
      VALUES (?, ?)
    `).run(id, userId);

    // Award XP
    try {
      awardXPInline(userId, 25, 'Joined group habit: ' + group.name, 'group');

    } catch (e) {
      console.error('Error awarding XP:', e.message);
    }

    res.status(201).json({
      success: true,
      message: 'Joined group successfully'
    });
  })
);

/**
 * POST /api/groups/:id/leave
 * Leave a group habit
 */
router.post('/:id/leave',
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid group ID')
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if creator (can't leave own group)
    const group = db.prepare('SELECT * FROM group_habits WHERE id = ?').get(id);
    if (!group) {
      throw new NotFoundError('Group not found');
    }

    if (group.created_by === userId) {
      throw new ValidationError('Group creators cannot leave. Delete the group instead.');
    }

    // Check membership
    const membership = db.prepare(`
      SELECT * FROM group_habit_members WHERE group_id = ? AND user_id = ?
    `).get(id, userId);

    if (!membership) {
      throw new ValidationError('You are not a member of this group');
    }

    // Remove membership
    db.prepare(`
      DELETE FROM group_habit_members WHERE group_id = ? AND user_id = ?
    `).run(id, userId);

    // Remove user's completions for this group
    db.prepare(`
      DELETE FROM group_habit_completions WHERE group_id = ? AND user_id = ?
    `).run(id, userId);

    res.json({
      success: true,
      message: 'Left group successfully'
    });
  })
);

/**
 * DELETE /api/groups/:id
 * Delete a group habit (creator only)
 */
router.delete('/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid group ID')
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if creator
    const group = db.prepare('SELECT * FROM group_habits WHERE id = ?').get(id);
    if (!group) {
      throw new NotFoundError('Group not found');
    }

    if (group.created_by !== userId) {
      throw new ValidationError('Only the group creator can delete it');
    }

    // Delete group (cascade will handle related records)
    db.prepare('DELETE FROM group_habits WHERE id = ?').run(id);

    res.json({
      success: true,
      message: 'Group deleted successfully'
    });
  })
);

/**
 * POST /api/groups/:id/complete
 * Mark yourself as having completed the group habit today
 */
router.post('/:id/complete',
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid group ID'),
    body('date')
      .optional()
      .isISO8601().withMessage('Date must be a valid date (YYYY-MM-DD)')
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const { date = new Date().toISOString().split('T')[0] } = req.body;

    // Check if user is a member
    const membership = db.prepare(`
      SELECT * FROM group_habit_members WHERE group_id = ? AND user_id = ?
    `).get(id, userId);

    if (!membership) {
      throw new NotFoundError('You are not a member of this group');
    }

    // Check if already completed for this date
    const existingCompletion = db.prepare(`
      SELECT 1 FROM group_habit_completions
      WHERE group_id = ? AND user_id = ? AND completed_date = ?
    `).get(id, userId, date);

    if (existingCompletion) {
      throw new ValidationError('You have already completed this group habit for this date');
    }

    // Record completion
    db.prepare(`
      INSERT INTO group_habit_completions (group_id, user_id, completed_date)
      VALUES (?, ?, ?)
    `).run(id, userId, date);

    // Award XP for completion
    try {
      const group = db.prepare('SELECT * FROM group_habits WHERE id = ?').get(id);
      awardXPInline(userId, 15, 'Completed group habit: ' + group.name, 'group');

    } catch (e) {
      console.error('Error awarding XP:', e.message);
    }

    res.status(201).json({
      success: true,
      message: 'Group habit marked as complete'
    });
  })
);

/**
 * GET /api/groups/:id/history
 * Get completion history for a group
 */
router.get('/:id/history',
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid group ID')
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const { days = 30 } = req.query;

    // Check if user is a member
    const membership = db.prepare(`
      SELECT * FROM group_habit_members WHERE group_id = ? AND user_id = ?
    `).get(id, userId);

    if (!membership) {
      throw new NotFoundError('You are not a member of this group');
    }

    const completions = db.prepare(`
      SELECT gch.*, u.name as user_name
      FROM group_habit_completions gch
      JOIN users u ON gch.user_id = u.id
      WHERE gch.group_id = ? AND gch.completed_date >= date('now', ?)
      ORDER BY gch.completed_date DESC, gch.created_at DESC
    `).all(id, `-${parseInt(days)} days`);

    res.json({
      success: true,
      data: completions
    });
  })
);

/**
 * GET /api/groups/search
 * Search for groups to join
 */
router.get('/search/all', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { q = '', category = '' } = req.query;

  let query = `
    SELECT gh.*, u.name as creator_name,
      (SELECT COUNT(*) FROM group_habit_members WHERE group_id = gh.id) as member_count
    FROM group_habits gh
    JOIN users u ON gh.created_by = u.id
    WHERE gh.id NOT IN (
      SELECT group_id FROM group_habit_members WHERE user_id = ?
    )
  `;
  const params = [userId];

  if (q) {
    query += ' AND (gh.name LIKE ? OR gh.description LIKE ?)';
    params.push(`%${q}%`, `%${q}%`);
  }

  if (category) {
    query += ' AND gh.category = ?';
    params.push(category);
  }

  query += ' ORDER BY member_count DESC LIMIT 20';

  const groups = db.prepare(query).all(...params);

  res.json({
    success: true,
    data: groups
  });
}));

export default router;
