// frontend/src/pages/Dashboard.jsx
import { useEffect, useState } from 'react';
import { getExaminations, getPatients } from '../services/api'; // новые функции из api.js
import useAuthStore from '../store/authStore';
import DicomUploader from '../components/DicomUploader'; // компонент загрузки ниже
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { role } = useAuthStore();
  const [examinations, setExaminations] = useState([]);
  const [stats, setStats] = useState({
    totalPatients: 0,
    highRisk: 0,
    mediumRisk: 0,
    todayAppointments: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const exams = await getExaminations();
        setExaminations(exams);

        // Простой подсчёт статистики (можно улучшить на бэкенде)
        const high = exams.filter(e => e.risk_level === 'High Risk').length;
        const medium = exams.filter(e => e.risk_level === 'Medium Risk').length;
        // todayAppointments — можно фильтровать по дате, пока заглушка
        setStats({
          totalPatients: new Set(exams.map(e => e.patient_id)).size,
          highRisk: high,
          mediumRisk: medium,
          todayAppointments: exams.length, // заглушка
        });
      } catch (err) {
        setError('Не удалось загрузить данные');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div className="text-center py-10">Загрузка...</div>;
  if (error) return <div className="text-red-600 text-center py-10">{error}</div>;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-8">Клиническая панель</h1>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <p className="text-gray-600 text-sm">Всего пациентов</p>
          <p className="text-4xl font-bold text-indigo-700">{stats.totalPatients}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <p className="text-gray-600 text-sm">Высокий риск</p>
          <p className="text-4xl font-bold text-red-600">{stats.highRisk}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <p className="text-gray-600 text-sm">Средний риск</p>
          <p className="text-4xl font-bold text-yellow-600">{stats.mediumRisk}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <p className="text-gray-600 text-sm">Приёмов сегодня</p>
          <p className="text-4xl font-bold text-blue-600">{stats.todayAppointments}</p>
        </div>
      </div>

      {/* Загрузка DICOM (только для врача) */}
      {role === 'doctor' && (
        <div className="mb-10">
          <h2 className="text-2xl font-semibold mb-4">Загрузить DICOM-файл</h2>
          <DicomUploader onUploadSuccess={(data) => {
            alert('Файл загружен! ID: ' + data.file_id);
            // можно обновить список обследований
          }} />
        </div>
      )}

      {/* Список последних обследований */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Последние обследования</h2>
        {examinations.length === 0 ? (
          <p className="text-gray-500">Нет обследований</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded-lg shadow-md">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Пациент</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Тип</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {examinations.slice(0, 5).map((exam) => (
                  <tr key={exam.id}>
                    <td className="px-6 py-4 whitespace-nowrap">{exam.patient?.full_name || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(exam.exam_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{exam.exam_type}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        to={`/risk-assessment/${exam.id}`}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Подробнее / Прогноз
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
// в конце Dashboard.jsx
{(role === 'doctor' || role === 'admin') && <PatientsTable />}