import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import db from '../database.js';
import { asyncHandler, ValidationError } from '../middleware/errorHandler.js';
import { generateToken } from '../middleware/auth.js';

const router = Router();

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
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register',
  [
    body('email')
      .isEmail().withMessage('Please enter a valid email')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name')
      .trim()
      .isLength({ min: 1, max: 50 }).withMessage('Name must be 1-50 characters')
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { email, password, name } = req.body;

    // Check if user already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Registration failed',
        message: 'Email already registered'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const result = db.prepare(`
      INSERT INTO users (email, password_hash, name)
      VALUES (?, ?, ?)
    `).run(email, passwordHash, name);

    const user = db.prepare('SELECT id, email, name, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);

    // Create public profile for new user
    db.prepare(`
      INSERT INTO public_profiles (user_id, is_public, bio)
      VALUES (?, 1, '')
    `).run(user.id);

    // Create user level for new user
    db.prepare(`
      INSERT INTO user_levels (user_id, level, total_xp)
      VALUES (?, 1, 0)
    `).run(user.id);

    // Generate token
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      data: {
        user,
        token
      }
    });
  })
);

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login',
  [
    body('email')
      .isEmail().withMessage('Please enter a valid email')
      .normalizeEmail(),
    body('password')
      .notEmpty().withMessage('Password is required')
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Find user
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication failed',
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Authentication failed',
        message: 'Invalid email or password'
      });
    }

    // Generate token
    const token = generateToken(user);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          created_at: user.created_at
        },
        token
      }
    });
  })
);

/**
 * GET /api/auth/me
 * Get current user (protected)
 */
router.get('/me', asyncHandler(async (req, res) => {
  // This route should be protected by auth middleware in index.js
  res.json({
    success: true,
    data: req.user
  });
}));

export default router;
