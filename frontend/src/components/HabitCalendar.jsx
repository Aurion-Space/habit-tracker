import { useState, useEffect } from 'react';
import { getHabitLogs } from '../api';

function HabitCalendar({ habits }) {
  const [selectedHabitId, setSelectedHabitId] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [completedDates, setCompletedDates] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedHabitId) {
      fetchLogs();
    }
  }, [selectedHabitId, currentDate]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const month = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      const logs = await getHabitLogs(selectedHabitId, month);
      setCompletedDates(logs.map(log => log.completed_date));
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDate = (year, month, day) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const today = new Date();
  const todayStr = formatDate(today.getFullYear(), today.getMonth(), today.getDate());

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const days = [];
  // Empty cells for days before the first day of month
  for (let i = 0; i < firstDay; i++) {
    days.push({ day: null, otherMonth: true });
  }
  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = formatDate(year, month, day);
    days.push({ 
      day, 
      dateStr, 
      completed: completedDates.includes(dateStr),
      isToday: dateStr === todayStr
    });
  }

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (habits.length === 0) {
    return (
      <div className="calendar-container">
        <div className="empty-state">
          <h3>No habits to display</h3>
          <p>Add some habits first to view your progress on the calendar.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <h2>Habit Calendar</h2>
        <select 
          className="calendar-select"
          value={selectedHabitId || ''}
          onChange={(e) => setSelectedHabitId(Number(e.target.value) || null)}
        >
          <option value="">Select a habit</option>
          {habits.map(habit => (
            <option key={habit.id} value={habit.id}>{habit.name}</option>
          ))}
        </select>
      </div>

      {selectedHabitId ? (
        <>
          <div className="calendar-header" style={{ marginTop: '1rem' }}>
            <h3>{monthName}</h3>
            <div className="calendar-nav">
              <button onClick={prevMonth}>← Prev</button>
              <button onClick={nextMonth}>Next →</button>
            </div>
          </div>

          {loading ? (
            <p className="loading">Loading...</p>
          ) : (
            <>
              <div className="calendar-grid">
                {weekDays.map(day => (
                  <div key={day} className="calendar-day-header">{day}</div>
                ))}
                {days.map((item, index) => {
                  if (item.otherMonth || !item.day) {
                    return <div key={`empty-${index}`} className="calendar-day other-month"></div>;
                  }
                  return (
                    <div 
                      key={item.dateStr}
                      className={`calendar-day ${item.completed ? 'completed' : ''} ${item.isToday ? 'today' : ''}`}
                      title={item.completed ? 'Completed!' : ''}
                    >
                      {item.day}
                    </div>
                  );
                })}
              </div>

              <div className="calendar-legend">
                <span>
                  <span className="legend-box completed"></span>
                  Completed
                </span>
                <span>
                  <span className="legend-box today"></span>
                  Today
                </span>
              </div>
            </>
          )}
        </>
      ) : (
        <div className="empty-state" style={{ padding: '2rem' }}>
          <p>Select a habit above to view its completion calendar.</p>
        </div>
      )}
    </div>
  );
}

export default HabitCalendar;
