import { useMemo } from 'react';

export default function CalendarView({ habits, onToggleHabit }) {
  const today = new Date();
  const currentMonth = today.toLocaleString('default', { month: 'long', year: 'numeric' });

  const calendarData = useMemo(() => {
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];

    // Empty cells for days before the first of the month
    for (let i = 0; i < firstDay; i++) {
      days.push({ day: null, date: null });
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isToday = day === today.getDate();

      // Calculate completion stats for this day
      const completedCount = habits.filter(h =>
        h.completedDates?.includes(date)
      ).length;
      const completionRate = habits.length > 0 ? (completedCount / habits.length) * 100 : 0;

      days.push({ day, date, isToday, completedCount, completionRate });
    }

    return { days, year, month };
  }, [habits, today]);

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Calendar</h2>
        <p className="text-gray-400 text-sm mt-1">{currentMonth}</p>
      </div>

      {/* Calendar Grid */}
      <div className="glass-card p-6">
        {/* Week day headers */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {weekDays.map(day => (
            <div key={day} className="text-center text-sm text-gray-400 font-medium py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-2">
          {calendarData.days.map((item, index) => {
            if (!item.day) {
              return <div key={`empty-${index}`} className="w-10 h-10" />;
            }

            const isCompleted = item.completedCount > 0;
            const isPartial = item.completedCount > 0 && item.completedCount < habits.length;
            const isPerfect = item.completedCount === habits.length && habits.length > 0;

            return (
              <div
                key={item.date}
                className={`calendar-day ${isCompleted ? 'completed' : ''} ${item.isToday ? 'today' : ''}`}
                style={
                  isPerfect
                    ? { background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 0 20px rgba(16, 185, 129, 0.5)' }
                    : isPartial
                    ? { background: `linear-gradient(135deg, #10b981${Math.round(item.completionRate * 2.55).toString(16).padStart(2, '0')}, #05966940)`, boxShadow: 'none' }
                    : {}
                }
                title={`${item.completedCount}/${habits.length} habits completed`}
              >
                {item.day}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="glass-card p-4 flex flex-wrap gap-4 justify-center">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gradient-to-r from-emerald-500 to-green-500" />
          <span className="text-sm text-gray-400">Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-white/20" />
          <span className="text-sm text-gray-400">Pending</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded ring-2 ring-cyan-400" />
          <span className="text-sm text-gray-400">Today</span>
        </div>
      </div>

      {/* Monthly Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="text-3xl mb-1">📅</div>
          <div className="text-2xl font-bold">{calendarData.days.filter(d => d.day).length}</div>
          <div className="text-sm text-gray-400">Days in Month</div>
        </div>
        <div className="stat-card">
          <div className="text-3xl mb-1">✅</div>
          <div className="text-2xl font-bold">
            {calendarData.days.filter(d => d.day && d.completedCount > 0).length}
          </div>
          <div className="text-sm text-gray-400">Active Days</div>
        </div>
        <div className="stat-card">
          <div className="text-3xl mb-1">🏆</div>
          <div className="text-2xl font-bold">
            {calendarData.days.filter(d => d.day && d.completedCount === habits.length && habits.length > 0).length}
          </div>
          <div className="text-sm text-gray-400">Perfect Days</div>
        </div>
        <div className="stat-card">
          <div className="text-3xl mb-1">📊</div>
          <div className="text-2xl font-bold">
            {habits.length > 0
              ? Math.round(
                  calendarData.days
                    .filter(d => d.day && d.date)
                    .reduce((sum, d) => sum + (d.completedCount / habits.length), 0) /
                  calendarData.days.filter(d => d.day).length * 100
                )
              : 0}%
          </div>
          <div className="text-sm text-gray-400">Avg. Completion</div>
        </div>
      </div>

      {/* Habit Status List */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4">Today's Habits</h3>
        <div className="space-y-3">
          {habits.length === 0 ? (
            <p className="text-gray-400 text-center py-4">No habits tracked yet</p>
          ) : (
            habits.map(habit => {
              const completedToday = habit.completedDates?.includes(
                `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
              );
              return (
                <div key={habit.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      completedToday
                        ? 'bg-emerald-500 border-emerald-500'
                        : 'border-gray-500'
                    }`}>
                      {completedToday && <span className="text-white text-xs">✓</span>}
                    </div>
                    <span className="font-medium">{habit.name}</span>
                  </div>
                  <button
                    onClick={() => onToggleHabit(habit.id)}
                    className={`px-3 py-1 rounded-lg text-sm transition-all ${
                      completedToday
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'glass-btn text-sm'
                    }`}
                  >
                    {completedToday ? 'Completed' : 'Mark Done'}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
