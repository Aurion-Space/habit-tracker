import { useState, useMemo } from 'react';
import { createHabit, updateHabit } from '../api';
import { categories, getCategoryById, getCategories, searchTemplates } from '../data/templates';

export default function HabitForm({ habit, onClose, onSuccess }) {
  const isEditing = !!habit;
  const [showTemplates, setShowTemplates] = useState(!isEditing);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [name, setName] = useState(habit?.name || '');
  const [description, setDescription] = useState(habit?.description || '');
  const [frequency, setFrequency] = useState(habit?.frequency || 'daily');
  const [category, setCategory] = useState(habit?.category || 'personal');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const filteredTemplates = useMemo(() => {
    let templates = searchTemplates(searchQuery);
    if (selectedCategory !== 'all') {
      templates = templates.filter(t => t.category === selectedCategory);
    }
    return templates;
  }, [searchQuery, selectedCategory]);

  const handleTemplateSelect = (template) => {
    setName(template.name);
    setDescription(template.description);
    setFrequency(template.frequency);
    setCategory(template.category);
    setShowTemplates(false);
    setSearchQuery('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!name.trim()) {
      setError('Habit name is required');
      setLoading(false);
      return;
    }

    try {
      const habitData = { name, description, frequency, category };
      if (isEditing) {
        await updateHabit(habit.id, habitData);
      } else {
        await createHabit(habitData);
      }
      onSuccess();
    } catch (err) {
      setError('Failed to save habit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToForm = () => {
    setShowTemplates(false);
    setName('');
    setDescription('');
    setFrequency('daily');
    setCategory('personal');
  };

  // Template selection view
  if (showTemplates && !isEditing) {
    return (
      <div className="glass-modal" onClick={onClose}>
        <div className="glass-card p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col animate-fade-in" onClick={(e) => e.stopPropagation()}>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold gradient-text">📋 Habit Templates</h2>
            <p className="text-gray-400 mt-1">Choose a pre-built habit or create your own</p>
          </div>

          <div className="flex gap-3 mb-4">
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="glass-input flex-1"
            />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="glass-input w-40"
            >
              <option value="all">All</option>
              {getCategories().map(cat => (
                <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-2">
            {filteredTemplates.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p>No templates found.</p>
              </div>
            ) : (
              filteredTemplates.map((template, index) => {
                const cat = getCategoryById(template.category);
                return (
                  <button
                    key={index}
                    onClick={() => handleTemplateSelect(template)}
                    className="w-full text-left p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-200"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="font-medium">{template.name}</h4>
                        <p className="text-sm text-gray-400 mt-1">{template.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className="px-2 py-1 rounded-lg text-xs"
                          style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                        >
                          {cat.icon}
                        </span>
                        <span className="text-xs text-gray-500 uppercase">{template.frequency}</span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={handleBackToForm} className="flex-1 glass-btn">
              Create Custom
            </button>
            <button onClick={onClose} className="flex-1 glass-btn">
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Add/Edit form view
  return (
    <div className="glass-modal" onClick={onClose}>
      <div className="glass-modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-6 gradient-text">
          {isEditing ? '✏️ Edit Habit' : '✨ Add New Habit'}
        </h2>

        {!isEditing && (
          <button
            type="button"
            onClick={() => setShowTemplates(true)}
            className="w-full glass-btn mb-6 py-4 text-center"
          >
            📋 Choose from Templates
          </button>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm text-gray-300 mb-2">Habit Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Morning meditation"
              className="glass-input"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Category *</label>
            <div className="grid grid-cols-6 gap-2 mb-2">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`p-3 rounded-xl text-xl transition-all duration-200 ${
                    category === cat.id
                      ? 'ring-2 ring-offset-2 ring-offset-black'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: category === cat.id ? `${cat.color}40` : 'rgba(255,255,255,0.05)', '--tw-ring-color': cat.color }}
                  title={cat.name}
                >
                  {cat.icon}
                </button>
              ))}
            </div>
            <p className="text-sm" style={{ color: getCategoryById(category).color }}>
              {getCategoryById(category).icon} {getCategoryById(category).name}
            </p>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional details..."
              className="glass-input resize-none"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Frequency *</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="glass-input"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/30 text-red-200 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 glass-btn">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 glass-btn-primary py-3">
              {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Habit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
