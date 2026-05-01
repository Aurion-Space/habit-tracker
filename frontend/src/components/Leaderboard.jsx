import { useState, useEffect } from 'react';
import { 
  getLeaderboard, 
  getWeeklyLeaderboard, 
  getMonthlyLeaderboard, 
  getStreakLeaderboard,
  getMyLeaderboardStats 
} from '../api';
import { categories } from '../data/templates';

export default function Leaderboard({ user }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [myStats, setMyStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('all');
  const [category, setCategory] = useState('');

  useEffect(() => {
    loadData();
  }, [type, category]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [leaderboardData, statsData] = await Promise.all([
        type === 'streaks' 
          ? getStreakLeaderboard() 
          : type === 'weekly' 
            ? getWeeklyLeaderboard()
            : type === 'monthly'
              ? getMonthlyLeaderboard()
              : getLeaderboard(type, category),
        getMyLeaderboardStats()
      ]);
      setLeaderboard(leaderboardData);
      setMyStats(statsData);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return null;
  };

  const getRankColor = (rank) => {
    if (rank === 1) return 'from-yellow-400 to-amber-500';
    if (rank === 2) return 'from-gray-300 to-gray-400';
    if (rank === 3) return 'from-amber-600 to-amber-700';
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold gradient-text">Leaderboard</h2>
        <p className="text-gray-400 text-sm mt-1">Compete with others and climb the ranks!</p>
      </div>

      {/* My Stats Card */}
      {myStats && (
        <div className="glass-card p-6 bg-gradient-to-r from-emerald-500/10 to-green-500/10 border-emerald-500/30">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-4xl mb-1">👤</div>
              <div className="text-2xl font-bold">#{myStats.overall_rank || '-'}</div>
              <div className="text-xs text-gray-400">Your Rank</div>
            </div>
            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-xl font-bold">{myStats.level || 1}</div>
                <div className="text-xs text-gray-400">Level</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold">{myStats.total_xp || 0}</div>
                <div className="text-xs text-gray-400">Total XP</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold">{myStats.weekly_xp || 0}</div>
                <div className="text-xs text-gray-400">This Week</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold flex items-center justify-center gap-1">
                  🔥 {myStats.current_streak || 0}
                </div>
                <div className="text-xs text-gray-400">Streak</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Type Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setType('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            type === 'all'
              ? 'bg-emerald-500 text-white'
              : 'bg-white/10 hover:bg-white/20 text-gray-300'
          }`}
        >
          🏆 All-Time
        </button>
        <button
          onClick={() => setType('weekly')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            type === 'weekly'
              ? 'bg-emerald-500 text-white'
              : 'bg-white/10 hover:bg-white/20 text-gray-300'
          }`}
        >
          📅 Weekly
        </button>
        <button
          onClick={() => setType('monthly')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            type === 'monthly'
              ? 'bg-emerald-500 text-white'
              : 'bg-white/10 hover:bg-white/20 text-gray-300'
          }`}
        >
          📆 Monthly
        </button>
        <button
          onClick={() => setType('streaks')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            type === 'streaks'
              ? 'bg-emerald-500 text-white'
              : 'bg-white/10 hover:bg-white/20 text-gray-300'
          }`}
        >
          🔥 Streaks
        </button>
      </div>

      {/* Category Filter (for all-time) */}
      {type === 'all' && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategory('')}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              !category
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-white/5 hover:bg-white/10 text-gray-400'
            }`}
          >
            All Categories
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 transition-colors ${
                category === cat.id
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-white/5 hover:bg-white/10 text-gray-400'
              }`}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Leaderboard List */}
      <div className="space-y-2">
        {leaderboard.leaderboard?.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏆</div>
            <h3 className="text-xl font-medium mb-2">No rankings yet</h3>
            <p className="text-gray-400">Complete habits to earn XP and climb the leaderboard!</p>
          </div>
        ) : (
          leaderboard.leaderboard?.map((entry, index) => {
            const rankIcon = getRankIcon(entry.rank);
            const rankColor = getRankColor(entry.rank);
            const isCurrentUser = entry.id === user?.id || entry.is_current_user;

            return (
              <div
                key={entry.id}
                className={`glass-card p-4 flex items-center gap-4 transition-colors ${
                  isCurrentUser 
                    ? 'border-emerald-500/50 bg-emerald-500/5' 
                    : 'hover:border-white/20'
                } ${rankColor ? `bg-gradient-to-r ${rankColor}/10` : ''}`}
              >
                {/* Rank */}
                <div className="w-12 text-center">
                  {rankIcon ? (
                    <span className="text-2xl">{rankIcon}</span>
                  ) : (
                    <span className={`text-lg font-bold ${
                      entry.rank <= 3 ? 'text-amber-400' : 'text-gray-400'
                    }`}>
                      #{entry.rank}
                    </span>
                  )}
                </div>

                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                  isCurrentUser
                    ? 'bg-gradient-to-br from-emerald-500 to-green-600'
                    : 'bg-gradient-to-br from-purple-500 to-pink-500'
                }`}>
                  {entry.name?.charAt(0)?.toUpperCase() || '?'}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${isCurrentUser ? 'text-emerald-400' : ''}`}>
                      {entry.name}
                      {isCurrentUser && ' (You)'}
                    </span>
                    <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                      Lvl {entry.level || 1}
                    </span>
                  </div>
                  {type !== 'streaks' && (
                    <div className="text-xs text-gray-400 mt-0.5">
                      {entry.total_habits || 0} habits • {entry.total_completions || 0} completions
                    </div>
                  )}
                  {type === 'streaks' && (
                    <div className="text-xs text-gray-400 mt-0.5">
                      {entry.total_habits || 0} habits
                    </div>
                  )}
                </div>

                {/* Score */}
                <div className="text-right">
                  <div className={`font-bold ${isCurrentUser ? 'text-emerald-400' : ''}`}>
                    {type === 'streaks' ? (
                      <span className="flex items-center gap-1 justify-end">
                        🔥 {entry.current_streak || 0}
                      </span>
                    ) : type === 'weekly' ? (
                      <span>{entry.weekly_xp || 0} XP</span>
                    ) : type === 'monthly' ? (
                      <span>{entry.monthly_xp || 0} XP</span>
                    ) : (
                      <span>{entry.total_xp || 0} XP</span>
                    )}
                  </div>
                  {type === 'all' && (
                    <div className="text-xs text-gray-400">
                      {entry.category_habits || entry.total_habits || 0} habits
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Top 3 Podium (for all-time) */}
      {type === 'all' && leaderboard.leaderboard?.length >= 3 && (
        <div className="mt-8">
          <h3 className="text-lg font-bold mb-4 text-center">🏆 Top 3 Champions</h3>
          <div className="flex items-end justify-center gap-4">
            {/* 2nd Place */}
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-2 shadow-lg">
                {leaderboard.leaderboard[1]?.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="text-2xl">🥈</div>
              <p className="font-medium">{leaderboard.leaderboard[1]?.name}</p>
              <p className="text-sm text-gray-400">{leaderboard.leaderboard[1]?.total_xp || 0} XP</p>
              <div className="h-16 bg-gradient-to-t from-gray-400/20 to-transparent rounded-t-lg mt-2" />
            </div>

            {/* 1st Place */}
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-2 shadow-lg ring-4 ring-yellow-400/30">
                {leaderboard.leaderboard[0]?.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="text-3xl">👑</div>
              <p className="font-bold text-lg">{leaderboard.leaderboard[0]?.name}</p>
              <p className="text-sm text-yellow-400">{leaderboard.leaderboard[0]?.total_xp || 0} XP</p>
              <div className="h-24 bg-gradient-to-t from-yellow-400/20 to-transparent rounded-t-lg mt-2" />
            </div>

            {/* 3rd Place */}
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-600 to-amber-700 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-2 shadow-lg">
                {leaderboard.leaderboard[2]?.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="text-2xl">🥉</div>
              <p className="font-medium">{leaderboard.leaderboard[2]?.name}</p>
              <p className="text-sm text-gray-400">{leaderboard.leaderboard[2]?.total_xp || 0} XP</p>
              <div className="h-12 bg-gradient-to-t from-amber-600/20 to-transparent rounded-t-lg mt-2" />
            </div>
          </div>
        </div>
      )}

      {/* Total Users */}
      {leaderboard.total_users && (
        <p className="text-center text-gray-400 text-sm">
          Showing top {leaderboard.leaderboard?.length || 0} of {leaderboard.total_users} users
        </p>
      )}
    </div>
  );
}
