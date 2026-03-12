// frontend/src/components/PatientsTable.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPatients } from '../services/api'; // функция из api.js
import useAuthStore from '../store/authStore';

export default function PatientsTable() {
  const { role } = useAuthStore();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        const data = await getPatients(); // GET /patients — возвращает массив пациентов
        setPatients(data.patients || []);
      } catch (err) {
        setError('Не удалось загрузить список пациентов');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    // Только врач или админ может видеть этот компонент
    if (role === 'doctor' || role === 'admin') {
      fetchPatients();
    }
  }, [role]);

  if (loading) return <div className="text-center py-10 text-gray-500">Загрузка пациентов...</div>;
  if (error) return <div className="text-red-600 text-center py-10">{error}</div>;

  const riskColor = (risk) => {
    if (risk === 'high') return 'bg-red-100 text-red-800 border border-red-200';
    if (risk === 'medium') return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
    return 'bg-green-100 text-green-800 border border-green-200';
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mt-8 border border-gray-100">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">
          Список пациентов
        </h2>
        <span className="text-sm text-gray-500">
          Всего: {patients.length}
        </span>
      </div>

      {patients.length === 0 ? (
        <p className="text-gray-500 text-center py-8">Пациентов пока нет</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Имя
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Возраст
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Последний визит
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Уровень риска
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {patients.map((patient) => (
                <tr key={patient.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{patient.full_name}</div>
                    <div className="text-sm text-gray-500">{patient.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {patient.birth_date
                      ? new Date().getFullYear() - new Date(patient.birth_date).getFullYear()
                      : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {/* Можно добавить дату последнего визита из examinations */}
                    5 Feb 2026 (заглушка)
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${riskColor(
                        patient.risk || 'low'
                      )}`}
                    >
                      {patient.risk || 'Низкий'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link
                      to={`/risk-assessment?patientId=${patient.id}`}
                      className="text-indigo-600 hover:text-indigo-900 mr-3"
                    >
                      Прогноз
                    </Link>
                    <Link
                      to={`/examinations?patientId=${patient.id}`}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Обследования
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}