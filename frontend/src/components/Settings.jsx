import { useState, useEffect } from 'react';
import { getMyProfileSettings, updateProfileSettings } from '../api';

export default function Settings({ user }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Form state
  const [isPublic, setIsPublic] = useState(true);
  const [bio, setBio] = useState('');
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await getMyProfileSettings();
      setSettings(data);
      setIsPublic(data.is_public !== 0);
      setBio(data.bio || '');
      setTheme(data.theme || 'dark');
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateProfileSettings({
        is_public: isPublic,
        bio: bio,
        theme: theme
      });
      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
      setMessage('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
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
        <h2 className="text-2xl font-bold gradient-text">Settings</h2>
        <p className="text-gray-400 text-sm mt-1">Manage your account preferences</p>
      </div>

      {/* Success Message */}
      {message && (
        <div className="glass-card p-4 bg-emerald-500/20 border-emerald-500/30">
          <p className="text-emerald-400 text-center">{message}</p>
        </div>
      )}

      {/* Profile Settings */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          👤 Profile Settings
        </h3>
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
        </div>
      </div>

      {/* Appearance Settings */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          🎨 Appearance
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Theme</label>
            <div className="flex gap-3">
              <button
                onClick={() => handleThemeChange('dark')}
                className={`flex-1 p-4 rounded-xl border transition-all ${
                  theme === 'dark'
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="text-2xl mb-1">🌙</div>
                <p className="text-sm font-medium">Dark</p>
                <p className="text-xs text-gray-400">Easy on the eyes</p>
              </button>
              <button
                onClick={() => handleThemeChange('light')}
                className={`flex-1 p-4 rounded-xl border transition-all ${
                  theme === 'light'
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="text-2xl mb-1">☀️</div>
                <p className="text-sm font-medium">Light</p>
                <p className="text-xs text-gray-400">Bright and clean</p>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Account Info */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          🔐 Account
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-white/10">
            <span className="text-gray-400">Email</span>
            <span className="font-medium">{user?.email || 'Not available'}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-white/10">
            <span className="text-gray-400">Name</span>
            <span className="font-medium">{user?.name || 'Not available'}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-400">Member Since</span>
            <span className="font-medium">
              {settings?.stats?.member_since 
                ? new Date(settings.stats.member_since).toLocaleDateString()
                : 'Unknown'}
            </span>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-white/10">
          <button className="w-full py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl font-medium transition-colors">
            Delete Account
          </button>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
