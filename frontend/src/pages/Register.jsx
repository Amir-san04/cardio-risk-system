// frontend/src/pages/Register.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { register } from '../services/api';

export default function Register() {
  const [form, setForm] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'patient',
    phone: '',
    birth_date: '',
    gender: '',
    specialization: '',
    license_number: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Простая валидация
    if (form.password.length < 6) {
      setError('Пароль должен быть не менее 6 символов');
      setLoading(false);
      return;
    }

    try {
      await register(form);
      alert('Регистрация успешна! Теперь войдите в систему.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 px-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-700">CardioRisk</h1>
          <p className="text-gray-600 mt-2">Регистрация нового пользователя</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              name="email"
              type="email"
              required
              value={form.email}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder="example@domain.com"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Пароль * (мин. 6 символов)</label>
            <input
              name="password"
              type="password"
              required
              value={form.password}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ФИО *</label>
            <input
              name="full_name"
              required
              value={form.full_name}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder="Иванов Иван Иванович"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Роль *</label>
            <select
              name="role"
              required
              value={form.role}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              <option value="patient">Пациент</option>
              <option value="doctor">Врач</option>
              <option value="admin">Администратор</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder="+7 (XXX) XXX-XX-XX"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Дата рождения</label>
            <input
              name="birth_date"
              type="date"
              value={form.birth_date}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Пол</label>
            <select
              name="gender"
              value={form.gender}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              <option value="">Не указан</option>
              <option value="M">Мужской</option>
              <option value="F">Женский</option>
            </select>
          </div>

          {form.role === 'doctor' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Специализация</label>
                <input
                  name="specialization"
                  value={form.specialization}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="Кардиолог"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Номер лицензии</label>
                <input
                  name="license_number"
                  value={form.license_number}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="№ 12345"
                />
              </div>
            </>
          )}

          <div className="md:col-span-2 mt-4">
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 rounded-lg text-white font-medium transition ${
                loading
                  ? 'bg-indigo-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800'
              }`}
            >
              {loading ? 'Регистрация...' : 'Зарегистрироваться'}
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Уже есть аккаунт?{' '}
          <a href="/login" className="text-indigo-600 hover:underline font-medium">
            Войти
          </a>
        </p>
      </div>
    </div>
  );
}