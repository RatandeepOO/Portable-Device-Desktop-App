import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://10.65.150.39:8000';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const apiService = {
  login: async (email, password) => {
    const response = await api.post('/api/auth/login', { email, password });
    return response.data;
  },

  register: async (email, password, name, phone) => {
    const response = await api.post('/api/auth/register', { email, password, name, phone });
    return response.data;
  },

  getAlerts: async () => {
    const response = await api.get('/api/alerts');
    return response.data;
  },

  getDevices: async () => {
    const response = await api.get('/api/devices');
    return response.data;
  }
};

export { api };