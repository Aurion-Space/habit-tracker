import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
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
  'lifestyle', 'work', 'personal'
];

/**
 * GET /api/shared
 * Browse shared habits from all users
 */
router.get('/',
  [
    query('category').optional().isIn(VALID_CATEGORIES).withMessage('Invalid category'),
    query('sort').optional().isIn(['recent', 'popular', 'rating']).withMessage('Invalid sort'),
    query('search').optional().trim()
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { category = '', sort = 'popular', search = '', limit = 20, offset = 0 } = req.query;

    let query = `
      SELECT 
        sh.*,
        u.name as author_name,
        (CASE WHEN sh.total_ratings > 0 THEN CAST(sh.sum_ratings AS FLOAT) / sh.total_ratings ELSE 0 END) as avg_rating
      FROM shared_habits sh
      JOIN users u ON sh.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (category) {
      query += ' AND sh.habit_category = ?';
      params.push(category);
    }

    if (search) {
      query += ' AND (sh.title LIKE ? OR sh.habit_name LIKE ? OR sh.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    switch (sort) {
      case 'recent':
        query += ' ORDER BY sh.created_at DESC';
        break;
      case 'rating':
        query += ' ORDER BY avg_rating DESC, sh.total_ratings DESC';
        break;
      case 'popular':
      default:
        query += ' ORDER BY sh.shares DESC, avg_rating DESC';
    }

    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit) + 1, parseInt(offset));

    const sharedHabits = db.prepare(query).all(...params);
    const hasMore = sharedHabits.length > parseInt(limit);
    const results = hasMore ? sharedHabits.slice(0, parseInt(limit)) : sharedHabits;

    // Add user's import status
    const userId = req.user.id;
    const habitsWithImportStatus = results.map(habit => {
      const imported = db.prepare(`
        SELECT 1 FROM imported_habits 
        WHERE user_id = ? AND shared_habit_id = ?
      `).get(userId, habit.id);

      return {
        ...habit,
        avg_rating: Math.round(habit.avg_rating * 10) / 10,
        imported: !!imported
      };
    });

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as count FROM shared_habits sh WHERE 1=1
      ${category ? ' AND sh.habit_category = ?' : ''}
      ${search ? ' AND (sh.title LIKE ? OR sh.habit_name LIKE ?)' : ''}
    `;
    const countParams = [];
    if (category) countParams.push(category);
    if (search) countParams.push(`%${search}%`, `%${search}%`);

    const totalCount = db.prepare(countQuery).get(...countParams).count;

    res.json({
      success: true,
      data: {
        habits: habitsWithImportStatus,
        total_count: totalCount,
        has_more: hasMore,
        filters: { category, sort, search }
      }
    });
  })
);

/**
 * GET /api/shared/my
 * Get habits shared by current user
 */
router.get('/my', asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const mySharedHabits = db.prepare(`
    SELECT 
      sh.*,
      (CASE WHEN sh.total_ratings > 0 THEN CAST(sh.sum_ratings AS FLOAT) / sh.total_ratings ELSE 0 END) as avg_rating
    FROM shared_habits sh
    WHERE sh.user_id = ?
    ORDER BY sh.created_at DESC
  `).all(userId);

  // Get my collections
  const myCollections = db.prepare(`
    SELECT * FROM habit_collections
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(userId);

  res.json({
    success: true,
    data: {
      habits: mySharedHabits.map(h => ({
        ...h,
        avg_rating: Math.round(h.avg_rating * 10) / 10
      })),
      collections: myCollections,
      total_habits: mySharedHabits.length,
      total_collections: myCollections.length
    }
  });
}));

/**
 * POST /api/shared/habit
 * Share a habit as a template
 */
router.post('/habit',
  [
    body('habit_id')
      .isInt({ min: 1 }).withMessage('Invalid habit ID'),
    body('title')
      .trim()
      .notEmpty().withMessage('Title is required')
      .isLength({ max: 100 }).withMessage('Title must be at most 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Description must be at most 500 characters')
  ],
  validate,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { habit_id, title, description = '' } = req.body;

    // Get the habit
    const habit = db.prepare('SELECT * FROM habits WHERE id = ? AND user_id = ?').get(habit_id, userId);
    if (!habit) {
      throw new NotFoundError('Habit not found');
    }

    // Check if already shared
    const existing = db.prepare(`
      SELECT id FROM shared_habits WHERE user_id = ? AND habit_name = ?
    `).get(userId, habit.name);

    if (existing) {
      throw new ValidationError('This habit is already shared');
    }

    // Create shared habit
    const result = db.prepare(`
      INSERT INTO shared_habits (user_id, habit_name, habit_description, habit_frequency, habit_category, title, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId, habit.name, habit.description, habit.frequency, habit.category, title, description);

    // Award XP
    try {
      awardXPInline(userId, 30, 'Shared habit template: ' + title, 'sharing');

    } catch (e) {
      console.error('Error awarding XP:', e.message);
    }

    const sharedHabit = db.prepare('SELECT * FROM shared_habits WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      data: sharedHabit,
      message: 'Habit shared successfully'
    });
  })
);

