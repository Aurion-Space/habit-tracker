// Simple seed script - no bcrypt, just generate data
import db from './database.js';

const TOTAL_USERS = 1000;

// Habit templates
const habitNames = [
  'Morning Meditation', 'Exercise 30 min', 'Read 20 pages', 'Drink 8 glasses water',
  'No social media', 'Journal entry', 'Learn new skill', 'Stretching', 'Walk 10k steps',
  'Healthy breakfast', 'No sugar', 'Early wake up', 'Plan tomorrow', 'Gratitude practice',
  'Language practice', 'Coding challenge', 'Yoga session', 'Cold shower', 'No caffeine',
  'Vitamins taken', 'Floss teeth', 'Meal prep', 'Call family', 'Clean room'
];

const categories = ['fitness', 'health', 'learning', 'mindfulness', 'social', 'productivity', 'creative'];

// Names for generating realistic user data
const firstNames = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth',
  'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen',
  'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Sophia', 'Isabella', 'Oliver', 'Mason', 'Lucas'
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateUserName(index) {
  const first = randomChoice(firstNames);
  const last = randomChoice(lastNames);
  return `${first}${last}${index % 100}`;
}

function generateEmail(index) {
  return `user${index}@example.com`;
}

// Use a fixed hash for all users (for testing)
const passwordHash = '$2a$10$abcdefghijklmnopqrstuuR5dIhzXS5Q7aOvR5dIhzXS5Q7aOvR5dIhz';

async function seed() {
  console.log('Starting seed...');
  
  // Check existing users count
  const existingCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  console.log(`Existing users: ${existingCount}`);
  
  if (existingCount >= 1000) {
    console.log('Already have 1000+ users, skipping...');
    return;
  }

  const startId = existingCount + 1;
  const usersToCreate = Math.min(TOTAL_USERS - existingCount, TOTAL_USERS);
  
  console.log(`Creating ${usersToCreate} new users starting from ID ${startId}...`);

  // Transaction for users
  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, password_hash, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  const createUserBatch = db.transaction((users) => {
    for (const user of users) {
      insertUser.run(user.id, user.name, user.email, user.passwordHash, user.createdAt);
    }
  });

  const users = [];
  for (let i = 0; i < usersToCreate; i++) {
    const id = startId + i;
    const name = generateUserName(id);
    const email = generateEmail(id);
    const createdAt = new Date(Date.now() - randomInt(30, 365) * 24 * 60 * 60 * 1000).toISOString();
    users.push({ id, name, email, passwordHash, createdAt });
  }

  console.log('Inserting users...');
  createUserBatch(users);
  console.log(`Users created: ${usersToCreate}`);

  // Transaction for habits
  console.log('Creating habits...');
  const habitInsert = db.prepare(`
    INSERT INTO habits (user_id, name, description, frequency, category, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const habitIds = {};
  
  const createHabitsBatch = db.transaction(() => {
    for (let userId = startId; userId < startId + usersToCreate; userId++) {
      const numHabits = randomInt(3, 5);
      const userHabitIds = [];
      const createdAt = new Date(Date.now() - randomInt(60, 180) * 24 * 60 * 60 * 1000).toISOString();
      
      for (let h = 0; h < numHabits; h++) {
        const name = randomChoice(habitNames);
        const category = randomChoice(categories);
        const result = habitInsert.run(userId, name, '', 'daily', category, createdAt);
        userHabitIds.push(result.lastInsertRowid);
      }
      habitIds[userId] = userHabitIds;
      
      if ((userId - startId) % 100 === 0) {
        console.log(`Created habits for ${userId - startId + 1} users...`);
      }
    }
  });

  createHabitsBatch();
  console.log('Habits created');

  // Create habit logs
  console.log('Creating habit logs...');
  const logInsert = db.prepare(`
    INSERT INTO habit_logs (habit_id, completed_date, notes)
    VALUES (?, ?, ?)
  `);

  const today = new Date();
  let totalLogs = 0;

  const createLogsBatch = db.transaction(() => {
    for (let userId = startId; userId < startId + usersToCreate; userId++) {
      const habits = habitIds[userId] || [];
      
      for (const habitId of habits) {
        const daysOfHistory = randomInt(30, 90);
        
        for (let d = 0; d < daysOfHistory; d++) {
          if (Math.random() < 0.7) {
            const date = new Date(today);
            date.setDate(date.getDate() - d);
            const dateStr = date.toISOString().split('T')[0];
            logInsert.run(habitId, dateStr, '');
            totalLogs++;
          }
        }
      }
      
      if ((userId - startId) % 50 === 0) {
        console.log(`Created logs for ${userId - startId + 1} users...`);
      }
    }
  });

  createLogsBatch();
  console.log(`Habit logs created: ${totalLogs}`);

  // Calculate and set XP and levels
  console.log('Calculating XP and levels...');
  
  const updateLevels = db.prepare(`
    INSERT OR REPLACE INTO user_levels (user_id, level, total_xp)
    VALUES (?, ?, ?)
  `);

  const updateLevelsBatch = db.transaction(() => {
    for (let userId = startId; userId < startId + usersToCreate; userId++) {
      const completions = db.prepare(`
        SELECT COUNT(*) as count FROM habit_logs h
        JOIN habits ht ON h.habit_id = ht.id
        WHERE ht.user_id = ?
      `).get(userId).count;
      
      const totalXP = completions * 10 + randomInt(0, 50);
      const level = Math.floor(totalXP / 100) + 1;
      
      updateLevels.run(userId, Math.min(level, 50), totalXP);
    }
  });

  updateLevelsBatch();
  console.log('Levels calculated');

  // Create buddy relationships
  console.log('Creating buddy relationships...');
  
  const buddyInsert = db.prepare(`
    INSERT INTO buddies (user_id, buddy_id, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  let buddiesCreated = 0;
  const maxBuddyPairs = Math.floor(usersToCreate * 0.5);
  const now = new Date().toISOString();

  const createBuddiesBatch = db.transaction(() => {
    for (let i = 0; i < maxBuddyPairs; i++) {
      const userId = randomInt(startId, startId + usersToCreate - 1);
      const buddyId = randomInt(startId, startId + usersToCreate - 1);
      
      if (userId !== buddyId) {
        const existing = db.prepare(`
          SELECT id FROM buddies 
          WHERE (user_id = ? AND buddy_id = ?) OR (user_id = ? AND buddy_id = ?)
        `).get(userId, buddyId, buddyId, userId);
        
        if (!existing) {
          buddyInsert.run(userId, buddyId, 'accepted', now, now);
          buddiesCreated++;
        }
      }
    }
  });

  createBuddiesBatch();
  console.log(`Buddy relationships created: ${buddiesCreated}`);

  // Final count
  const finalCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const finalHabits = db.prepare('SELECT COUNT(*) as count FROM habits').get().count;
  const finalLogs = db.prepare('SELECT COUNT(*) as count FROM habit_logs').get().count;
  const finalBuddies = db.prepare('SELECT COUNT(*) as count FROM buddies WHERE status = ?').get('accepted').count;

  console.log('\n=== Seed Complete ===');
  console.log(`Total Users: ${finalCount}`);
  console.log(`Total Habits: ${finalHabits}`);
  console.log(`Total Logs: ${finalLogs}`);
  console.log(`Total Buddies: ${finalBuddies}`);
}

seed().catch(console.error);
