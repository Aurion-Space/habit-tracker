import { useState, useEffect } from 'react';
import { 
  getGroups, 
  createGroup, 
  joinGroup, 
  leaveGroup, 
  completeGroupHabit,
  searchGroups,
  getGroup,
  deleteGroup
} from '../api';
import { categories } from '../data/templates';

export default function GroupHabits({ user, onHabitCreated }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBrowseModal, setShowBrowseModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [browseResults, setBrowseResults] = useState([]);
  const [browseQuery, setBrowseQuery] = useState('');
  const [browseCategory, setBrowseCategory] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  // Create form state
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupCategory, setNewGroupCategory] = useState('personal');

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const data = await getGroups();
      setGroups(data);
    } catch (err) {
      console.error('Failed to load groups:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    try {
      setCreating(true);
      const newGroup = await createGroup({
        name: newGroupName,
        description: newGroupDesc,
        category: newGroupCategory
      });
      setGroups([newGroup, ...groups]);
      setShowCreateModal(false);
      setNewGroupName('');
      setNewGroupDesc('');
      setNewGroupCategory('personal');
    } catch (err) {
      console.error('Failed to create group:', err);
      alert(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleJoinGroup = async (groupId) => {
    try {
      setJoining(true);
      await joinGroup(groupId);
      await loadGroups();
      setBrowseResults(browseResults.filter(g => g.id !== groupId));
    } catch (err) {
      console.error('Failed to join group:', err);
      alert(err.message);
    } finally {
      setJoining(false);
    }
  };

  const handleLeaveGroup = async (groupId) => {
    if (!window.confirm('Are you sure you want to leave this group?')) return;
    try {
      await leaveGroup(groupId);
      setGroups(groups.filter(g => g.id !== groupId));
    } catch (err) {
      console.error('Failed to leave group:', err);
      alert(err.message);
    }
  };

  const handleCompleteGroup = async (groupId) => {
    try {
      await completeGroupHabit(groupId);
      await loadGroups();
      if (selectedGroup) {
        const updated = await getGroup(groupId);
        setSelectedGroup(updated);
      }
    } catch (err) {
      console.error('Failed to complete group habit:', err);
      alert(err.message);
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm('Are you sure you want to delete this group? This cannot be undone.')) return;
    try {
      await deleteGroup(groupId);
      setGroups(groups.filter(g => g.id !== groupId));
      setSelectedGroup(null);
    } catch (err) {
      console.error('Failed to delete group:', err);
      alert(err.message);
    }
  };

  const handleBrowse = async () => {
    try {
      const results = await searchGroups(browseQuery, browseCategory);
      setBrowseResults(results);
    } catch (err) {
      console.error('Failed to search groups:', err);
    }
  };

  const handleViewGroup = async (groupId) => {
    try {
      const group = await getGroup(groupId);
      setSelectedGroup(group);
    } catch (err) {
      console.error('Failed to load group:', err);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold gradient-text">Group Habits</h2>
          <p className="text-gray-400 text-sm mt-1">Build habits together with friends</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBrowseModal(true)}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-colors"
          >
            🔍 Find Groups
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            + Create Group
          </button>
        </div>
      </div>

      {/* My Groups */}
      {groups.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-xl font-medium mb-2">No group habits yet</h3>
          <p className="text-gray-400 mb-4">Create or join a group to track habits with friends!</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => setShowBrowseModal(true)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-colors"
            >
              Find Groups
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl font-medium hover:opacity-90"
            >
              Create Group
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {groups.map(group => (
            <div
              key={group.id}
              className="glass-card p-5 hover:border-emerald-500/30 transition-colors cursor-pointer"
              onClick={() => handleViewGroup(group.id)}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center text-xl">
                  {getCategoryIcon(group.category)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{group.name}</h3>
                    {group.is_creator && (
                      <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                        Owner
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mt-0.5 line-clamp-1">
                    {group.description || 'No description'}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="text-gray-400">👥 {group.member_count} members</span>
                    <span className="text-gray-400">📊 {group.completion_rate_7d}%</span>
                    <span className={group.group_streak > 0 ? 'text-orange-400' : 'text-gray-400'}>
                      🔥 {group.group_streak} streak
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCompleteGroup(group.id);
                    }}
                    disabled={group.my_completed_today}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      group.my_completed_today
                        ? 'bg-emerald-500 text-white'
                        : 'bg-white/10 hover:bg-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    {group.my_completed_today ? '✓' : '○'}
                  </button>
                  <span className="text-xs text-gray-400">
                    {group.my_completed_today ? 'Done!' : 'Mark'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Create Group Habit</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Group Name</label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Morning Workout Squad"
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description (optional)</label>
                <textarea
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="We track our morning workout habits together..."
                  rows={3}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  value={newGroupCategory}
                  onChange={(e) => setNewGroupCategory(e.target.value)}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-emerald-500"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={creating || !newGroupName.trim()}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {creating ? 'Creating...' : 'Create Group'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Browse Groups Modal */}
      {showBrowseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-lg w-full p-6 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Find Groups</h3>
              <button onClick={() => setShowBrowseModal(false)} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={browseQuery}
                onChange={(e) => setBrowseQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleBrowse()}
                placeholder="Search groups..."
                className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-emerald-500"
              />
              <select
                value={browseCategory}
                onChange={(e) => setBrowseCategory(e.target.value)}
                className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-emerald-500"
              >
                <option value="">All</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.icon}</option>
                ))}
              </select>
              <button
                onClick={handleBrowse}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg font-medium transition-colors"
              >
                Search
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {browseResults.length === 0 ? (
                <p className="text-center text-gray-400 py-8">
                  Search for groups to join. Share the group code with friends!
                </p>
              ) : (
                browseResults.map(group => (
                  <div key={group.id} className="glass-card p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center">
                        {getCategoryIcon(group.category)}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{group.name}</h4>
                        <p className="text-xs text-gray-400">by {group.creator_name} • {group.member_count} members</p>
                      </div>
                      <button
                        onClick={() => handleJoinGroup(group.id)}
                        disabled={joining}
                        className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                      >
                        {joining ? '...' : 'Join'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Group Detail Modal */}
      {selectedGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">{selectedGroup.name}</h3>
              <button onClick={() => setSelectedGroup(null)} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>

            <p className="text-gray-400 mb-4">{selectedGroup.description || 'No description'}</p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="glass-card p-3 text-center">
                <div className="text-xl font-bold">{selectedGroup.member_count}</div>
                <div className="text-xs text-gray-400">Members</div>
              </div>
              <div className="glass-card p-3 text-center">
                <div className="text-xl font-bold">{selectedGroup.completion_rate_7d}%</div>
                <div className="text-xs text-gray-400">7-Day Rate</div>
              </div>
              <div className="glass-card p-3 text-center">
                <div className="text-xl font-bold flex items-center justify-center gap-1">
                  🔥 {selectedGroup.group_streak}
                </div>
                <div className="text-xs text-gray-400">Group Streak</div>
              </div>
            </div>

            {/* Today's Status */}
            <div className="mb-6">
              <h4 className="font-medium mb-2">Today's Progress</h4>
              <div className="flex flex-wrap gap-2">
                {selectedGroup.members?.map(member => (
                  <div
                    key={member.user_id}
                    className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${
                      member.completed_today
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-white/10 text-gray-400'
                    }`}
                  >
                    {member.completed_today ? '✓' : '○'} {member.name}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => handleCompleteGroup(selectedGroup.id)}
                className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
                  selectedGroup.members?.find(m => m.user_id === user?.id)?.completed_today
                    ? 'bg-emerald-500/20 text-emerald-400 cursor-default'
                    : 'bg-gradient-to-r from-emerald-500 to-green-600 hover:opacity-90'
                }`}
              >
                {selectedGroup.members?.find(m => m.user_id === user?.id)?.completed_today
                  ? '✓ Completed Today!'
                  : 'Mark as Complete'}
              </button>
              {!selectedGroup.is_creator && (
                <button
                  onClick={() => handleLeaveGroup(selectedGroup.id)}
                  className="px-4 py-3 bg-red-500/20 text-red-400 rounded-xl font-medium hover:bg-red-500/30 transition-colors"
                >
                  Leave
                </button>
              )}
              {selectedGroup.is_creator && (
                <button
                  onClick={() => handleDeleteGroup(selectedGroup.id)}
                  className="px-4 py-3 bg-red-500/20 text-red-400 rounded-xl font-medium hover:bg-red-500/30 transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
