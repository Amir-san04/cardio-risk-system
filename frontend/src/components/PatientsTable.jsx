import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPatients } from '../services/api';
import useAuthStore from '../store/authStore';

export default function PatientsTable() {
  // Приводим роль к нижнему регистру для надежности
  const role = useAuthStore((state) => state.role?.toLowerCase() || 'guest');
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getPatients();
        
        // ПРОВЕРКА: если бэкенд возвращает { patients: [...] }, берем поле.
        // Если возвращает сразу массив [...], берем его целиком.
        const patientsList = Array.isArray(data) ? data : (data.patients || []);
        setPatients(patientsList);
      } catch (err) {
        setError('Не удалось загрузить список пациентов');
        console.error('Fetch patients error:', err);
      } finally {
        setLoading(false);
      }
    };

    // Доступ разрешен только врачам и админам
    if (role === 'doctor' || role === 'admin') {
      fetchPatients();
    }
  }, [role]);

  if (loading) return <div className="text-center py-10 text-gray-500">Загрузка списка пациентов...</div>;
  
  if (error) return (
    <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg text-center my-4">
      {error}
    </div>
  );

  const riskColor = (risk) => {
    const r = risk?.toLowerCase();
    if (r === 'high' || r === 'высокий') return 'bg-red-100 text-red-800 border border-red-200';
    if (r === 'medium' || r === 'средний') return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
    return 'bg-green-100 text-green-800 border border-green-200';
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 mt-8 border border-gray-100">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Реестр пациентов</h2>
        <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-full">
          ВСЕГО: {patients.length}
        </span>
      </div>

      {patients.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-xl">
            <p className="text-gray-400">Активных записей пациентов не найдено</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Пациент</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Возраст</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Риск</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действия</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {patients.map((patient) => (
                <tr key={patient.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{patient.full_name}</div>
                    <div className="text-xs text-gray-500">{patient.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {patient.birth_date
                      ? new Date().getFullYear() - new Date(patient.birth_date).getFullYear()
                      : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${riskColor(patient.risk_level)}`}>
                      {patient.risk_level || 'Не определен'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link
                      to={`/risk-assessment?patientId=${patient.id}`}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      Прогноз
                    </Link>
                    <Link
                      to={`/patients/${patient.id}`}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      Карта
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