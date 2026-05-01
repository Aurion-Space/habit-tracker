import { useState, useEffect } from 'react';
import { 
  getBuddies, 
  getBuddyRequests, 
  sendBuddyRequest, 
  acceptBuddyRequest, 
  declineBuddyRequest, 
  removeBuddy,
  searchUsers 
} from '../api';
import { getCategoryIcon } from '../data/templates';

export default function BuddyList({ user }) {
  const [buddies, setBuddies] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('buddies');
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedBuddy, setSelectedBuddy] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [buddiesData, requestsData] = await Promise.all([
        getBuddies(),
        getBuddyRequests()
      ]);
      setBuddies(buddiesData);
      setRequests(requestsData);
    } catch (err) {
      console.error('Failed to load buddies:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (searchQuery.length < 2) return;
    try {
      setSearching(true);
      const results = await searchUsers(searchQuery);
      setSearchResults(results);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (targetUserId, email) => {
    try {
      setSending(true);
      await sendBuddyRequest(email);
      setSearchResults(searchResults.map(r => 
        r.id === targetUserId ? { ...r, request_sent: true } : r
      ));
    } catch (err) {
      console.error('Failed to send request:', err);
      alert(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleAccept = async (requestId) => {
    try {
      await acceptBuddyRequest(requestId);
      await loadData();
    } catch (err) {
      console.error('Failed to accept request:', err);
    }
  };

  const handleDecline = async (requestId) => {
    try {
      await declineBuddyRequest(requestId);
      setRequests(requests.filter(r => r.id !== requestId));
    } catch (err) {
      console.error('Failed to decline request:', err);
    }
  };

  const handleRemove = async (buddyId) => {
    if (!window.confirm('Are you sure you want to remove this buddy?')) return;
    try {
      await removeBuddy(buddyId);
      setBuddies(buddies.filter(b => b.id !== buddyId));
    } catch (err) {
      console.error('Failed to remove buddy:', err);
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold gradient-text">Habit Buddies</h2>
          <p className="text-gray-400 text-sm mt-1">Connect with friends and track progress together</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl font-medium hover:opacity-90 transition-opacity"
        >
          + Add Buddy
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10">
        <button
          onClick={() => setActiveTab('buddies')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'buddies' 
              ? 'text-emerald-400 border-b-2 border-emerald-400' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Buddies ({buddies.length})
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 font-medium transition-colors relative ${
            activeTab === 'requests' 
              ? 'text-emerald-400 border-b-2 border-emerald-400' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Requests ({requests.length})
          {requests.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">
              {requests.length}
            </span>
          )}
        </button>
      </div>

      {/* Buddies List */}
      {activeTab === 'buddies' && (
        <div className="space-y-4">
          {buddies.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🤝</div>
              <h3 className="text-xl font-medium mb-2">No buddies yet</h3>
              <p className="text-gray-400 mb-4">Add friends to see their progress and stay motivated!</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl font-medium hover:opacity-90"
              >
                Find Buddies
              </button>
            </div>
          ) : (
            buddies.map(buddy => (
              <div
                key={buddy.id}
                className="glass-card p-4 hover:border-emerald-500/30 transition-colors cursor-pointer"
                onClick={() => setSelectedBuddy(buddy)}
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-xl font-bold">
                    {buddy.user?.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{buddy.user?.name}</h3>
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
                        Lvl {buddy.stats?.level || 1}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        🔥 {buddy.stats?.current_streak || 0} streak
                      </span>
                      <span>✓ {buddy.stats?.today_completions || 0} today</span>
                      <span>📋 {buddy.stats?.total_habits || 0} habits</span>
                    </div>
                  </div>

                  {/* Streak indicator */}
                  <div className="text-center">
                    <div className={`text-2xl ${
                      (buddy.stats?.current_streak || 0) > 0 ? '🔥' : '💤'
                    }`} />
                    <p className="text-xs text-gray-400">
                      {(buddy.stats?.current_streak || 0) > 0 ? 'Active' : 'Inactive'}
                    </p>
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(buddy.id);
                    }}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                    title="Remove buddy"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Requests List */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {requests.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📬</div>
              <h3 className="text-xl font-medium mb-2">No pending requests</h3>
              <p className="text-gray-400">When someone adds you as a buddy, their request will appear here.</p>
            </div>
          ) : (
            requests.map(request => (
              <div key={request.id} className="glass-card p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-lg font-bold">
                    {request.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{request.name}</h3>
                    <p className="text-sm text-gray-400">{request.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAccept(request.id)}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg font-medium transition-colors"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleDecline(request.id)}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg font-medium transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add Buddy Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Add Buddy</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>

            <p className="text-sm text-gray-400 mb-4">
              Enter your buddy's email address to send them a friend request.
            </p>

            <div className="flex gap-2 mb-4">
              <input
                type="email"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Enter email address..."
                className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={handleSearch}
                disabled={searching || searchQuery.length < 2}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg font-medium disabled:opacity-50 transition-colors"
              >
                {searching ? '...' : 'Find'}
              </button>
            </div>

            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {searchResults.map(result => (
                  <div key={result.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center font-bold">
                      {result.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{result.name}</p>
                      <p className="text-xs text-gray-400">Level {result.level || 1} • {result.total_habits || 0} habits</p>
                    </div>
                    <button
                      onClick={() => handleSendRequest(result.id, result.email)}
                      disabled={sending || result.request_sent}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        result.request_sent
                          ? 'bg-gray-500/20 text-gray-400 cursor-default'
                          : 'bg-emerald-500 hover:bg-emerald-600'
                      }`}
                    >
                      {result.request_sent ? 'Sent ✓' : 'Add'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {searchResults.length === 0 && searchQuery.length >= 2 && !searching && (
              <p className="text-center text-gray-400 py-4">No users found with that email.</p>
            )}
          </div>
        </div>
      )}

      {/* Buddy Detail Modal */}
      {selectedBuddy && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Buddy Profile</h3>
              <button onClick={() => setSelectedBuddy(null)} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-3xl font-bold mx-auto">
                {selectedBuddy.user?.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <h4 className="text-xl font-semibold mt-3">{selectedBuddy.user?.name}</h4>
              <p className="text-gray-400">{selectedBuddy.user?.email}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="glass-card p-4 text-center">
                <div className="text-2xl mb-1">📊</div>
                <div className="text-xl font-bold">{selectedBuddy.stats?.level || 1}</div>
                <div className="text-xs text-gray-400">Level</div>
              </div>
              <div className="glass-card p-4 text-center">
                <div className="text-2xl mb-1">🔥</div>
                <div className="text-xl font-bold">{selectedBuddy.stats?.current_streak || 0}</div>
                <div className="text-xs text-gray-400">Current Streak</div>
              </div>
              <div className="glass-card p-4 text-center">
                <div className="text-2xl mb-1">⭐</div>
                <div className="text-xl font-bold">{selectedBuddy.stats?.total_xp || 0}</div>
                <div className="text-xs text-gray-400">Total XP</div>
              </div>
              <div className="glass-card p-4 text-center">
                <div className="text-2xl mb-1">💯</div>
                <div className="text-xl font-bold">{selectedBuddy.stats?.longest_streak || 0}</div>
                <div className="text-xs text-gray-400">Best Streak</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Today's Completions</span>
                <span className="font-medium">{selectedBuddy.stats?.today_completions || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Total Habits</span>
                <span className="font-medium">{selectedBuddy.stats?.total_habits || 0}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
