const API_BASE = '/api';

const handleResponse = async (response) => {
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.message || 'Request failed');
    error.response = { data };
    throw error;
  }
  return data;
};

export const register = async (email, password, name) => {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  });
  const data = await handleResponse(response);
  const { user, token } = data.data;
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  return data.data;
};

export const login = async (email, password) => {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await handleResponse(response);
  const { user, token } = data.data;
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  return data.data;
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const getCurrentUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export const isAuthenticated = () => {
  return !!localStorage.getItem('token');
};

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getHabits = async () => {
  const response = await fetch(`${API_BASE}/habits`, {
    headers: { ...getAuthHeaders() },
  });
  const data = await handleResponse(response);
  return data.data;
};

export const getHabit = async (id) => {
  const response = await fetch(`${API_BASE}/habits/${id}`, {
    headers: { ...getAuthHeaders() },
  });
  const data = await handleResponse(response);
  return data.data;
};

export const createHabit = async (habitData) => {
  const response = await fetch(`${API_BASE}/habits`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(habitData),
  });
  const data = await handleResponse(response);
  return data.data;
};

export const updateHabit = async (id, habitData) => {
  const response = await fetch(`${API_BASE}/habits/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(habitData),
  });
  const data = await handleResponse(response);
  return data.data;
};

export const deleteHabit = async (id) => {
  const response = await fetch(`${API_BASE}/habits/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  });
  const data = await handleResponse(response);
  return data.data;
};

export const completeHabit = async (id, completedDate = null) => {
  const date = completedDate || new Date().toISOString().split('T')[0];
  const response = await fetch(`${API_BASE}/habits/${id}/logs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ completed_date: date }),
  });
  const data = await handleResponse(response);
  return data.data;
};

export const getHabitLogs = async (habitId, month = null) => {
  let url = `${API_BASE}/habits/${habitId}/logs`;
  if (month) {
    const [year, m] = month.split('-');
    const fromDate = `${year}-${m}-01`;
    const lastDay = new Date(year, m, 0).getDate();
    const toDate = `${year}-${m}-${String(lastDay).padStart(2, '0')}`;
    url += `?from_date=${fromDate}&to_date=${toDate}`;
  }
  const response = await fetch(url, {
    headers: { ...getAuthHeaders() },
  });
  const data = await handleResponse(response);
  return data.data;
};

export const deleteLog = async (habitId, logId) => {
  const response = await fetch(`${API_BASE}/logs/${logId}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  });
  const data = await handleResponse(response);
  return data.data;
};

export const getStats = async () => {
  const response = await fetch(`${API_BASE}/stats`, {
    headers: { ...getAuthHeaders() },
  });
  const data = await handleResponse(response);
  return data.data;
};

export const getCategories = async () => {
  const response = await fetch(`${API_BASE}/habits/categories`, {
    headers: { ...getAuthHeaders() },
  });
  const data = await handleResponse(response);
  return data.data;
};

// ============================================
// SOCIAL FEATURES API
// ============================================

// Buddies API
export const getBuddies = async () => {
  const response = await fetch(`${API_BASE}/buddies`, {
    headers: { ...getAuthHeaders() },
  });
  const data = await handleResponse(response);
  return data.data;
};

export const getBuddyRequests = async () => {
  const response = await fetch(`${API_BASE}/buddies/requests`, {
    headers: { ...getAuthHeaders() },
  });
  const data = await handleResponse(response);
  return data.data;
};

export const sendBuddyRequest = async (email) => {
  const response = await fetch(`${API_BASE}/buddies/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ email }),
  });
  const data = await handleResponse(response);
  return data.data;
};

export const acceptBuddyRequest = async (requestId) => {
  const response = await fetch(`${API_BASE}/buddies/${requestId}/accept`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
  });
  return handleResponse(response);
};

export const declineBuddyRequest = async (requestId) => {
  const response = await fetch(`${API_BASE}/buddies/${requestId}/decline`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
  });
  return handleResponse(response);
};

export const removeBuddy = async (buddyId) => {
  const response = await fetch(`${API_BASE}/buddies/${buddyId}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  });
  return handleResponse(response);
};

