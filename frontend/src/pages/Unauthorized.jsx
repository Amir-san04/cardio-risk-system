// frontend/src/pages/Unauthorized.jsx
import { Link } from 'react-router-dom';

export default function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <div className="text-9xl text-red-500 mb-6">403</div>
        <h1 className="text-4xl font-bold text-gray-800 mb-4">Доступ запрещён</h1>
        <p className="text-lg text-gray-600 mb-8">
          У вас недостаточно прав для просмотра этой страницы.
        </p>
        <Link
          to="/dashboard"
          className="inline-block px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
        >
          Вернуться на главную
        </Link>
      </div>
    </div>
  );
}