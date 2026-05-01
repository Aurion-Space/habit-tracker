import { NavLink } from 'react-router-dom';
import { categories } from '../data/templates';

const navItems = [
  { to: '/habits', label: 'Habits', icon: '📋' },
  { to: '/calendar', label: 'Calendar', icon: '📅' },
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
];

const socialNavItems = [
  { to: '/buddies', label: 'Buddies', icon: '🤝' },
  { to: '/groups', label: 'Groups', icon: '👥' },
  { to: '/shared', label: 'Shared', icon: '📤' },
  { to: '/leaderboard', label: 'Leaderboard', icon: '🏆' },
  { to: '/profile', label: 'Profile', icon: '👤' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

// Dynamic classes based on theme
const getNavButtonClass = (isActive, isDark) => {
  const base = 'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300';
  
  if (isActive) {
    return `${base} bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-emerald-400 border border-emerald-500/30`;
  }
  
  // Inactive state - always visible text
  if (isDark) {
    return `${base} text-gray-400 hover:text-white hover:bg-white/5`;
  } else {
    return `${base} text-gray-600 hover:text-gray-900 hover:bg-gray-100`;
  }
};

const getSocialButtonClass = (isActive, isDark) => {
  const base = 'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300';
  
  if (isActive) {
    return `${base} bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 border border-purple-500/30`;
  }
  
  // Inactive state - always visible text
  if (isDark) {
    return `${base} text-gray-400 hover:text-white hover:bg-white/5`;
  } else {
    return `${base} text-gray-600 hover:text-gray-900 hover:bg-gray-100`;
  }
};

export default function Sidebar({ isOpen, onClose, theme, onThemeToggle, user, onLogout }) {
  const isDark = theme === 'dark';
  
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="sidebar-overlay" onClick={onClose} />
      )}

      {/* Sidebar - make it scrollable */}
      <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        {/* Scrollable container */}
        <div className="h-full flex flex-col overflow-y-auto">
          <div className="p-6 flex-shrink-0">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center text-xl shadow-lg">
                🌱
              </div>
              <div>
                <h1 className={`font-bold text-lg ${isDark ? 'gradient-text' : 'text-emerald-600'}`}>Habit Tracker</h1>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Track your progress</p>
              </div>
            </div>

            {/* User info */}
            {user && (
              <div className={`${isDark ? 'glass-card-dark' : 'bg-gray-100/80 backdrop-blur-xl border border-gray-200/50 rounded-2xl shadow-xl'} p-3 mb-6`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center font-bold text-sm text-white">
                    {user.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{user.name}</p>
                    <p className={`text-xs truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{user.email}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <nav className="space-y-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) => getNavButtonClass(isActive, isDark)}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </NavLink>
              ))}

              {/* Social Section */}
              <div className="pt-4 mt-4 border-t border-white/10">
                <p className={`text-xs uppercase tracking-wider mb-2 px-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Social</p>
                {socialNavItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className={({ isActive }) => getSocialButtonClass(isActive, isDark)}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </nav>
          </div>

          {/* Footer - always at bottom */}
          <div className={`mt-auto p-6 pt-4 border-t ${isDark ? 'border-white/10' : 'border-gray-200/50'} space-y-3 flex-shrink-0`}>
            {/* Categories quick access */}
            <div className={`pb-4 ${isDark ? 'border-white/10' : 'border-gray-200/50'}`}>
              <p className={`text-xs uppercase tracking-wider mb-3 px-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Categories</p>
              <div className="flex flex-wrap gap-2 px-2">
                {categories.slice(0, 6).map((cat) => (
                  <button
                    key={cat.id}
                    className={`w-8 h-8 rounded-lg transition-all duration-200 flex items-center justify-center text-sm ${
                      isDark 
                        ? 'bg-white/5 hover:bg-white/10' 
                        : 'bg-gray-200/50 hover:bg-gray-300/50'
                    }`}
                    style={{ borderLeft: `2px solid ${cat.color}` }}
                    title={cat.name}
                  >
                    {cat.icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Theme toggle */}
            <button
              onClick={onThemeToggle}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                isDark 
                  ? 'text-gray-400 hover:text-white hover:bg-white/5' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <span className="text-xl">{isDark ? '☀️' : '🌙'}</span>
              <span className="font-medium">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
            </button>

            {/* Logout */}
            <button
              onClick={onLogout}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                isDark 
                  ? 'text-gray-400 hover:text-red-400 hover:bg-red-500/10' 
                  : 'text-gray-600 hover:text-red-600 hover:bg-red-50'
              }`}
            >
              <span className="text-xl">🚪</span>
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
