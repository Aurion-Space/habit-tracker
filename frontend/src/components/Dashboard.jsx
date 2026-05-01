import { useMemo } from 'react';

export default function Dashboard({ habits }) {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const stats = useMemo(() => {
    const totalHabits = habits.length;
    const completedToday = habits.filter(h => h.completedDates?.includes(todayStr)).length;
    const totalCompletions = habits.reduce((sum, h) => sum + (h.completedDates?.length || 0), 0);
    const totalStreaks = habits.reduce((sum, h) => sum + (h.currentStreak || 0), 0);
    const longestStreak = Math.max(0, ...habits.map(h => h.longestStreak || 0));
    const avgCompletionRate = totalHabits > 0
      ? Math.round((completedToday / totalHabits) * 100)
      : 0;

    // Category breakdown
    const categoryStats = {};
    habits.forEach(h => {
      if (!categoryStats[h.category]) {
        categoryStats[h.category] = { count: 0, completed: 0 };
      }
      categoryStats[h.category].count++;
      if (h.completedDates?.includes(todayStr)) {
        categoryStats[h.category].completed++;
      }
    });

    // Weekly data (last 7 days)
    const weeklyData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      const completed = habits.filter(h => h.completedDates?.includes(dateStr)).length;
      const rate = totalHabits > 0 ? (completed / totalHabits) * 100 : 0;
      weeklyData.push({ dayName, completed, rate, dateStr });
    }

    // Top performers (habits with streaks)
    const topHabits = [...habits]
      .filter(h => h.currentStreak > 0)
      .sort((a, b) => b.currentStreak - a.currentStreak)
      .slice(0, 5);

    return {
      totalHabits,
      completedToday,
      totalCompletions,
      totalStreaks,
      longestStreak,
      avgCompletionRate,
      categoryStats,
      weeklyData,
      topHabits
    };
  }, [habits, todayStr]);

  const maxWeekly = Math.max(...stats.weeklyData.map(d => d.completed), 1);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="text-gray-400 text-sm mt-1">Track your progress and insights</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card glow-green">
          <div className="text-4xl mb-2">🎯</div>
          <div className="text-3xl font-bold gradient-text">{stats.avgCompletionRate}%</div>
          <div className="text-sm text-gray-400">Today's Progress</div>
          <div className="mt-2 progress-bar">
            <div className="progress-fill" style={{ width: `${stats.avgCompletionRate}%` }} />
          </div>
        </div>

        <div className="stat-card">
          <div className="text-4xl mb-2">✅</div>
          <div className="text-3xl font-bold">{stats.completedToday}/{stats.totalHabits}</div>
          <div className="text-sm text-gray-400">Completed Today</div>
        </div>

        <div className="stat-card">
          <div className="text-4xl mb-2">🔥</div>
          <div className="text-3xl font-bold">{stats.longestStreak}</div>
          <div className="text-sm text-gray-400">Longest Streak</div>
        </div>

        <div className="stat-card">
          <div className="text-4xl mb-2">📊</div>
          <div className="text-3xl font-bold">{stats.totalCompletions}</div>
          <div className="text-sm text-gray-400">Total Completions</div>
        </div>
      </div>

      {/* Weekly Chart */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4">📈 Weekly Activity</h3>
        <div className="flex items-end justify-between gap-2 h-32">
          {stats.weeklyData.map((day, index) => {
            const height = (day.completed / maxWeekly) * 100;
            const isToday = day.dateStr === todayStr;
            return (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex items-end justify-center h-24">
                  <div
                    className={`w-8 rounded-t-lg transition-all duration-500 ${
                      isToday
                        ? 'bg-gradient-to-t from-emerald-500 to-cyan-400 shadow-lg shadow-emerald-500/30'
                        : 'bg-gradient-to-t from-emerald-600/60 to-green-500/40'
                    }`}
                    style={{ height: `${Math.max(height, 4)}%` }}
                  />
                </div>
                <span className={`text-xs ${isToday ? 'text-emerald-400 font-bold' : 'text-gray-400'}`}>
                  {day.dayName}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">📊 Category Breakdown</h3>
          {Object.keys(stats.categoryStats).length === 0 ? (
            <p className="text-gray-400 text-center py-4">No habits tracked yet</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(stats.categoryStats).map(([catId, data]) => {
                const rate = data.count > 0 ? (data.completed / data.count) * 100 : 0;
                const colors = {
                  health: { from: '#10b981', to: '#059669' },
                  fitness: { from: '#f97316', to: '#ea580c' },
                  learning: { from: '#3b82f6', to: '#2563eb' },
                  productivity: { from: '#8b5cf6', to: '#7c3aed' },
                  mindfulness: { from: '#ec4899', to: '#db2777' },
                  social: { from: '#f59e0b', to: '#d97706' },
                  creativity: { from: '#06b6d4', to: '#0891b2' },
                  finance: { from: '#22c55e', to: '#16a34a' },
                  nutrition: { from: '#84cc16', to: '#65a30d' },
                  sleep: { from: '#6366f1', to: '#4f46e5' },
                  nature: { from: '#14b8a6', to: '#0d9488' },
                  personal: { from: '#a855f7', to: '#9333ea' },
                };
                const catColors = colors[catId] || { from: '#6b7280', to: '#4b5563' };
                return (
                  <div key={catId}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize text-white">{catId}</span>
                      <span className="text-gray-400">{data.completed}/{data.count}</span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${rate}%`,
                          background: `linear-gradient(90deg, ${catColors.from}, ${catColors.to})`
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Streaks */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">🏆 Top Streaks</h3>
          {stats.topHabits.length === 0 ? (
            <p className="text-gray-400 text-center py-4">Complete habits to build streaks!</p>
          ) : (
            <div className="space-y-3">
              {stats.topHabits.map((habit, index) => (
                <div
                  key={habit.id}
                  className="flex items-center gap-4 p-3 rounded-xl bg-white/5"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    index === 0 ? 'bg-amber-500/20 text-amber-400' :
                    index === 1 ? 'bg-gray-400/20 text-gray-300' :
                    index === 2 ? 'bg-orange-500/20 text-orange-400' :
                    'bg-white/10 text-gray-400'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{habit.name}</p>
                    <p className="text-xs text-gray-400">Best: {habit.longestStreak} days</p>
                  </div>
                  <div className="streak-badge">
                    🔥 {habit.currentStreak}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Motivation Card */}
      <div className="glass-card p-6 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border-emerald-500/20">
        <div className="flex items-center gap-4">
          <div className="text-5xl float">💪</div>
          <div>
            <h3 className="text-lg font-semibold gradient-text">Keep Going!</h3>
            <p className="text-gray-300">
              {stats.completedToday === stats.totalHabits && stats.totalHabits > 0
                ? "Amazing! You've completed all habits today! 🎉"
                : stats.totalStreaks > 0
                ? `You've maintained ${stats.totalStreaks} days of streaks! Keep building momentum!`
                : "Start completing habits to build your streaks and track progress!"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