export const searchUsers = async (query) => {
  const response = await fetch(`${API_BASE}/buddies/search/users?q=${encodeURIComponent(query)}`, {
    headers: { ...getAuthHeaders() },
  });
  const data = await handleResponse(response);
  return data.data;
};

export const addBuddyComment = async (buddyId, type, content, emoji) => {
  const response = await fetch(`${API_BASE}/buddies/${buddyId}/comment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ type, content, emoji }),
  });
  return handleResponse(response);
};

export const getBuddyComments = async (buddyId) => {
  const response = await fetch(`${API_BASE}/buddies/${buddyId}/comments`, {
    headers: { ...getAuthHeaders() },
  });
  const data = await handleResponse(response);
  return data.data;
};

// Profiles API
export const getProfile = async (username) => {
  const response = await fetch(`${API_BASE}/profiles/${encodeURIComponent(username)}`, {
    headers: { ...getAuthHeaders() },
  });
  const data = await handleResponse(response);
  return data.data;
};

export const getMyProfileSettings = async () => {
  const response = await fetch(`${API_BASE}/profiles/settings/me`, {
    headers: { ...getAuthHeaders() },
  });
  const data = await handleResponse(response);
  return data.data;
};

export const updateProfileSettings = async (settings) => {
  const response = await fetch(`${API_BASE}/profiles/settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(settings),
  });
  const data = await handleResponse(response);
  return data.data;
};

// XP & Badges API
export const getXPInfo = async () => {
  const response = await fetch(`${API_BASE}/xp`, {
    headers: { ...getAuthHeaders() },
  });
  const data = await handleResponse(response);
  return data.data;
};

export const getXPHistory = async (limit = 50) => {
  const response = await fetch(`${API_BASE}/xp/history?limit=${limit}`, {
    headers: { ...getAuthHeaders() },
  });
  const data = await handleResponse(response);
  return data.data;
};

export const getBadges = async () => {
  const response = await fetch(`${API_BASE}/xp/badges`, {
    headers: { ...getAuthHeaders() },
  });
  const data = await handleResponse(response);
  return data.data;
};

// Group Habits API
export const getGroups = async () => {
  const response = await fetch(`${API_BASE}/groups`, {
    headers: { ...getAuthHeaders() },
  });
  const data = await handleResponse(response);
  return data.data;
};

export const getGroup = async (groupId) => {
  const response = await fetch(`${API_BASE}/groups/${groupId}`, {
    headers: { ...getAuthHeaders() },
  });
  const data = await handleResponse(response);
  return data.data;
};

export const createGroup = async (groupData) => {
  const response = await fetch(`${API_BASE}/groups`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(groupData),
  });
  const data = await handleResponse(response);
  return data.data;
};

export const joinGroup = async (groupId) => {
  const response = await fetch(`${API_BASE}/groups/${groupId}/join`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
  });
  return handleResponse(response);
};

export const leaveGroup = async (groupId) => {
  const response = await fetch(`${API_BASE}/groups/${groupId}/leave`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
  });
  return handleResponse(response);
};

export const completeGroupHabit = async (groupId, date = null) => {
  const response = await fetch(`${API_BASE}/groups/${groupId}/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(date ? { date } : {}),
  });
  return handleResponse(response);
};

export const searchGroups = async (query = '', category = '') => {
  let url = `${API_BASE}/groups/search/all?`;
  if (query) url += `q=${encodeURIComponent(query)}&`;
  if (category) url += `category=${category}`;
  const response = await fetch(url, {
    headers: { ...getAuthHeaders() },
  });
  const data = await handleResponse(response);
  return data.data;
};

export const getGroupHistory = async (groupId, days = 30) => {
  const response = await fetch(`${API_BASE}/groups/${groupId}/history?days=${days}`, {
    headers: { ...getAuthHeaders() },
  });
  const data = await handleResponse(response);
  return data.data;
};

export const deleteGroup = async (groupId) => {
  const response = await fetch(`${API_BASE}/groups/${groupId}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  });
  return handleResponse(response);
};

