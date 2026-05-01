export const categories = [
  { id: 'health', name: 'Health', icon: '💪', color: '#10b981' },
  { id: 'fitness', name: 'Fitness', icon: '🏃', color: '#f59e0b' },
  { id: 'mindfulness', name: 'Mindfulness', icon: '🧘', color: '#8b5cf6' },
  { id: 'learning', name: 'Learning', icon: '📚', color: '#3b82f6' },
  { id: 'productivity', name: 'Productivity', icon: '⚡', color: '#ef4444' },
  { id: 'social', name: 'Social', icon: '👥', color: '#ec4899' },
  { id: 'creative', name: 'Creative', icon: '🎨', color: '#f97316' },
  { id: 'nutrition', name: 'Nutrition', icon: '🥗', color: '#22c55e' },
  { id: 'sleep', name: 'Sleep', icon: '😴', color: '#6366f1' },
  { id: 'finance', name: 'Finance', icon: '💰', color: '#14b8a6' },
  { id: 'personal', name: 'Personal', icon: '✨', color: '#6b7280' },
];

export const frequencyOptions = [
  { value: 'daily', label: 'Daily', icon: '📅' },
  { value: 'weekly', label: 'Weekly', icon: '🗓️' },
  { value: 'monthly', label: 'Monthly', icon: '📆' },
];

export const habitTemplates = [
  { name: 'Morning Meditation', category: 'mindfulness', icon: '🧘', frequency: 'daily', description: 'Start your day with 10 minutes of mindful breathing' },
  { name: 'Read 20 pages', category: 'learning', icon: '📖', frequency: 'daily', description: 'Read for at least 20 minutes every day' },
  { name: 'Exercise 30 minutes', category: 'fitness', icon: '💪', frequency: 'daily', description: 'Get your body moving with any exercise' },
  { name: 'Drink 8 glasses of water', category: 'health', icon: '💧', frequency: 'daily', description: 'Stay hydrated throughout the day' },
  { name: 'Practice gratitude', category: 'mindfulness', icon: '🙏', frequency: 'daily', description: 'Write down three things you are grateful for' },
  { name: 'No social media for 2 hours', category: 'productivity', icon: '📵', frequency: 'daily', description: 'Take a break from screens in the evening' },
  { name: 'Call a friend or family', category: 'social', icon: '📞', frequency: 'weekly', description: 'Stay connected with loved ones' },
  { name: 'Meal prep for the week', category: 'nutrition', icon: '🍳', frequency: 'weekly', description: 'Prepare healthy meals ahead of time' },
  { name: 'Go to bed by 10 PM', category: 'sleep', icon: '😴', frequency: 'daily', description: 'Get enough sleep for optimal health' },
  { name: 'Save $10', category: 'finance', icon: '💰', frequency: 'daily', description: 'Put aside money for your future' },
];

export const getCategoryById = (id) => categories.find(c => c.id === id) || categories[categories.length - 1];

export const getCategoryColor = (categoryId) => {
  const cat = getCategoryById(categoryId);
  return cat ? cat.color : '#6b7280';
};

export const getCategoryIcon = (categoryId) => {
  const cat = getCategoryById(categoryId);
  return cat ? cat.icon : '✨';
};

export const getCategories = () => categories;

export const searchTemplates = (query) => {
  if (!query) return habitTemplates;
  const q = query.toLowerCase();
  return habitTemplates.filter(t => 
    t.name.toLowerCase().includes(q) || 
    t.description.toLowerCase().includes(q) ||
    t.category.toLowerCase().includes(q)
  );
};
