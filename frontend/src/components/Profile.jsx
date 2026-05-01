import { useState, useEffect } from 'react';
import { getProfile, getMyProfileSettings, updateProfileSettings, getBadges } from '../api';
import { categories } from '../data/templates';

export default function Profile({ user }) {
  const [profile, setProfile] = useState(null);
  const [mySettings, setMySettings] = useState(null);
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [saving, setSaving] = useState(false);

  // Settings form state
  const [isPublic, setIsPublic] = useState(true);
  const [bio, setBio] = useState('');

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [settingsData, badgesData] = await Promise.all([
        getMyProfileSettings(),
        getBadges()
      ]);
      setMySettings(settingsData);
      setBadges(badgesData.badges || []);
      setIsPublic(settingsData.is_public !== 0);
      setBio(settingsData.bio || '');
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      await updateProfileSettings({
        is_public: isPublic,
        bio: bio
      });
      setShowSettings(false);
      loadData();
    } catch (err) {
      console.error('Failed to save settings:', err);
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const getCategoryIcon = (catId) => {
    const cat = categories.find(c => c.id === catId);
    return cat ? cat.icon : '📋';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  const earnedBadges = badges.filter(b => b.earned);
  const unearnedBadges = badges.filter(b => !b.earned);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold gradient-text">My Profile</h2>
          <p className="text-gray-400 text-sm mt-1">Your public profile and achievements</p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-colors"
        >
          ⚙️ Settings
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4">Profile Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Public Profile</p>
                <p className="text-sm text-gray-400">Allow others to view your profile</p>
              </div>
              <button
                onClick={() => setIsPublic(!isPublic)}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  isPublic ? 'bg-emerald-500' : 'bg-white/20'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  isPublic ? 'left-7' : 'left-1'
                }`} />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Tell others about yourself..."
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-emerald-500 resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">{bio.length}/500 characters</p>
            </div>

            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}

      {/* Profile Card */}
      <div className="glass-card p-6 bg-gradient-to-r from-emerald-500/10 to-green-500/10 border-emerald-500/30">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-4xl font-bold">
            {user?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold">{user?.name}</h3>
            <p className="text-gray-400">{user?.email}</p>
            {bio && <p className="mt-2 text-sm text-gray-300">{bio}</p>}
            <div className="flex items-center gap-4 mt-3">
              <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm font-medium">
                Level {mySettings?.stats?.level || 1}
              </span>
              <span className="text-sm text-gray-400">
                {isPublic ? '🌐 Public Profile' : '🔒 Private Profile'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 text-center">
          <div className="text-3xl mb-1">⭐</div>
          <div className="text-2xl font-bold">{mySettings?.stats?.total_xp || 0}</div>
          <div className="text-xs text-gray-400">Total XP</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-3xl mb-1">📋</div>
          <div className="text-2xl font-bold">{mySettings?.stats?.total_habits || 0}</div>
          <div className="text-xs text-gray-400">Total Habits</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-3xl mb-1">✅</div>
          <div className="text-2xl font-bold">{mySettings?.stats?.total_completions || 0}</div>
          <div className="text-xs text-gray-400">Completions</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-3xl mb-1">🔥</div>
          <div className="text-2xl font-bold">{mySettings?.stats?.longest_streak || 0}</div>
          <div className="text-xs text-gray-400">Best Streak</div>
        </div>
      </div>

      {/* XP Progress */}
      <div className="glass-card p-6">
        <h3 className="font-semibold mb-3">Level Progress</h3>
        <div className="flex items-center gap-4">
          <div className="text-3xl font-bold">{mySettings?.stats?.level || 1}</div>
          <div className="flex-1">
            <div className="h-4 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full transition-all"
                style={{ 
                  width: `${mySettings?.stats?.level ? 
                    ((mySettings.stats.total_xp - Math.pow(mySettings.stats.level - 1, 2) * 100) / 
                    (Math.pow(mySettings.stats.level, 2) * 100 - Math.pow(mySettings.stats.level - 1, 2) * 100) * 100) 
                    : 0}%` 
                }}
              />
            </div>
          </div>
          <div className="text-sm text-gray-400">
            {mySettings?.stats?.level || 1} → {((mySettings?.stats?.level || 1) + 1)}
          </div>
        </div>
        <p className="text-sm text-gray-400 mt-2">
          {mySettings?.stats?.total_xp || 0} XP total • Keep completing habits to level up!
        </p>
      </div>

      {/* Badges */}
      <div>
        <h3 className="font-semibold mb-4">Achievements ({earnedBadges.length}/{badges.length})</h3>
        
        {/* Earned Badges */}
        {earnedBadges.length > 0 && (
          <div className="mb-6">
            <p className="text-sm text-gray-400 mb-3">🏆 Earned Badges</p>
            <div className="flex flex-wrap gap-3">
              {earnedBadges.map(badge => (
                <div
                  key={badge.badge_id}
                  className="glass-card p-4 flex items-center gap-3 hover:border-emerald-500/30 transition-colors"
                  title={`${badge.badge_description}\nEarned: ${new Date(badge.earned_at).toLocaleDateString()}`}
                >
                  <div className="text-3xl">{badge.badge_icon}</div>
                  <div>
                    <p className="font-medium text-sm">{badge.badge_name}</p>
                    <p className="text-xs text-gray-400">{badge.badge_description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Locked Badges */}
        <div>
          <p className="text-sm text-gray-400 mb-3">🔒 Badges to Unlock</p>
          <div className="flex flex-wrap gap-3">
            {unearnedBadges.map(badge => (
              <div
                key={badge.badge_id}
                className="glass-card p-4 flex items-center gap-3 opacity-50"
                title={badge.badge_description}
              >
                <div className="text-3xl grayscale">{badge.badge_icon}</div>
                <div>
                  <p className="font-medium text-sm">{badge.badge_name}</p>
                  <p className="text-xs text-gray-400">{badge.badge_description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Habits */}
      {mySettings?.top_habits && mySettings.top_habits.length > 0 && (
        <div>
          <h3 className="font-semibold mb-4">Top Habits</h3>
          <div className="space-y-3">
            {mySettings.top_habits.map((habit, index) => (
              <div key={habit.id} className="glass-card p-4 flex items-center gap-4">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </div>
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                  {getCategoryIcon(habit.category)}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{habit.name}</p>
                  <p className="text-xs text-gray-400">{habit.total_completions} completions</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-emerald-400">{habit.completion_rate}%</div>
                  <p className="text-xs text-gray-400">completion rate</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Member Since */}
      <div className="text-center text-gray-400 text-sm">
        Member since {mySettings?.stats?.member_since ? 
          new Date(mySettings.stats.member_since).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }) : 'Unknown'}
      </div>
    </div>
  );
}
