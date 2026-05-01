import { useState, useEffect } from 'react';
import { getBadges, getXPInfo } from '../api';

export default function BadgeDisplay({ compact = false }) {
  const [badges, setBadges] = useState([]);
  const [xpInfo, setXpInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [badgesData, xpData] = await Promise.all([
        getBadges(),
        getXPInfo()
      ]);
      setBadges(badgesData.badges || []);
      setXpInfo(xpData);
    } catch (err) {
      console.error('Failed to load badges:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500" />
      </div>
    );
  }

  const earnedBadges = badges.filter(b => b.earned);
  const recentBadges = earnedBadges.slice(0, compact ? 3 : earnedBadges.length);

  if (compact) {
    return (
      <div className="flex items-center gap-4">
        {/* XP and Level */}
        <div className="flex items-center gap-2">
          <span className="text-xl">⭐</span>
          <div>
            <p className="text-sm font-medium">{xpInfo?.level || 1}</p>
            <p className="text-xs text-gray-400">Level</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xl">💫</span>
          <div>
            <p className="text-sm font-medium">{xpInfo?.total_xp || 0}</p>
            <p className="text-xs text-gray-400">XP</p>
          </div>
        </div>

        {/* Badge Count */}
        <div className="flex items-center gap-2">
          <span className="text-xl">🏆</span>
          <div>
            <p className="text-sm font-medium">{earnedBadges.length}</p>
            <p className="text-xs text-gray-400">Badges</p>
          </div>
        </div>

        {/* Recent Badges */}
        {recentBadges.length > 0 && (
          <div className="flex -space-x-2">
            {recentBadges.map(badge => (
              <div
                key={badge.badge_id}
                className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-lg border-2 border-gray-900"
                title={`${badge.badge_name}: ${badge.badge_description}`}
              >
                {badge.badge_icon}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="glass-card p-6 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30">
        <div className="flex items-center gap-8">
          <div className="text-center">
            <div className="text-4xl mb-1">⭐</div>
            <div className="text-2xl font-bold">{xpInfo?.level || 1}</div>
            <div className="text-xs text-gray-400">Current Level</div>
          </div>
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-1">
              <span>Progress to Level {(xpInfo?.level || 1) + 1}</span>
              <span>{xpInfo?.total_xp || 0} / {xpInfo?.xp_needed || 100} XP</span>
            </div>
            <div className="h-4 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                style={{ width: `${xpInfo ? (xpInfo.xp_progress / xpInfo.xp_needed) * 100 : 0}%` }}
              />
            </div>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-1">🏆</div>
            <div className="text-2xl font-bold">{earnedBadges.length}</div>
            <div className="text-xs text-gray-400">Badges</div>
          </div>
        </div>
      </div>

      {/* XP Sources */}
      <div className="glass-card p-4">
        <h3 className="font-semibold mb-3">How to Earn XP</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-white/5 rounded-lg">
            <div className="text-2xl mb-1">✅</div>
            <p className="text-sm font-medium">Complete Habit</p>
            <p className="text-xs text-emerald-400">+10-50 XP</p>
          </div>
          <div className="text-center p-3 bg-white/5 rounded-lg">
            <div className="text-2xl mb-1">🔥</div>
            <p className="text-sm font-medium">Build Streak</p>
            <p className="text-xs text-orange-400">+5-25 XP bonus</p>
          </div>
          <div className="text-center p-3 bg-white/5 rounded-lg">
            <div className="text-2xl mb-1">👥</div>
            <p className="text-sm font-medium">Social</p>
            <p className="text-xs text-blue-400">+5-25 XP</p>
          </div>
          <div className="text-center p-3 bg-white/5 rounded-lg">
            <div className="text-2xl mb-1">📤</div>
            <p className="text-sm font-medium">Share</p>
            <p className="text-xs text-purple-400">+10-50 XP</p>
          </div>
        </div>
      </div>

      {/* All Badges */}
      <div>
        <h3 className="font-semibold mb-4">All Badges ({earnedBadges.length}/{badges.length})</h3>
        
        {/* Earned Badges */}
        {earnedBadges.length > 0 && (
          <div className="mb-6">
            <p className="text-sm text-gray-400 mb-3 flex items-center gap-2">
              <span>🏆</span> Earned ({earnedBadges.length})
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {earnedBadges.map(badge => (
                <div
                  key={badge.badge_id}
                  className="glass-card p-4 hover:border-emerald-500/30 transition-colors group"
                >
                  <div className="text-center">
                    <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">
                      {badge.badge_icon}
                    </div>
                    <p className="font-medium text-sm">{badge.badge_name}</p>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                      {badge.badge_description}
                    </p>
                    <p className="text-xs text-emerald-400 mt-2">
                      Earned {new Date(badge.earned_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Locked Badges */}
        <div>
          <p className="text-sm text-gray-400 mb-3 flex items-center gap-2">
            <span>🔒</span> Locked ({badges.length - earnedBadges.length})
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {badges.filter(b => !b.earned).map(badge => (
              <div
                key={badge.badge_id}
                className="glass-card p-4 opacity-50"
              >
                <div className="text-center">
                  <div className="text-4xl mb-2 grayscale">
                    {badge.badge_icon}
                  </div>
                  <p className="font-medium text-sm">{badge.badge_name}</p>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                    {badge.badge_description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


