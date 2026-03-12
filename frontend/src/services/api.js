// frontend/src/services/api.js
import axios from 'axios';
import useAuthStore from '../store/authStore'; // из предыдущего шага

const CORE_BASE_URL = import.meta.env.VITE_CORE_API_URL || 'http://localhost:8000';

// Создаём инстанс axios для core-service
const api = axios.create({
  baseURL: CORE_BASE_URL,
  timeout: 30000, // 30 секунд на запрос (загрузка DICOM может быть долгой)
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getPatients = async () => {
  const res = await api.get('/patients');
  return res.data;
};

// Интерцептор запросов — добавляем Bearer токен автоматически
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Интерцептор ответов — обработка 401 (токен истёк или недействителен)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Автоматический logout
      useAuthStore.getState().logout();
      // Редирект на логин (если не на странице логина уже)
      if (window.location.pathname !== '/login') {
        window.location.href = '/login?session_expired=true';
      }
    }
    return Promise.reject(error);
  }
);

// ======================
// Экспортируемые функции (API методы)
// ======================

// Auth
export const login = async (email, password) => {
  const res = await api.post('/token', { email, password });
  return res.data; // { access_token, token_type, user }
};

export const register = async (userData) => {
  const res = await api.post('/register', userData);
  return res.data;
};

// User
export const getCurrentUser = async () => {
  const res = await api.get('/me');
  return res.data;
};

// Examinations
export const getExaminations = async () => {
  const res = await api.get('/examinations');
  return res.data;
};

export const createExamination = async (data) => {
  const res = await api.post('/examinations', data);
  return res.data;
};

export const getExamination = async (examId) => {
  const res = await api.get(`/examinations/${examId}`);
  return res.data;
};

// Files (DICOM upload)
export const uploadDicom = async (examinationId, file) => {
  const formData = new FormData();
  formData.append('file', file);

  const res = await api.post(`/examinations/${examinationId}/upload-file`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data;
};

export const getExaminationFiles = async (examId) => {
  const res = await api.get(`/examinations/${examId}/files`);
  return res.data;
};

// Prediction
export const requestPrediction = async (examinationId, predictionData) => {
  const res = await api.post(`/examinations/${examinationId}/predict`, predictionData);
  return res.data; // RiskPredictionResponse
};

export const getPredictions = async (examId) => {
  const res = await api.get(`/examinations/${examId}/predictions`);
  return res.data;
};

// Тест соединения (можно удалить потом)
export const testPredictionConnection = async () => {
  const res = await api.get('/predict-test');
  return res.data;
};

export default api;