/**
 * POST /api/shared/habit/custom
 * Share a custom habit template (not from user's existing habits)
 */
router.post('/habit/custom',
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
      .isIn(['daily', 'weekly', 'monthly']).withMessage('Invalid frequency'),
    body('category')
      .optional()
      .isIn(VALID_CATEGORIES).withMessage('Invalid category'),
    body('title')
      .trim()
      .notEmpty().withMessage('Title is required')
      .isLength({ max: 100 }).withMessage('Title must be at most 100 characters')
  ],
  validate,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { name, description = '', frequency, category = 'personal', title } = req.body;

    // Create shared habit
    const result = db.prepare(`
      INSERT INTO shared_habits (user_id, habit_name, habit_description, habit_frequency, habit_category, title, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId, name, description, frequency, category, title, description);

    // Award XP
    try {
      awardXPInline(userId, 30, 'Shared custom habit template: ' + title, 'sharing');

    } catch (e) {
      console.error('Error awarding XP:', e.message);
    }

    const sharedHabit = db.prepare('SELECT * FROM shared_habits WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      data: sharedHabit,
      message: 'Habit template shared successfully'
    });
  })
);

/**
 * POST /api/shared/:id/import
 * Import a shared habit to user's habits
 */
router.post('/:id/import',
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid shared habit ID')
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    // Get shared habit
    const sharedHabit = db.prepare('SELECT * FROM shared_habits WHERE id = ?').get(id);
    if (!sharedHabit) {
      throw new NotFoundError('Shared habit not found');
    }

    // Check if already imported
    const existingImport = db.prepare(`
      SELECT 1 FROM imported_habits WHERE user_id = ? AND shared_habit_id = ?
    `).get(userId, id);

    if (existingImport) {
      throw new ValidationError('You have already imported this habit');
    }

    // Create the habit for the user
    const result = db.prepare(`
      INSERT INTO habits (user_id, name, description, frequency, category)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, sharedHabit.habit_name, sharedHabit.habit_description, sharedHabit.habit_frequency, sharedHabit.habit_category);

    // Record import
    db.prepare(`
      INSERT INTO imported_habits (user_id, shared_habit_id)
      VALUES (?, ?)
    `).run(userId, id);

    // Increment share count
    db.prepare(`
      UPDATE shared_habits SET shares = shares + 1 WHERE id = ?
    `).run(id);

    // Award XP to both users
    try {
      // Award XP to importer
      awardXPInline(userId, 5, 'Imported shared habit: ' + sharedHabit.habit_name, 'import');
      // Award XP to author
      awardXPInline(sharedHabit.user_id, 10, 'Someone imported your shared habit: ' + sharedHabit.habit_name, 'sharing');


    } catch (e) {
      console.error('Error awarding XP:', e.message);
    }

    const habit = db.prepare('SELECT * FROM habits WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      data: habit,
      message: 'Habit imported successfully'
    });
  })
);

/**
 * POST /api/shared/:id/rate
 * Rate a shared habit
 */
router.post('/:id/rate',
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid shared habit ID'),
    body('rating')
      .isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5')
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const { rating } = req.body;

    // Get shared habit
    const sharedHabit = db.prepare('SELECT * FROM shared_habits WHERE id = ?').get(id);
    if (!sharedHabit) {
      throw new NotFoundError('Shared habit not found');
    }

    // Can't rate own habit
    if (sharedHabit.user_id === userId) {
      throw new ValidationError('You cannot rate your own shared habit');
    }

    // Check if already rated
    // For simplicity, we'll just allow re-rating and update
    // In production, you'd track who rated what

    // Update ratings (simplified - just increment counters)
    db.prepare(`
      UPDATE shared_habits 
      SET total_ratings = total_ratings + 1, 
          sum_ratings = sum_ratings + ?
      WHERE id = ?
    `).run(rating, id);

    const updatedHabit = db.prepare('SELECT * FROM shared_habits WHERE id = ?').get(id);
    const avgRating = updatedHabit.total_ratings > 0 
      ? Math.round((updatedHabit.sum_ratings / updatedHabit.total_ratings) * 10) / 10 
      : 0;

    res.json({
      success: true,
      data: {
        avg_rating: avgRating,
        total_ratings: updatedHabit.total_ratings
      },
      message: 'Rating submitted'
    });
  })
);

/**
 * DELETE /api/shared/:id
 * Delete a shared habit (author only)
 */
