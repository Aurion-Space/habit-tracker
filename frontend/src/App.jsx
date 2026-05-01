import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AuthForm from './components/AuthForm';
import Sidebar from './components/Sidebar';
import HabitList from './components/HabitList';
import HabitForm from './components/HabitForm';
import CalendarView from './components/CalendarView';
import Dashboard from './components/Dashboard';
import ShareModal from './components/ShareModal';
import BuddyList from './components/BuddyList';
import Leaderboard from './components/Leaderboard';
import GroupHabits from './components/GroupHabits';
import SharedHabits from './components/SharedHabits';
import Profile from './components/Profile';
import BadgeDisplay from './components/BadgeDisplay';
import Settings from './components/Settings';
import { getHabits, completeHabit, deleteHabit } from './api';

export default function App() {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [sharingHabit, setSharingHabit] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState('dark');

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Check for existing session
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        console.error('Invalid user data in localStorage, clearing...');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  // Fetch habits when logged in
  useEffect(() => {
    if (user) {
      fetchHabits();
    }
  }, [user]);

  const fetchHabits = async () => {
    try {
      setLoading(true);
      const data = await getHabits();
      setHabits(data);
    } catch (err) {
      console.error('Failed to fetch habits:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = useCallback(() => {
    const userData = localStorage.getItem('user');
    console.log('handleLogin - raw userData:', JSON.stringify(userData));
    if (userData && userData !== 'undefined' && userData !== 'null') {
      try {
        const parsed = JSON.parse(userData);
        console.log('handleLogin - parsed user:', parsed);
        setUser(parsed);
      } catch (e) {
        console.error('Invalid user data:', e.message);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setHabits([]);
  };

  const handleToggleHabit = async (habitId) => {
    try {
      await completeHabit(habitId);
      await fetchHabits();
    } catch (err) {
      console.error('Failed to toggle habit:', err);
    }
  };

  const handleDeleteHabit = async (habitId) => {
    if (window.confirm('Are you sure you want to delete this habit?')) {
      try {
        await deleteHabit(habitId);
        await fetchHabits();
      } catch (err) {
        console.error('Failed to delete habit:', err);
      }
    }
  };

  const handleEditHabit = (habit) => {
    setEditingHabit(habit);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingHabit(null);
    fetchHabits();
  };

  const handleAddHabit = () => {
    setEditingHabit(null);
    setShowForm(true);
  };

  const handleShare = (habit) => {
    setSharingHabit(habit);
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Loading state
  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
      </div>
    );
  }

  // Auth screen
  if (!user) {
    return (
      <AuthForm
        mode={authMode}
        onSuccess={handleLogin}
        onSwitch={() => setAuthMode(prev => prev === 'login' ? 'register' : 'login')}
      />
    );
  }

  return (
    <div className="min-h-screen">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 w-12 h-12 glass-card flex items-center justify-center text-xl"
      >
        ☰
      </button>

      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        theme={theme}
        onThemeToggle={toggleTheme}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <main className="lg:ml-64 p-4 lg:p-8 pt-16 lg:pt-8 min-h-screen">
        <div className="max-w-6xl mx-auto">
          {/* Mobile header */}
          <div className="lg:hidden mb-6">
            <h1 className="text-2xl font-bold gradient-text">Habit Tracker</h1>
          </div>

          {/* Routes */}
          <Routes>
            <Route path="/" element={<Navigate to="/habits" replace />} />
            <Route path="/habits" element={
              <HabitList
                habits={habits}
                loading={loading}
                onToggle={handleToggleHabit}
                onEdit={handleEditHabit}
                onDelete={handleDeleteHabit}
                onAdd={handleAddHabit}
                onShare={handleShare}
              />
            } />
            <Route path="/calendar" element={
              <CalendarView
                habits={habits}
                onToggleHabit={handleToggleHabit}
              />
            } />
            <Route path="/dashboard" element={
              <Dashboard habits={habits} />
            } />
            <Route path="/stats" element={
              <Dashboard habits={habits} />
            } />
            <Route path="/buddies" element={
              <BuddyList user={user} />
            } />
            <Route path="/groups" element={
              <GroupHabits user={user} />
            } />
            <Route path="/shared" element={
              <SharedHabits 
                habits={habits} 
                onHabitImported={fetchHabits}
                onRefreshHabits={fetchHabits}
              />
            } />
            <Route path="/leaderboard" element={
              <Leaderboard user={user} />
            } />
            <Route path="/profile" element={
              <Profile user={user} />
            } />
            <Route path="/settings" element={
              <Settings user={user} />
            } />
          </Routes>
        </div>
      </main>

      {/* Modals */}
      {showForm && (
        <HabitForm
          habit={editingHabit}
          onClose={() => {
            setShowForm(false);
            setEditingHabit(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {sharingHabit && (
        <ShareModal
          habit={sharingHabit}
          onClose={() => setSharingHabit(null)}
        />
      )}
    </div>
  );
}
