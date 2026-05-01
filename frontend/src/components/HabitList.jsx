import { useState, useMemo } from 'react';
import { getCategoryById, categories } from '../data/templates';

export default function HabitList({ habits, loading, onToggle, onEdit, onDelete, onAdd, onShare }) {
  const [filterCategory, setFilterCategory] = useState('all');
  const today = new Date().toISOString().split('T')[0];

  const categoryCounts = useMemo(() => {
    const counts = { all: habits.length };
    habits.forEach(habit => {
      counts[habit.category] = (counts[habit.category] || 0) + 1;
    });
    return counts;
  }, [habits]);

  const filteredHabits = useMemo(() => {
    if (filterCategory === 'all') return habits;
    return habits.filter(h => h.category === filterCategory);
  }, [habits, filterCategory]);

  const usedCategories = useMemo(() => {
    const used = new Set(habits.map(h => h.category));
    return categories.filter(c => used.has(c.id));
  }, [habits]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">My Habits</h2>
          <p className="text-gray-400 text-sm mt-1">{habits.length} habits tracked</p>
        </div>
        <button onClick={onAdd} className="glass-btn-primary px-6 py-3 rounded-xl flex items-center gap-2">
          <span className="text-lg">+</span> Add Habit
        </button>
      </div>

      {/* Category Filter */}
      {habits.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterCategory('all')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
              filterCategory === 'all'
                ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg'
                : 'glass-card text-gray-300 hover:text-white'
            }`}
          >
            All ({categoryCounts.all})
          </button>
          {usedCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                filterCategory === cat.id
                  ? 'text-white shadow-lg'
                  : 'glass-card text-gray-300 hover:text-white'
              }`}
              style={filterCategory === cat.id ? { background: `linear-gradient(135deg, ${cat.color}40, ${cat.color}20)`, borderColor: cat.color } : {}}
            >
              {cat.icon} {cat.name} ({categoryCounts[cat.id] || 0})
            </button>
          ))}
        </div>
      )}

      {/* Habits Grid */}
      {filteredHabits.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="text-6xl mb-4">🌱</div>
          <h3 className="text-xl font-semibold mb-2">
            {filterCategory === 'all' ? 'No habits yet' : 'No habits in this category'}
          </h3>
          <p className="text-gray-400 mb-6">
            {filterCategory === 'all'
              ? 'Start building good habits by adding your first one!'
              : 'Add a habit in this category or switch to view all habits.'}
          </p>
          <button onClick={onAdd} className="glass-btn-primary px-6 py-3 rounded-xl inline-flex items-center gap-2">
            <span className="text-lg">+</span> Add Habit
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredHabits.map((habit, index) => {
            const completedToday = habit.completedDates?.includes(today);
            const category = getCategoryById(habit.category);
            return (
              <div
                key={habit.id}
                className="habit-card"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Category badge */}
                    <div
                      className="category-badge w-fit mb-3"
                      style={{
                        backgroundColor: `${category.color}30`,
                        borderColor: category.color,
                        color: '#ffffff',
                      }}
                    >
                      {category.icon} {category.name}
                    </div>

                    {/* Title */}
                    <h3 className="font-semibold text-lg mb-1 truncate">{habit.name}</h3>
                    {habit.description && (
                      <p className="text-gray-400 text-sm line-clamp-2">{habit.description}</p>
                    )}

                    {/* Meta */}
                    <div className="flex items-center gap-3 mt-3">
                      <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded-lg">
                        {habit.frequency.charAt(0).toUpperCase() + habit.frequency.slice(1)}
                      </span>
                      {habit.currentStreak > 0 && (
                        <span className="streak-badge">
                          🔥 {habit.currentStreak}d
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    {completedToday ? (
                      <div className="glass-btn bg-gradient-to-r from-emerald-500 to-green-500 text-white text-sm px-4 py-2">
                        ✓ Done
                      </div>
                    ) : (
                      <button
                        onClick={() => onToggle(habit.id)}
                        className="glass-btn text-sm px-4 py-2 hover:from-emerald-500 hover:to-green-500 hover:text-white"
                      >
                        Complete
                      </button>
                    )}
                  </div>
                </div>

                {/* Card footer */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                  <button
                    onClick={() => onEdit(habit)}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    Edit
                  </button>
                  {habit.currentStreak > 0 && (
                    <button
                      onClick={() => onShare(habit)}
                      className="text-sm text-gray-400 hover:text-emerald-400 transition-colors"
                    >
                      📤 Share
                    </button>
                  )}
                  <button
                    onClick={() => onDelete(habit.id)}
                    className="text-sm text-gray-400 hover:text-red-400 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
