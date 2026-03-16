import { useEffect, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { getExaminations } from '../services/api';
import useAuthStore from '../store/authStore';
import PatientsTable from '../components/PatientsTable';
import DicomUploader from '../components/DicomUploader';
import CreateExaminationModal from '../components/CreateExaminationModal'; // Импорт новой модалки

export default function Dashboard() {
  const role = useAuthStore((state) => state.role?.toLowerCase() || 'guest');
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());

  const [examinations, setExaminations] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false); // Состояние для модалки
  const [stats, setStats] = useState({
    totalPatients: 0,
    highRisk: 0,
    mediumRisk: 0,
    todayAppointments: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Выносим загрузку данных в отдельную функцию, чтобы вызывать её повторно
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await getExaminations();
      const exams = Array.isArray(data) ? data : [];
      setExaminations(exams);

      // Расчет статистики
      const high = exams.filter((e) => e.risk_level?.toLowerCase() === 'high risk').length;
      const medium = exams.filter((e) => e.risk_level?.toLowerCase() === 'medium risk').length;
      const uniquePatients = new Set(exams.map((e) => e.patient_id)).size;

      setStats({
        totalPatients: uniquePatients,
        highRisk: high,
        mediumRisk: medium,
        todayAppointments: exams.length,
      });
    } catch (err) {
      setError('Не удалось загрузить данные. Проверьте соединение с бэкендом.');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (loading && examinations.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка панели...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Клиническая панель</h1>
        
        {/* Кнопка создания доступна врачам и админам */}
        {['doctor', 'admin'].includes(role) && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition shadow-md"
          >
            + Назначить обследование
          </button>
        )}
      </div>

      {/* Карточки статистики */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium">Всего пациентов</p>
          <p className="text-4xl font-bold text-indigo-700 mt-2">{stats.totalPatients}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium">Высокий риск</p>
          <p className="text-4xl font-bold text-red-600 mt-2">{stats.highRisk}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium">Средний риск</p>
          <p className="text-4xl font-bold text-yellow-600 mt-2">{stats.mediumRisk}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium">Приёмов сегодня</p>
          <p className="text-4xl font-bold text-blue-600 mt-2">{stats.todayAppointments}</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {/* Секция DICOM */}
      {role === 'doctor' && (
        <div className="mb-12 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Загрузить DICOM-файл</h2>
          <DicomUploader onUploadSuccess={fetchData} />
        </div>
      )}

      {/* Список последних обследований */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gray-50/50">
          <h2 className="text-xl font-semibold text-gray-800">Последние обследования</h2>
        </div>

        {examinations.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            Нет данных для отображения. Создайте первое обследование.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Пациент</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Дата</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Тип</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Действия</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {examinations.slice(0, 10).map((exam) => (
                  <tr key={exam.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {exam.patient?.full_name || `ID: ${exam.patient_id}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(exam.exam_date).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                        {exam.exam_type || 'General'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link to={`/risk-assessment`} className="text-indigo-600 hover:text-indigo-900 mr-4">
                        Прогноз
                      </Link>
                      <Link to={`/examinations/${exam.id}`} className="text-gray-400 hover:text-gray-600">
                        Детали
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Таблица пациентов */}
      {['doctor', 'admin'].includes(role) && (
        <div className="mt-12">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-gray-800">Управление пациентами</h2>
          </div>
          <PatientsTable />
        </div>
      )}

      {/* Модальное окно */}
      <CreateExaminationModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onCreated={fetchData} // Обновляем данные после создания
      />
    </div>
  );
}