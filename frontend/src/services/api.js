import axios from 'axios';
import useAuthStore from '../store/authStore';

// Берем URL из переменных окружения или используем локальный адрес по умолчанию
const CORE_BASE_URL = import.meta.env.VITE_CORE_API_URL || 'http://localhost:8000';

// 1. Создаём инстанс с базовыми настройками
const api = axios.create({
  baseURL: CORE_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 2. Настройка интерцептора запросов для передачи токена
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    // Проверяем, не является ли запрос публичным (логин или регистрация)
    const isPublic = config.url.includes('/token') || config.url.includes('/register');
    
    if (token && !isPublic) {
      // Добавляем заголовок авторизации, который требует твой main.py (HTTPBearer)
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 3. Настройка интерцептора ответов для обработки ошибок 401/403
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Если бэкенд вернул 401 (токен истек) или 403 (нет прав)
    if (error.response?.status === 401 || error.response?.status === 403) {
      useAuthStore.getState().logout(); // Очищаем состояние в authStore
      if (window.location.pathname !== '/login') {
        window.location.href = '/login?session_expired=true';
      }
    }
    return Promise.reject(error);
  }
);

// 4. Экспорт функций для работы с эндпоинтами из main.py

export const login = async (email, password) => {
  const res = await api.post('/token', { email, password });
  return res.data; 
};

export const register = async (userData) => {
  const res = await api.post('/register', userData);
  return res.data;
};

export const getPatients = async () => {
  const res = await api.get('/patients');
  return res.data;
};

export const getCurrentUser = async () => {
  const res = await api.get('/me');
  return res.data;
};

export const getExaminations = async () => {
  const res = await api.get('/examinations');
  return res.data;
};

// Функция, которую будет использовать твоя новая модалка
export const createExamination = async (data) => {
  const res = await api.post('/examinations', data);
  return res.data;
};

export const getExamination = async (examId) => {
  const res = await api.get(`/examinations/${examId}`);
  return res.data;
};

// Загрузка файлов (DICOM/PDF)
export const uploadDicom = async (examinationId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post(`/examinations/${examinationId}/upload-file`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

// Тот самый запрос на предсказание ИИ
export const requestPrediction = async (examinationId, predictionData) => {
  const res = await api.post(`/examinations/${examinationId}/predict`, predictionData);
  return res.data;
};

export default api;