// frontend/src/pages/RiskAssessment.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getExaminations,
  requestPrediction,
} from '../services/api';
import useAuthStore from '../store/authStore';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import DicomUploader from '../components/DicomUploader';

const COLORS = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#10b981',
};

export default function RiskAssessment() {
  const { examId } = useParams(); 
  const navigate = useNavigate();
  const { role, isAuthenticated } = useAuthStore();

  const [examinations, setExaminations] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [formData, setFormData] = useState({
    age: '',
    sex: '',
    cholesterol: '',
    fbs: 0,
    restecg: 0,
  });
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }

    const fetchExams = async () => {
      try {
        const data = await getExaminations();
        // Защита: гарантируем, что у нас массив
        const examsList = Array.isArray(data) ? data : (data?.examinations || []);
        setExaminations(examsList);

        if (examId) {
          const found = examsList.find((e) => e.id === Number(examId));
          if (found) {
            setSelectedExam(found);
            if (found.patient?.birth_date) {
              const age = new Date().getFullYear() - new Date(found.patient.birth_date).getFullYear();
              setFormData((prev) => ({ ...prev, age: String(age) }));
            }
            if (found.patient?.gender) {
              setFormData((prev) => ({ ...prev, sex: found.patient.gender === 'M' ? '1' : '0' }));
            }
          } else {
            setError('Обследование не найдено');
          }
        }
      } catch (err) {
        setError('Не удалось загрузить обследования');
        console.error(err);
      }
    };

    fetchExams();
  }, [examId, isAuthenticated, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'fbs' || name === 'restecg' ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedExam) {
      setError('Сначала выберите обследование');
      return;
    }

    setLoading(true);
    setError(null);
    setPrediction(null);

    try {
      const result = await requestPrediction(selectedExam.id, {
        age: Number(formData.age),
        sex: Number(formData.sex),
        cholesterol: Number(formData.cholesterol),
        fbs: Number(formData.fbs),
        restecg: Number(formData.restecg),
      });
      setPrediction(result);
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка при получении прогноза');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'high': return COLORS.high;
      case 'medium': return COLORS.medium;
      default: return COLORS.low;
    }
  };

  const getRiskText = (level) => {
    switch (level?.toLowerCase()) {
      case 'high': return 'Высокий';
      case 'medium': return 'Средний';
      case 'low': return 'Низкий';
      default: return 'Не определен';
    }
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-lg max-w-4xl mx-auto mt-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Оценка кардиориска</h2>

      {!examId && (
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">Выберите обследование</label>
          <select
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
            value={selectedExam?.id || ''}
            onChange={(e) => {
              const found = examinations.find((ex) => ex.id === Number(e.target.value));
              setSelectedExam(found);
              if (found?.patient?.birth_date) {
                const age = new Date().getFullYear() - new Date(found.patient.birth_date).getFullYear();
                setFormData((prev) => ({ ...prev, age: String(age) }));
              }
              if (found?.patient?.gender) {
                setFormData((prev) => ({ ...prev, sex: found.patient.gender === 'M' ? '1' : '0' }));
              }
            }}
          >
            <option value="">— Выберите —</option>
            {examinations.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.exam_type} — Пациент: {exam.patient?.full_name || '—'} ({new Date(exam.exam_date).toLocaleDateString()})
              </option>
            ))}
          </select>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Возраст</label>
          <input
            name="age" type="number" className="w-full p-3 border border-gray-300 rounded-lg"
            value={formData.age} onChange={handleChange} required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Пол</label>
          <select
            name="sex" className="w-full p-3 border border-gray-300 rounded-lg"
            value={formData.sex} onChange={handleChange} required
          >
            <option value="">Выберите</option>
            <option value="1">Мужской</option>
            <option value="0">Женский</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Холестерин (mg/dL)</label>
          <input
            name="cholesterol" type="number" className="w-full p-3 border border-gray-300 rounded-lg"
            value={formData.cholesterol} onChange={handleChange} required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Глюкоза натощак &gt; 120 (fbs)</label>
          <select
            name="fbs" className="w-full p-3 border border-gray-300 rounded-lg"
            value={formData.fbs} onChange={handleChange} required
          >
            <option value={0}>Нет</option>
            <option value={1}>Да</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ЭКГ в покое (restecg)</label>
          <select
            name="restecg" className="w-full p-3 border border-gray-300 rounded-lg"
            value={formData.restecg} onChange={handleChange} required
          >
            <option value={0}>Норма</option>
            <option value={1}>Аномалия ST-T</option>
            <option value={2}>Гипертрофия левого желудочка</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <button
            type="submit" disabled={loading || !selectedExam}
            className={`w-full py-3 px-6 rounded-lg text-white font-medium transition ${
              loading || !selectedExam ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {loading ? 'Расчёт...' : 'Рассчитать риск'}
          </button>
        </div>
      </form>

      {prediction && (
  <div className="mt-10 border-t pt-8">
    <h3 className="text-xl font-semibold text-gray-800 mb-6 text-center">Результат оценки риска</h3>
    
    {/* ИСПРАВЛЕННЫЙ БЛОК ГРАФИКА */}
    <div className="relative w-full" style={{ height: '250px' }}> 
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={[
              { name: 'Риск', value: (prediction.risk_score || 0) * 100 },
              { name: 'Остаток', value: 100 - (prediction.risk_score || 0) * 100 },
            ]}
            cx="50%" 
            cy="100%" 
            startAngle={180} 
            endAngle={0}
            innerRadius="60%" 
            outerRadius="90%" 
            dataKey="value"
            stroke="none"
          >
            <Cell fill={getRiskColor(prediction.risk_level)} />
            <Cell fill="#e5e7eb" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      
      {/* Центрированный текст с процентом */}
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-4">
        <p className="text-5xl font-bold text-gray-900">{Math.round((prediction.risk_score || 0) * 100)}%</p>
        <p className="text-sm text-gray-500 font-medium">вероятность</p>
      </div>
    </div>

    <p className="text-center text-xl font-bold mb-8 mt-4">
      Уровень риска: <span style={{ color: getRiskColor(prediction.risk_level) }}>{getRiskText(prediction.risk_level)}</span>
    </p>

    {/* РЕКОМЕНДАЦИИ (теперь берем из explanation) */}
    {prediction.explanation?.recommendations && (
      <div className="mb-8 bg-blue-50 p-6 rounded-lg border border-blue-100">
        <h4 className="font-bold text-blue-900 mb-3 flex items-center">
          <span className="mr-2">📋</span> Рекомендации:
        </h4>
        <ul className="list-disc pl-6 space-y-2 text-blue-800">
          {prediction.explanation.recommendations.map((rec, i) => (
            <li key={i}>{rec}</li>
          ))}
        </ul>
      </div>
    )}

    {/* АНАЛИЗ ФАКТОРОВ (теперь берем из explanation) */}
    {prediction.explanation?.feature_impacts && (
      <div>
        <h4 className="font-medium text-gray-700 mb-4">Анализ факторов риска:</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {prediction.explanation.feature_impacts.map((item, i) => (
            <div key={i} className="bg-gray-50 p-4 rounded-lg border border-gray-100">
              <p className="font-bold text-gray-500 text-xs uppercase mb-1">{item.feature}</p>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Значение: <b>{item.value}</b></span>
                <span className={`text-sm font-bold ${item.impact > 0 ? 'text-red-500' : 'text-green-600'}`}>
                  {item.impact > 0 ? '↑ Повышает' : '↓ Снижает'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
)}

      {role === 'doctor' && selectedExam && (
        <div className="mt-12 pt-8 border-t">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Прикрепить DICOM-файл</h3>
          <DicomUploader examinationId={selectedExam.id} onUploadSuccess={() => alert('Файл загружен')} />
        </div>
      )}

      {error && <p className="text-red-600 mt-6 text-center font-medium bg-red-50 p-4 rounded-lg">{error}</p>}
    </div>
  );
}