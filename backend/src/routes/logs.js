import { Router } from 'express';
import { param, body, validationResult } from 'express-validator';
import db from '../database.js';
import { asyncHandler, NotFoundError, ValidationError } from '../middleware/errorHandler.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

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
 * GET /api/logs
 * Get all log entries for the current user
 */
router.get('/',
  asyncHandler(async (req, res) => {
    const logs = db.prepare(`
      SELECT l.*, h.name as habit_name, h.category
      FROM habit_logs l
      JOIN habits h ON l.habit_id = h.id
      WHERE h.user_id = ?
      ORDER BY l.completed_date DESC
    `).all(req.user.id);

    res.json({
      success: true,
      data: logs
    });
  })
);

/**
 * POST /api/logs
 * Create a new log entry
 */
router.post('/',
  [
    body('habit_id').isInt({ min: 1 }).withMessage('Valid habit ID is required'),
    body('completed_date').isISO8601().withMessage('Valid completed date is required'),
    body('notes').optional().isString()
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { habit_id, completed_date, notes } = req.body;

    // Check if habit exists and belongs to user
    const habit = db.prepare('SELECT * FROM habits WHERE id = ? AND user_id = ?').get(habit_id, req.user.id);
    
    if (!habit) {
      throw new NotFoundError('Habit not found');
    }

    // Check if log already exists for this date
    const existingLog = db.prepare(`
      SELECT * FROM habit_logs WHERE habit_id = ? AND completed_date = ?
    `).get(habit_id, completed_date);

    if (existingLog) {
      throw new ValidationError('Log entry already exists for this date');
    }

    // Create the log
    const result = db.prepare(`
      INSERT INTO habit_logs (habit_id, completed_date, notes)
      VALUES (?, ?, ?)
    `).run(habit_id, completed_date, notes || null);

    const log = db.prepare('SELECT * FROM habit_logs WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      data: log
    });
  })
);

/**
 * DELETE /api/logs/:id
 * Delete a log entry
 */
router.delete('/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid log ID')
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Check if log exists and belongs to user's habit
    const log = db.prepare(`
      SELECT l.* FROM habit_logs l
      JOIN habits h ON l.habit_id = h.id
      WHERE l.id = ? AND h.user_id = ?
    `).get(id, req.user.id);

    if (!log) {
      throw new NotFoundError('Log entry not found');
    }

    db.prepare('DELETE FROM habit_logs WHERE id = ?').run(id);

    res.json({
      success: true,
      message: 'Log entry deleted successfully'
    });
  })
);

export default router;
