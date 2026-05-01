import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create database connection — DATABASE_PATH env var overrides default for Docker volumes
const dbPath = process.env.DATABASE_PATH || join(__dirname, '..', 'habits.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

/**
 * Initialize database tables
 */
export function initializeDatabase() {
  // Create users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create habits table (with category)
  db.exec(`
    CREATE TABLE IF NOT EXISTS habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      frequency TEXT NOT NULL CHECK(frequency IN ('daily', 'weekly', 'monthly')),
      category TEXT DEFAULT 'personal',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create habit_logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS habit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_id INTEGER NOT NULL,
      completed_date DATE NOT NULL,
      notes TEXT DEFAULT '',
      FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
      UNIQUE(habit_id, completed_date)
    )
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id)
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_habits_category ON habits(category)
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_id ON habit_logs(habit_id)
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_habit_logs_completed_date ON habit_logs(completed_date)
  `);

  // ============================================
  // SOCIAL FEATURES - NEW TABLES
  // ============================================

  // Buddies table - for friend requests and connections
  db.exec(`
    CREATE TABLE IF NOT EXISTS buddies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      buddy_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'declined')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (buddy_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, buddy_id)
    )
  `);

  // Buddy comments/reactions on achievements
  db.exec(`
    CREATE TABLE IF NOT EXISTS buddy_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      buddy_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      type TEXT DEFAULT 'comment' CHECK(type IN ('comment', 'react')),
      content TEXT DEFAULT '',
      emoji TEXT DEFAULT '👍',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (buddy_id) REFERENCES buddies(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Public profiles table
  db.exec(`
    CREATE TABLE IF NOT EXISTS public_profiles (
      user_id INTEGER PRIMARY KEY,
      is_public INTEGER DEFAULT 1,
      bio TEXT DEFAULT '',
      avatar_url TEXT DEFAULT '',
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Group habits table
  db.exec(`
    CREATE TABLE IF NOT EXISTS group_habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      created_by INTEGER NOT NULL,
      category TEXT DEFAULT 'personal',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Group habit members
  db.exec(`
    CREATE TABLE IF NOT EXISTS group_habit_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES group_habits(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(group_id, user_id)
    )
  `);

  // Group habit completions
  db.exec(`
    CREATE TABLE IF NOT EXISTS group_habit_completions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      completed_date DATE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES group_habits(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(group_id, user_id, completed_date)
    )
  `);

  // Shared habits (templates from users)
  db.exec(`
    CREATE TABLE IF NOT EXISTS shared_habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      habit_name TEXT NOT NULL,
      habit_description TEXT DEFAULT '',
      habit_frequency TEXT DEFAULT 'daily',
      habit_category TEXT DEFAULT 'personal',
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      shares INTEGER DEFAULT 0,
      total_ratings INTEGER DEFAULT 0,
      sum_ratings INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Habit collections (sets of habits)
  db.exec(`
    CREATE TABLE IF NOT EXISTS habit_collections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      habits_data TEXT NOT NULL,
      shares INTEGER DEFAULT 0,
      total_ratings INTEGER DEFAULT 0,
      sum_ratings INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Imported shared habits
  db.exec(`
    CREATE TABLE IF NOT EXISTS imported_habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      shared_habit_id INTEGER,
      collection_id INTEGER,
      imported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (shared_habit_id) REFERENCES shared_habits(id) ON DELETE SET NULL,
      FOREIGN KEY (collection_id) REFERENCES habit_collections(id) ON DELETE SET NULL
    )
  `);

  // XP Points system
  db.exec(`
    CREATE TABLE IF NOT EXISTS xp_points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      reason TEXT NOT NULL,
      source_type TEXT DEFAULT 'habit',
      source_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Badges/Achievements
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      badge_id TEXT NOT NULL,
      badge_name TEXT NOT NULL,
      badge_description TEXT DEFAULT '',
      badge_icon TEXT DEFAULT '🏆',
      earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, badge_id)
    )
  `);

  // User levels (calculated from XP)
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_levels (
      user_id INTEGER PRIMARY KEY,
      level INTEGER DEFAULT 1,
      total_xp INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create indexes for new tables
  db.exec(`CREATE INDEX IF NOT EXISTS idx_buddies_user_id ON buddies(user_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_buddies_buddy_id ON buddies(buddy_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_buddies_status ON buddies(status)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_group_habits_created_by ON group_habits(created_by)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_group_habit_members_group_id ON group_habit_members(group_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_group_habit_members_user_id ON group_habit_members(user_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_group_completions_group_id ON group_habit_completions(group_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_shared_habits_user_id ON shared_habits(user_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_xp_points_user_id ON xp_points(user_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id)`);

  console.log('Database initialized successfully');
}

export default db;
