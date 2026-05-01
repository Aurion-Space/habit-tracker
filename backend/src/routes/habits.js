import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import db from '../database.js';
import { asyncHandler, NotFoundError, ValidationError } from '../middleware/errorHandler.js';
import { authMiddleware } from '../middleware/auth.js';

// Inline XP functions to avoid circular dependency with xp.js
function awardHabitCompletionXPInline(userId, habitId) {
  try {
    db.prepare(`
      INSERT INTO xp_points (user_id, amount, reason, source_type)
      VALUES (?, 10, 'Completed habit', 'completion')
    `).run(userId);
    
    db.prepare(`
      INSERT INTO user_levels (user_id, total_xp, level)
      VALUES (?, 10, 1)
      ON CONFLICT(user_id) DO UPDATE SET total_xp = total_xp + 10
    `).run(userId);
    return 10;
  } catch (e) {
    console.error('XP award error:', e.message);
    return 0;
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
 * Valid categories
 */
const VALID_CATEGORIES = [
  'health', 'fitness', 'learning', 'productivity', 
  'mindfulness', 'finance', 'creative', 'social', 
  'lifestyle', 'work', 'personal',
  'nutrition', 'sleep'
];

/**
 * Calculate current streak for a habit
 */
function calculateStreak(habitId) {
  const logs = db.prepare(`
    SELECT completed_date FROM habit_logs 
    WHERE habit_id = ? 
    ORDER BY completed_date DESC
  `).all(habitId);
  
  if (logs.length === 0) return 0;
  
  const dates = logs.map(log => log.completed_date);
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  if (dates[0] !== today && dates[0] !== yesterday) return 0;
  
  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diff = (prev - curr) / 86400000;
    
    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}

/**
 * GET /api/habits
 * List all habits for current user (with optional category filter)
 * OPTIMIZED: Single query for habits, batch query for logs
 */
router.get('/',
  [
    query('category')
      .optional()
      .isIn(VALID_CATEGORIES).withMessage('Invalid category')
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { category } = req.query;
    const userId = req.user.id;
    
    // Get habits in single query
    let query = 'SELECT * FROM habits WHERE user_id = ?';
    const params = [userId];
    
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const habits = db.prepare(query).all(...params);
    
    if (habits.length === 0) {
      return res.json({
        success: true,
        data: []
      });
    }
    
    // Get all habit IDs
    const habitIds = habits.map(h => h.id);
    
    // Batch query for all logs - MUCH faster than N queries
    const allLogs = db.prepare(`
      SELECT habit_id, completed_date FROM habit_logs 
      WHERE habit_id IN (${habitIds.map(() => '?').join(',')})
      ORDER BY completed_date DESC
    `).all(...habitIds);
    
    // Group logs by habit_id
    const logsByHabitId = {};
    for (const log of allLogs) {
      if (!logsByHabitId[log.habit_id]) {
        logsByHabitId[log.habit_id] = [];
      }
      logsByHabitId[log.habit_id].push(log.completed_date);
    }
    
    // Build response with computed streaks
    const habitsWithDates = habits.map(habit => {
      const completedDates = logsByHabitId[habit.id] || [];
      
      // Calculate streak from the dates array (no additional query)
      let currentStreak = 0;
      if (completedDates.length > 0) {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        
        if (completedDates[0] === today || completedDates[0] === yesterday) {
          currentStreak = 1;
          for (let i = 1; i < completedDates.length; i++) {
            const prev = new Date(completedDates[i - 1]);
            const curr = new Date(completedDates[i]);
            const diff = (prev - curr) / 86400000;
            if (diff === 1) {
              currentStreak++;
            } else {
              break;
            }
          }
        }
      }
      
      return {
        ...habit,
        completedDates,
        currentStreak
      };
    });

    res.json({
      success: true,
      data: habitsWithDates
    });
  })
);

/**
 * GET /api/habits/categories
 * Get all categories with habit counts
 */
router.get('/categories', asyncHandler(async (req, res) => {
  const categoryStats = db.prepare(`
    SELECT category, COUNT(*) as count 
    FROM habits 
    WHERE user_id = ?
    GROUP BY category
  `).all(req.user.id);

  const categories = VALID_CATEGORIES.map(cat => {
    const stat = categoryStats.find(s => s.category === cat);
    return {
      id: cat,
      count: stat ? stat.count : 0
    };
  });

  res.json({
    success: true,
    data: categories
  });
}));

/**
 * POST /api/habits
 * Create a new habit
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
    body('frequency')
      .notEmpty().withMessage('Frequency is required')
      .isIn(['daily', 'weekly', 'monthly']).withMessage('Frequency must be daily, weekly, or monthly'),
    body('category')
      .optional()
      .isIn(VALID_CATEGORIES).withMessage('Invalid category')
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { name, description = '', frequency, category = 'personal' } = req.body;

    const result = db.prepare(`
      INSERT INTO habits (user_id, name, description, frequency, category)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.user.id, name, description, frequency, category);

    const habit = db.prepare('SELECT * FROM habits WHERE id = ?').get(result.lastInsertRowid);

    // Award XP for creating a habit
    try {
      db.prepare(`
        INSERT INTO xp_points (user_id, amount, reason, source_type)
        VALUES (?, 5, 'Created new habit', 'habit')
      `).run(req.user.id);
      
      db.prepare(`
        INSERT INTO user_levels (user_id, total_xp, level)
        VALUES (?, 5, 1)
        ON CONFLICT(user_id) DO UPDATE SET total_xp = total_xp + 5
      `).run(req.user.id);
    } catch (e) {
      console.error('Error awarding XP:', e.message);
    }

    res.status(201).json({
      success: true,
      data: { ...habit, completedDates: [], currentStreak: 0 }
    });
  })
);

/**
 * GET /api/habits/:id
 * Get a single habit
 */
router.get('/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid habit ID')
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const habit = db.prepare('SELECT * FROM habits WHERE id = ? AND user_id = ?').get(id, req.user.id);

    if (!habit) {
      throw new NotFoundError('Habit not found');
    }

    const logs = db.prepare(`
      SELECT completed_date FROM habit_logs 
      WHERE habit_id = ? 
      ORDER BY completed_date DESC
    `).all(id);

    res.json({
      success: true,
      data: {
        ...habit,
        completedDates: logs.map(log => log.completed_date),
        currentStreak: calculateStreak(id)
      }
    });
  })
);

