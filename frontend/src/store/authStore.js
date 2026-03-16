import { create } from 'zustand';
import { jwtDecode } from 'jwt-decode';

const useAuthStore = create((set) => ({
  token: localStorage.getItem('token') || null,
  user: null,
  role: null,

  login: (token) => {
    localStorage.setItem('token', token);
    const decoded = jwtDecode(token);
    const role = decoded.role || 'patient'; // из payload JWT
    set({ token, role, user: { email: decoded.sub } });
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ token: null, role: null, user: null });
  },

  isAuthenticated: () => !!localStorage.getItem('token'),

  // Инициализация при загрузке страницы
  init: () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const role = decoded.role || 'patient';
        set({ token, role, user: { email: decoded.sub } });
      } catch (e) {
        localStorage.removeItem('token');
      }
    }
  },
}));

export default useAuthStore;