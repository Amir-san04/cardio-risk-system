// frontend/src/layouts/MainLayout.jsx
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export default function MainLayout({ children }) {
  const { role, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 shadow-sm flex flex-col">
        <div className="p-6 text-2xl font-bold text-indigo-600 border-b">
          CardioRisk
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          <Link
            to="/dashboard"
            className="flex items-center px-3 py-3 text-gray-700 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 transition"
          >
            <span className="mr-3">📊</span> Dashboard
          </Link>

          {(role === 'doctor' || role === 'admin') && (
            <Link
              to="/patients"
              className="flex items-center px-3 py-3 text-gray-700 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 transition"
            >
              <span className="mr-3">👥</span> Пациенты
            </Link>
          )}

          <Link
            to="/risk-assessment"
            className="flex items-center px-3 py-3 text-gray-700 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 transition"
          >
            <span className="mr-3">⚠️</span> Оценка риска
          </Link>

          <Link
            to="/reports"
            className="flex items-center px-3 py-3 text-gray-700 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 transition"
          >
            <span className="mr-3">📈</span> Отчёты
          </Link>

          <Link
            to="/settings"
            className="flex items-center px-3 py-3 text-gray-700 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 transition"
          >
            <span className="mr-3">⚙️</span> Настройки
          </Link>
        </nav>

        <div className="p-4 border-t">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition"
          >
            Выйти
          </button>
        </div>
      </div>

      {/* Основной контент */}
      <div className="flex-1 overflow-auto p-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </div>
    </div>
  );
}