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
  const { examId } = useParams(); // /risk-assessment/:examId (опционально)
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

  // Загрузка списка обследований
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }

    const fetchExams = async () => {
      try {
        const exams = await getExaminations();
        setExaminations(exams);

        // Если в URL есть examId — выбираем его автоматически
        if (examId) {
          const found = exams.find((e) => e.id === Number(examId));
          if (found) {
            setSelectedExam(found);
            // Предзаполняем форму из данных пациента, если они есть
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
      case 'high risk': return COLORS.high;
      case 'medium risk': return COLORS.medium;
      default: return COLORS.low;
    }
  };

  const getRiskText = (level) => {
    switch (level?.toLowerCase()) {
      case 'high risk': return 'Высокий';
      case 'medium risk': return 'Средний';
      default: return 'Низкий';
    }
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-lg max-w-4xl mx-auto mt-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Оценка кардиориска</h2>

      {/* Выбор обследования (если не передан ID в URL) */}
      {!examId && (
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Выберите обследование
          </label>
          <select
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
            value={selectedExam?.id || ''}
            onChange={(e) => {
              const found = examinations.find((ex) => ex.id === Number(e.target.value));
              setSelectedExam(found);
              // Предзаполнение формы
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
                {exam.exam_type} — Пациент: {exam.patient?.full_name || '—'} (
                {new Date(exam.exam_date).toLocaleDateString()})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Форма ввода признаков */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Возраст</label>
          <input
            name="age"
            type="number"
            placeholder="Возраст"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
            value={formData.age}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Пол</label>
          <select
            name="sex"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
            value={formData.sex}
            onChange={handleChange}
            required
          >
            <option value="">Выберите</option>
            <option value="1">Мужской</option>
            <option value="0">Женский</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Холестерин (mg/dL)</label>
          <input
            name="cholesterol"
            type="number"
            placeholder="Холестерин"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
            value={formData.cholesterol}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Глюкоза натощак выше 120 (fbs)
          </label>
          <select
            name="fbs"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
            value={formData.fbs}
            onChange={handleChange}
            required
          >
            <option value={0}>Нет</option>
            <option value={1}>Да</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Результат ЭКГ в покое (restecg)
          </label>
          <select
            name="restecg"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
            value={formData.restecg}
            onChange={handleChange}
            required
          >
            <option value={0}>Норма</option>
            <option value={1}>Аномалия ST-T</option>
            <option value={2}>Гипертрофия левого желудочка</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={loading || !selectedExam}
            className={`w-full py-3 px-6 rounded-lg text-white font-medium transition ${
              loading || !selectedExam ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {loading ? 'Расчёт...' : 'Рассчитать риск'}
          </button>
        </div>
      </form>

      {/* Результат прогноза */}
      {prediction && (
        <div className="mt-10 border-t pt-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-6">Результат оценки риска</h3>

          {/* Gauge */}
          <div className="relative h-64 mb-8">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Риск', value: prediction.risk_score * 100 },
                    { name: 'Остаток', value: 100 - prediction.risk_score * 100 },
                  ]}
                  cx="50%"
                  cy="80%"
                  startAngle={180}
                  endAngle={0}
                  innerRadius="60%"
                  outerRadius="80%"
                  dataKey="value"
                >
                  <Cell fill={getRiskColor(prediction.risk_level)} />
                  <Cell fill="#e5e7eb" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Текст процента поверх графика */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-5xl font-bold text-gray-900">
                  {Math.round(prediction.risk_score * 100)}%
                </p>
              </div>
            </div>
          </div>

          {/* Уровень риска */}
          <p className="text-center text-xl font-bold mb-6">
            Уровень риска:{' '}
            <span className={`font-bold ${getRiskColor(prediction.risk_level)}`}>
              {getRiskText(prediction.risk_level)}
            </span>
          </p>

          {/* Рекомендации */}
          {prediction.explanation?.recommendations?.length > 0 && (
            <div className="mb-8">
              <h4 className="font-medium text-gray-700 mb-3">Рекомендации</h4>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                {prediction.explanation.recommendations.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Feature impacts (если есть) */}
          {prediction.explanation && Object.keys(prediction.explanation).length > 0 && (
            <div>
              <h4 className="font-medium text-gray-700 mb-3">Влияние факторов</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(prediction.explanation).map(([key, value]) => {
                  if (key === 'recommendations') return null;
                  return (
                    <div key={key} className="bg-gray-50 p-4 rounded-lg">
                      <p className="font-medium capitalize">{key.replace('_', ' ')}</p>
                      <p className="text-gray-600">{JSON.stringify(value)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Блок загрузки DICOM (только для врача) */}
      {role === 'doctor' && selectedExam && (
        <div className="mt-12 pt-8 border-t">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            Прикрепить DICOM-файл к этому обследованию
          </h3>
          <DicomUploader
            examinationId={selectedExam.id}
            onUploadSuccess={(data) => {
              alert(`Файл успешно загружен! ID файла: ${data.file_id}`);
              // Можно обновить список файлов обследования здесь
            }}
          />
        </div>
      )}

      {/* Ошибки */}
      {error && (
        <p className="text-red-600 mt-6 text-center font-medium bg-red-50 p-4 rounded-lg">
          {error}
        </p>
      )}
    </div>
  );
}