// Leaderboard API
export const getLeaderboard = async (type = 'all', category = '') => {
  let url = `${API_BASE}/leaderboard?type=${type}`;
  if (category) url += `&category=${category}`;
  const response = await fetch(url, {
    headers: { ...getAuthHeaders() },
  });
  const data = await handleResponse(response);
  return data.data;
};

export const getWeeklyLeaderboard = async () => {
  const response = await fetch(`${API_BASE}/leaderboard/weekly`, {
    headers: { ...getAuthHeaders() },
  });
  const data = await handleResponse(response);
  return data.data;
};

export const getMonthlyLeaderboard = async () => {
  const response = await fetch(`${API_BASE}/leaderboard/monthly`, {
    headers: { ...getAuthHeaders() },
  });
  const data = await handleResponse(response);
  return data.data;
};

export const getStreakLeaderboard = async () => {
  const response = await fetch(`${API_BASE}/leaderboard/streaks`, {
    headers: { ...getAuthHeaders() },
  });
  const data = await handleResponse(response);
  return data.data;
};

export const getCategoryLeaderboard = async (category) => {
  const response = await fetch(`${API_BASE}/leaderboard/categories/${category}`, {
    headers: { ...getAuthHeaders() },
  });
  const data = await handleResponse(response);
  return data.data;
};

export const getMyLeaderboardStats = async () => {
  const response = await fetch(`${API_BASE}/leaderboard/me`, {
    headers: { ...getAuthHeaders() },
  });
  const data = await handleResponse(response);
  return data.data;
};

// Shared Habits API
export const getSharedHabits = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.category) params.append('category', filters.category);
  if (filters.sort) params.append('sort', filters.sort);
  if (filters.search) params.append('search', filters.search);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.offset) params.append('offset', filters.offset);
  
  const url = `${API_BASE}/shared?${params.toString()}`;
  const response = await fetch(url, {
    headers: { ...getAuthHeaders() },
  });
  const data = await handleResponse(response);
  return data.data;
};

export const getMySharedHabits = async () => {
  const response = await fetch(`${API_BASE}/shared/my`, {
    headers: { ...getAuthHeaders() },
  });
  const data = await handleResponse(response);
  return data.data;
};

export const shareHabit = async (habitId, title, description = '') => {
  const response = await fetch(`${API_BASE}/shared/habit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ habit_id: habitId, title, description }),
  });
  const data = await handleResponse(response);
  return data.data;
};

export const shareCustomHabit = async (habitData) => {
  const response = await fetch(`${API_BASE}/shared/habit/custom`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(habitData),
  });
  const data = await handleResponse(response);
  return data.data;
};

export const importSharedHabit = async (sharedHabitId) => {
  const response = await fetch(`${API_BASE}/shared/${sharedHabitId}/import`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
  });
  const data = await handleResponse(response);
  return data.data;
};

export const rateSharedHabit = async (sharedHabitId, rating) => {
  const response = await fetch(`${API_BASE}/shared/${sharedHabitId}/rate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ rating }),
  });
  const data = await handleResponse(response);
  return data.data;
};

export const shareCollection = async (title, description, habits) => {
  const response = await fetch(`${API_BASE}/shared/collection`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ title, description, habits }),
  });
  const data = await handleResponse(response);
  return data.data;
};

export const getSharedCollections = async (search = '', sort = 'popular') => {
  const url = `${API_BASE}/shared/collections?search=${encodeURIComponent(search)}&sort=${sort}`;
  const response = await fetch(url, {
    headers: { ...getAuthHeaders() },
  });
  const data = await handleResponse(response);
  return data.data;
};

export const importCollection = async (collectionId) => {
  const response = await fetch(`${API_BASE}/shared/collection/${collectionId}/import`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
  });
  const data = await handleResponse(response);
  return data.data;
};
