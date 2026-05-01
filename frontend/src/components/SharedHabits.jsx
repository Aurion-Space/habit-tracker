import { useState, useEffect } from 'react';
import { 
  getSharedHabits, 
  getMySharedHabits, 
  shareHabit, 
  importSharedHabit,
  rateSharedHabit,
  shareCollection,
  getSharedCollections,
  importCollection
} from '../api';
import { categories } from '../data/templates';

export default function SharedHabits({ habits, onHabitImported, onRefreshHabits }) {
  const [sharedHabits, setSharedHabits] = useState([]);
  const [myShared, setMyShared] = useState({ habits: [], collections: [] });
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('browse');
  const [filters, setFilters] = useState({ category: '', sort: 'popular', search: '' });
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState(null);
  const [sharing, setSharing] = useState(false);
  const [importing, setImporting] = useState(false);

  // Share form state
  const [shareTitle, setShareTitle] = useState('');
  const [shareDesc, setShareDesc] = useState('');

  // Collection form state
  const [collectionTitle, setCollectionTitle] = useState('');
  const [collectionDesc, setCollectionDesc] = useState('');
  const [selectedHabits, setSelectedHabits] = useState([]);

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [browseData, myData, collectionsData] = await Promise.all([
        getSharedHabits(filters),
        getMySharedHabits(),
        getSharedCollections()
      ]);
      setSharedHabits(browseData.habits || []);
      setMyShared(myData);
      setCollections(collectionsData.collections || []);
    } catch (err) {
      console.error('Failed to load shared habits:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (sharedHabitId) => {
    try {
      setImporting(true);
      const imported = await importSharedHabit(sharedHabitId);
      setSharedHabits(sharedHabits.map(h => 
        h.id === sharedHabitId ? { ...h, imported: true } : h
      ));
      if (onHabitImported) onHabitImported(imported);
      alert('Habit imported successfully! Check your habits list.');
    } catch (err) {
      console.error('Failed to import:', err);
      alert(err.message);
    } finally {
      setImporting(false);
    }
  };

  const handleRate = async (sharedHabitId, rating) => {
    try {
      const result = await rateSharedHabit(sharedHabitId, rating);
      setSharedHabits(sharedHabits.map(h => 
        h.id === sharedHabitId ? { ...h, avg_rating: result.avg_rating, total_ratings: result.total_ratings } : h
      ));
    } catch (err) {
      console.error('Failed to rate:', err);
    }
  };

  const handleShareHabit = async (habitId) => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    try {
      setSharing(true);
      await shareHabit(habitId, shareTitle || habit.name, shareDesc);
      setShowShareModal(false);
      setShareTitle('');
      setShareDesc('');
      loadData();
    } catch (err) {
      console.error('Failed to share:', err);
      alert(err.message);
    } finally {
      setSharing(false);
    }
  };

  const handleShareCustom = async () => {
    try {
      setSharing(true);
      await shareHabit(selectedHabit.id, shareTitle, shareDesc);
      setShowShareModal(false);
      setShareTitle('');
      setShareDesc('');
      setSelectedHabit(null);
      loadData();
    } catch (err) {
      console.error('Failed to share:', err);
      alert(err.message);
    } finally {
      setSharing(false);
    }
  };

  const handleCreateCollection = async () => {
    if (!collectionTitle.trim() || selectedHabits.length === 0) {
      alert('Please provide a title and select at least one habit.');
      return;
    }

    try {
      setSharing(true);
      const habitsData = selectedHabits.map(h => ({
        name: h.name,
        description: h.description || '',
        frequency: h.frequency,
        category: h.category
      }));
      await shareCollection(collectionTitle, collectionDesc, habitsData);
      setShowCollectionModal(false);
      setCollectionTitle('');
      setCollectionDesc('');
      setSelectedHabits([]);
      loadData();
    } catch (err) {
      console.error('Failed to create collection:', err);
      alert(err.message);
    } finally {
      setSharing(false);
    }
  };

  const handleImportCollection = async (collectionId) => {
    try {
      setImporting(true);
      const result = await importCollection(collectionId);
      if (onHabitImported) onHabitImported(result);
      alert(`Successfully imported ${result.imported_count} habits!`);
      loadData();
    } catch (err) {
      console.error('Failed to import collection:', err);
      alert(err.message);
    } finally {
      setImporting(false);
    }
  };

  const toggleHabitSelection = (habit) => {
    setSelectedHabits(prev => 
      prev.find(h => h.id === habit.id)
        ? prev.filter(h => h.id !== habit.id)
        : [...prev, habit]
    );
  };

  const renderStars = (currentRating, interactive = false, habitId = null) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            onClick={() => interactive && habitId && handleRate(habitId, star)}
            className={`text-lg transition-colors ${
              star <= currentRating ? 'text-yellow-400' : 'text-gray-600'
            } ${interactive ? 'hover:text-yellow-300 cursor-pointer' : 'cursor-default'}`}
            disabled={!interactive}
          >
            ★
          </button>
        ))}
      </div>
    );
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
          <h2 className="text-2xl font-bold gradient-text">Shared Habits</h2>
          <p className="text-gray-400 text-sm mt-1">Discover and share habit templates</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCollectionModal(true)}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-colors"
          >
            📚 Share Collection
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10">
        <button
          onClick={() => setActiveTab('browse')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'browse' 
              ? 'text-emerald-400 border-b-2 border-emerald-400' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Browse ({sharedHabits.length})
        </button>
        <button
          onClick={() => setActiveTab('my')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'my' 
              ? 'text-emerald-400 border-b-2 border-emerald-400' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          My Shared ({myShared.total_habits || 0})
        </button>
        <button
          onClick={() => setActiveTab('collections')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'collections' 
              ? 'text-emerald-400 border-b-2 border-emerald-400' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Collections ({collections.length})
        </button>
      </div>

      {/* Browse Tab */}
      {activeTab === 'browse' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-emerald-500"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
              ))}
            </select>
            <select
              value={filters.sort}
              onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
              className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-emerald-500"
            >
              <option value="popular">🔥 Popular</option>
              <option value="recent">🕐 Recent</option>
              <option value="rating">⭐ Top Rated</option>
            </select>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search habits..."
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-emerald-500 flex-1"
            />
          </div>

          {/* Habits Grid */}
          {sharedHabits.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-medium mb-2">No shared habits found</h3>
              <p className="text-gray-400">Be the first to share a habit template!</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sharedHabits.map(habit => (
                <div key={habit.id} className="glass-card p-4 hover:border-emerald-500/30 transition-colors">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center">
                      {getCategoryIcon(habit.habit_category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{habit.title}</h3>
                      <p className="text-xs text-gray-400">by {habit.author_name}</p>
                    </div>
                  </div>

                  <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                    {habit.description || habit.habit_description}
                  </p>

                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs px-2 py-0.5 bg-white/10 rounded-full">
                      {habit.habit_frequency}
                    </span>
                    <div className="flex items-center gap-1">
                      {renderStars(Math.round(habit.avg_rating))}
                      <span className="text-xs text-gray-400">
                        ({habit.total_ratings || 0})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                    <span>📥 {habit.shares} imports</span>
                  </div>

                  <button
                    onClick={() => handleImport(habit.id)}
                    disabled={habit.imported || importing}
                    className={`w-full py-2 rounded-lg font-medium transition-colors ${
                      habit.imported
                        ? 'bg-gray-500/20 text-gray-400 cursor-default'
                        : 'bg-gradient-to-r from-emerald-500 to-green-600 hover:opacity-90'
                    }`}
                  >
                    {habit.imported ? '✓ Imported' : '📥 Import Habit'}
                  </button>

                  {!habit.imported && (
                    <div className="flex justify-center mt-2">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          onClick={() => handleRate(habit.id, star)}
                          className="text-lg text-gray-600 hover:text-yellow-400 transition-colors"
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* My Shared Tab */}
      {activeTab === 'my' && (
        <div className="space-y-6">
          <div>
            <h3 className="font-medium mb-3">Your Shared Habits ({myShared.habits?.length || 0})</h3>
            {myShared.habits?.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <p className="text-gray-400 mb-4">You haven't shared any habits yet.</p>
                <p className="text-sm text-gray-500">Share your habits to help others build better routines!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {myShared.habits?.map(habit => (
                  <div key={habit.id} className="glass-card p-4 flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center">
                      {getCategoryIcon(habit.habit_category)}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{habit.title}</h4>
                      <p className="text-xs text-gray-400">
                        {habit.shares} imports • {renderStars(Math.round(habit.avg_rating))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Share from My Habits */}
          <div>
            <h3 className="font-medium mb-3">Share Your Habits</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {habits.map(habit => {
                const isShared = myShared.habits?.some(s => s.habit_name === habit.name);
                return (
                  <div
                    key={habit.id}
                    className="glass-card p-3 flex items-center gap-3"
                  >
                    <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                      {getCategoryIcon(habit.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{habit.name}</p>
                    </div>
                    {isShared ? (
                      <span className="text-xs text-emerald-400">✓ Shared</span>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedHabit(habit);
                          setShareTitle(habit.name);
                          setShowShareModal(true);
                        }}
                        className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-xs font-medium transition-colors"
                      >
                        Share
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Collections Tab */}
      {activeTab === 'collections' && (
        <div>
          {collections.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-xl font-medium mb-2">No collections yet</h3>
              <p className="text-gray-400">Share a set of habits as a collection!</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {collections.map(collection => (
                <div key={collection.id} className="glass-card p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-xl">
                      📚
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{collection.title}</h3>
                      <p className="text-xs text-gray-400">by {collection.author_name}</p>
                    </div>
                  </div>

                  <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                    {collection.description}
                  </p>

                  <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                    <span>{collection.habits_count || 0} habits</span>
                    <span>📥 {collection.shares} imports</span>
                  </div>

                  <button
                    onClick={() => handleImportCollection(collection.id)}
                    disabled={importing}
                    className="w-full py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 rounded-lg font-medium transition-opacity disabled:opacity-50"
                  >
                    {importing ? 'Importing...' : '📥 Import Collection'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Share Habit Modal */}
      {showShareModal && selectedHabit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Share Habit</h3>
              <button onClick={() => setShowShareModal(false)} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="glass-card p-3 mb-4">
              <p className="text-sm font-medium">{selectedHabit.name}</p>
              <p className="text-xs text-gray-400">{selectedHabit.frequency} • {getCategoryIcon(selectedHabit.category)}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title for sharing</label>
                <input
                  type="text"
                  value={shareTitle}
                  onChange={(e) => setShareTitle(e.target.value)}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description (optional)</label>
                <textarea
                  value={shareDesc}
                  onChange={(e) => setShareDesc(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <button
                onClick={() => handleShareCustom()}
                disabled={sharing || !shareTitle.trim()}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {sharing ? 'Sharing...' : 'Share Habit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Collection Modal */}
      {showCollectionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-lg w-full p-6 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Create Collection</h3>
              <button onClick={() => setShowCollectionModal(false)} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Collection Title</label>
                <input
                  type="text"
                  value={collectionTitle}
                  onChange={(e) => setCollectionTitle(e.target.value)}
                  placeholder="Morning Routine Starter Pack"
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={collectionDesc}
                  onChange={(e) => setCollectionDesc(e.target.value)}
                  rows={2}
                  placeholder="A perfect set of habits to start your day..."
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <p className="text-sm font-medium mb-2">Select habits to include:</p>
              <div className="space-y-2">
                {habits.map(habit => {
                  const isSelected = selectedHabits.some(h => h.id === habit.id);
                  return (
                    <div
                      key={habit.id}
                      onClick={() => toggleHabitSelection(habit)}
                      className={`glass-card p-3 cursor-pointer transition-colors ${
                        isSelected ? 'border-emerald-500/50 bg-emerald-500/10' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-white/30'
                        }`}>
                          {isSelected && '✓'}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{habit.name}</p>
                          <p className="text-xs text-gray-400">{habit.frequency}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleCreateCollection}
              disabled={sharing || !collectionTitle.trim() || selectedHabits.length === 0}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-opacity mt-4"
            >
              {sharing ? 'Creating...' : `Create Collection (${selectedHabits.length} habits)`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
