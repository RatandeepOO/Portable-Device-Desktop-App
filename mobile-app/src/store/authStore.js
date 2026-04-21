import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

export const useAuthStore = create((set, get) => ({
  token: null,
  user: null,
  isLoading: true,

  initialize: async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      const storedUser = await AsyncStorage.getItem('user');
      
      if (storedToken && storedUser) {
        set({ token: storedToken, user: JSON.parse(storedUser), isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    const response = await api.login(email, password);
    await AsyncStorage.setItem('token', response.token);
    await AsyncStorage.setItem('user', JSON.stringify(response.user));
    set({ token: response.token, user: response.user });
    return response;
  },

  logout: async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    set({ token: null, user: null });
  },

  updateUser: (updates) => {
    const currentUser = get().user;
    const newUser = { ...currentUser, ...updates };
    AsyncStorage.setItem('user', JSON.stringify(newUser));
    set({ user: newUser });
  }
}));