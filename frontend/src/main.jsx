// frontend/src/main.jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';               // ← импортируем основной компонент приложения
import useAuthStore from './store/authStore'; // zustand store

// Инициализация auth при старте приложения
const initAuth = () => {
  useAuthStore.getState().init();
};

// Запускаем инициализацию сразу (до рендера)
initAuth();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />                                 // ← рендерим импортированный App
  </StrictMode>
);