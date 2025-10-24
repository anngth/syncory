import { create } from 'zustand';
import { apiClient } from '@/lib/api-client';
import { socketClient } from '@/lib/socket-client';

interface User {
  id: string;
  email: string;
  username: string;
  fullName: string;
  avatar?: string;
  status?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  updateUser: (data: any) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await apiClient.login({ email, password });
      
      // Connect socket
      const token = localStorage.getItem('accessToken');
      if (token) {
        socketClient.connect(token);
      }

      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Login failed',
        isLoading: false,
      });
      throw error;
    }
  },

  register: async (data: any) => {
    try {
      set({ isLoading: true, error: null });
      const response = await apiClient.register(data);
      
      // Connect socket
      const token = localStorage.getItem('accessToken');
      if (token) {
        socketClient.connect(token);
      }

      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Registration failed',
        isLoading: false,
      });
      throw error;
    }
  },

  logout: async () => {
    try {
      await apiClient.logoutUser();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      socketClient.disconnect();
      set({
        user: null,
        isAuthenticated: false,
        error: null,
      });
    }
  },

  fetchUser: async () => {
    try {
      set({ isLoading: true });
      const user = await apiClient.getCurrentUser();
      
      // Connect socket if not connected
      const token = localStorage.getItem('accessToken');
      if (token) {
        socketClient.connect(token);
      }

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  updateUser: async (data: any) => {
    try {
      const updatedUser = await apiClient.updateProfile(data);
      set({ user: updatedUser });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Update failed' });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