/**
 * PUT /api/habits/:id
 * Update a habit
 */
router.put('/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid habit ID'),
    body('name')
      .optional()
      .trim()
      .notEmpty().withMessage('Name cannot be empty')
      .isLength({ max: 100 }).withMessage('Name must be at most 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Description must be at most 500 characters'),
    body('frequency')
      .optional()
      .isIn(['daily', 'weekly', 'monthly']).withMessage('Frequency must be daily, weekly, or monthly'),
    body('category')
      .optional()
      .isIn(VALID_CATEGORIES).withMessage('Invalid category')
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, description, frequency, category } = req.body;

    const existingHabit = db.prepare('SELECT * FROM habits WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!existingHabit) {
      throw new NotFoundError('Habit not found');
    }

    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (frequency !== undefined) {
      updates.push('frequency = ?');
      values.push(frequency);
    }
    if (category !== undefined) {
      updates.push('category = ?');
      values.push(category);
    }

    if (updates.length === 0) {
      throw new ValidationError('No fields to update');
    }

    values.push(id);

    db.prepare(`UPDATE habits SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const habit = db.prepare('SELECT * FROM habits WHERE id = ?').get(id);
    const logs = db.prepare('SELECT completed_date FROM habit_logs WHERE habit_id = ?').all(id);

    res.json({
      success: true,
      data: {
        ...habit,
        completedDates: logs.map(log => log.completed_date),
        currentStreak: calculateStreak(id)
      }
    });
  })
);

/**
 * DELETE /api/habits/:id
 * Delete a habit
 */
router.delete('/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid habit ID')
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = db.prepare('DELETE FROM habits WHERE id = ? AND user_id = ?').run(id, req.user.id);

    if (result.changes === 0) {
      throw new NotFoundError('Habit not found');
    }

    res.json({
      success: true,
      message: 'Habit deleted successfully'
    });
  })
);

/**
 * POST /api/habits/:id/logs
 * Log habit completion
 */
router.post('/:id/logs',
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid habit ID'),
    body('completed_date')
      .notEmpty().withMessage('Completed date is required')
      .isISO8601().withMessage('Completed date must be a valid date (YYYY-MM-DD)'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Notes must be at most 500 characters')
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { completed_date, notes = '' } = req.body;

    const habit = db.prepare('SELECT * FROM habits WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!habit) {
      throw new NotFoundError('Habit not found');
    }

    try {
      const result = db.prepare(`
        INSERT INTO habit_logs (habit_id, completed_date, notes)
        VALUES (?, ?, ?)
      `).run(id, completed_date, notes);

      const log = db.prepare('SELECT * FROM habit_logs WHERE id = ?').get(result.lastInsertRowid);

      // Award XP for habit completion
      let xpEarned = 0;
      try {
        xpEarned = awardHabitCompletionXPInline(req.user.id, id);
      } catch (e) {
        console.error('Error awarding XP:', e.message);
      }

      res.status(201).json({
        success: true,
        data: log,
        xp_earned: xpEarned
      });
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT') {
        throw new ValidationError('This habit has already been logged for this date');
      }
      throw error;
    }
  })
);

/**
 * GET /api/habits/:id/logs
 * Get all logs for a habit
 */
router.get('/:id/logs',
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid habit ID'),
    query('from_date')
      .optional()
      .isISO8601().withMessage('from_date must be a valid date'),
    query('to_date')
      .optional()
      .isISO8601().withMessage('to_date must be a valid date')
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { from_date, to_date } = req.query;

    const habit = db.prepare('SELECT * FROM habits WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!habit) {
      throw new NotFoundError('Habit not found');
    }

    let query = 'SELECT * FROM habit_logs WHERE habit_id = ?';
    const params = [id];

    if (from_date) {
      query += ' AND completed_date >= ?';
      params.push(from_date);
    }

    if (to_date) {
      query += ' AND completed_date <= ?';
      params.push(to_date);
    }

    query += ' ORDER BY completed_date DESC';

    const logs = db.prepare(query).all(...params);

    res.json({
      success: true,
      data: logs
    });
  })
);

export default router;
