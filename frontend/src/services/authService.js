import api from './api';

const normalizeRole = (role) => String(role || '').trim().toLowerCase();
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const getBackendAuthGoogleUrl = (redirect = '') => {
  const query = redirect ? `?redirect=${encodeURIComponent(redirect)}` : '';
  return `${API_URL}/auth/google${query}`;
};

const normalizeUser = (user) => {
  if (!user || typeof user !== 'object') return user;
  return {
    ...user,
    role: normalizeRole(user.role),
  };
};

const authService = {
  // Register new user
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    if (response.data.success && response.data.data.token) {
      const normalizedUser = normalizeUser(response.data.data.user);
      localStorage.setItem('token', response.data.data.token);
      localStorage.setItem('user', JSON.stringify(normalizedUser));
      response.data.data.user = normalizedUser;
    }
    return response.data;
  },

  // Login user
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    if (response.data.success && response.data.data.token) {
      const normalizedUser = normalizeUser(response.data.data.user);
      localStorage.setItem('token', response.data.data.token);
      localStorage.setItem('user', JSON.stringify(normalizedUser));
      response.data.data.user = normalizedUser;
    }
    return response.data;
  },

  loginWithGoogle: (redirect = '') => {
    window.location.href = getBackendAuthGoogleUrl(redirect);
  },

  handleGoogleCallback: async (token) => {
    if (!token) {
      throw new Error('Missing Google token');
    }

    localStorage.setItem('token', token);
    const response = await api.get('/auth/me');
    if (!response.data?.success || !response.data?.data) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      throw new Error('Invalid user data from Google callback');
    }

    const normalizedUser = normalizeUser(response.data.data);
    localStorage.setItem('user', JSON.stringify(normalizedUser));

    return {
      token,
      user: normalizedUser,
    };
  },

  // Logout user
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  // Get current user
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  // Update profile
  updateProfile: async (profileData) => {
    const response = await api.put('/auth/profile', profileData);
    if (response.data.success) {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...user, ...response.data.data }));
    }
    return response.data;
  },

  // Change password
  changePassword: async (passwordData) => {
    const response = await api.put('/auth/password', passwordData);
    return response.data;
  },

  // Get stored user
  getStoredUser: () => {
    const user = localStorage.getItem('user');
    return user ? normalizeUser(JSON.parse(user)) : null;
  },

  // Get stored token
  getStoredToken: () => {
    return localStorage.getItem('token');
  },

  // Check if authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },
};

export default authService;