router.delete('/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid shared habit ID')
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    const sharedHabit = db.prepare('SELECT * FROM shared_habits WHERE id = ?').get(id);
    if (!sharedHabit) {
      throw new NotFoundError('Shared habit not found');
    }

    if (sharedHabit.user_id !== userId) {
      throw new ValidationError('You can only delete your own shared habits');
    }

    db.prepare('DELETE FROM shared_habits WHERE id = ?').run(id);

    res.json({
      success: true,
      message: 'Shared habit deleted'
    });
  })
);

/**
 * POST /api/shared/collection
 * Create a habit collection (set of habits)
 */
router.post('/collection',
  [
    body('title')
      .trim()
      .notEmpty().withMessage('Title is required')
      .isLength({ max: 100 }).withMessage('Title must be at most 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Description must be at most 500 characters'),
    body('habits')
      .isArray({ min: 1 }).withMessage('Habits array is required with at least 1 habit')
  ],
  validate,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { title, description = '', habits } = req.body;

    // Validate habits structure
    const validatedHabits = habits.map((h, i) => {
      if (!h.name || typeof h.name !== 'string') {
        throw new ValidationError(`Habit ${i + 1}: name is required`);
      }
      return {
        name: h.name.substring(0, 100),
        description: (h.description || '').substring(0, 500),
        frequency: ['daily', 'weekly', 'monthly'].includes(h.frequency) ? h.frequency : 'daily',
        category: h.category || 'personal'
      };
    });

    const habitsJson = JSON.stringify(validatedHabits);

    const result = db.prepare(`
      INSERT INTO habit_collections (user_id, title, description, habits_data)
      VALUES (?, ?, ?, ?)
    `).run(userId, title, description, habitsJson);

    // Award XP
    try {
      awardXPInline(userId, 50, 'Shared habit collection: ' + title, 'sharing');

    } catch (e) {
      console.error('Error awarding XP:', e.message);
    }

    const collection = db.prepare('SELECT * FROM habit_collections WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      data: {
        ...collection,
        habits_count: validatedHabits.length
      },
      message: 'Collection shared successfully'
    });
  })
);

/**
 * GET /api/shared/collections
 * Browse shared collections
 */
router.get('/collections',
  [
    query('search').optional().trim(),
    query('sort').optional().isIn(['recent', 'popular']).withMessage('Invalid sort')
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { search = '', sort = 'popular', limit = 20, offset = 0 } = req.query;

    let query = `
      SELECT 
        hc.*,
        u.name as author_name,
        (SELECT COUNT(*) FROM json_each(hc.habits_data)) as habits_count
      FROM habit_collections hc
      JOIN users u ON hc.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ' AND (hc.title LIKE ? OR hc.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += sort === 'recent' 
      ? ' ORDER BY hc.created_at DESC' 
      : ' ORDER BY hc.shares DESC';

    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit) + 1, parseInt(offset));

    const collections = db.prepare(query).all(...params);
    const hasMore = collections.length > parseInt(limit);
    const results = hasMore ? collections.slice(0, parseInt(limit)) : collections;

    res.json({
      success: true,
      data: {
        collections: results,
        has_more: hasMore
      }
    });
  })
);

/**
 * POST /api/shared/collection/:id/import
 * Import an entire collection
 */
router.post('/collection/:id/import',
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid collection ID')
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    const collection = db.prepare('SELECT * FROM habit_collections WHERE id = ?').get(id);
    if (!collection) {
      throw new NotFoundError('Collection not found');
    }

    const habits = JSON.parse(collection.habits_data);
    const importedHabits = [];

    // Import each habit
    for (const habit of habits) {
      const result = db.prepare(`
        INSERT INTO habits (user_id, name, description, frequency, category)
        VALUES (?, ?, ?, ?, ?)
      `).run(userId, habit.name, habit.description, habit.frequency, habit.category);

      importedHabits.push({
        id: result.lastInsertRowid,
        name: habit.name
      });
    }

    // Record import
    db.prepare(`
      INSERT INTO imported_habits (user_id, collection_id)
      VALUES (?, ?)
    `).run(userId, id);

    // Increment share count
    db.prepare(`
      UPDATE habit_collections SET shares = shares + 1 WHERE id = ?
    `).run(id);

    // Award XP
    try {
      awardXPInline(userId, 10 * habits.length, `Imported collection: ${collection.title}`, 'import');
      awardXPInline(collection.user_id, 15 * habits.length, 'Someone imported your collection', 'sharing');

    } catch (e) {
      console.error('Error awarding XP:', e.message);
    }

    res.status(201).json({
      success: true,
      data: {
        collection_title: collection.title,
        imported_count: importedHabits.length,
        habits: importedHabits
      },
      message: `Successfully imported ${importedHabits.length} habits`
    });
  })
);

export default router;
