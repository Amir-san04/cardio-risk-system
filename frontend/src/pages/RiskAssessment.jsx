import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getExaminations, requestPrediction } from '../services/api';
import useAuthStore from '../store/authStore';
import DicomUploader from '../components/DicomUploader';

const COLORS = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' };

export default function RiskAssessment() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { role, isAuthenticated } = useAuthStore();

  const [examinations, setExaminations] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    age: '',
    sex: '',
    cp: '0',
    trestbps: '',
    cholesterol: '',
    fbs: '0',
    restecg: '0',
    thalach: '',
    oldpeak: '',
    ca: '0'
  });

  // Хелперы для отображения
  const getRiskColor = (level) => COLORS[level?.toLowerCase()] || COLORS.low;
  const getRiskText = (level) => ({ high: 'Высокий', medium: 'Средний', low: 'Низкий' }[level?.toLowerCase()] || '—');

  useEffect(() => {
    if (!isAuthenticated()) { navigate('/login'); return; }

    const fetchExams = async () => {
      try {
        const data = await getExaminations();
        const examsList = Array.isArray(data) ? data : (data?.examinations || []);
        setExaminations(examsList);

        const currentId = examId || selectedExam?.id;
        if (currentId) {
          const found = examsList.find((e) => e.id === Number(currentId));
          if (found) {
            setSelectedExam(found);
            if (found.patient?.birth_date) {
              const age = new Date().getFullYear() - new Date(found.patient.birth_date).getFullYear();
              setFormData((prev) => ({ ...prev, age: String(age) }));
            }
            if (found.patient?.gender) {
              setFormData((prev) => ({ ...prev, sex: found.patient.gender === 'M' ? '1' : '0' }));
            }
          }
        }
      } catch (err) { setError('Ошибка загрузки списка обследований'); }
    };
    fetchExams();
  }, [examId, isAuthenticated, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const targetId = examId || selectedExam?.id;
    if (!targetId) {
      setError("Выберите обследование из списка");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        age: parseInt(formData.age),
        sex: parseInt(formData.sex),
        cp: parseInt(formData.cp),
        trestbps: parseInt(formData.trestbps),
        cholesterol: parseInt(formData.cholesterol),
        fbs: parseInt(formData.fbs),
        restecg: parseInt(formData.restecg),
        thalach: parseInt(formData.thalach),
        oldpeak: parseFloat(formData.oldpeak),
        ca: parseInt(formData.ca)
      };

      const result = await requestPrediction(targetId, payload);
      setPrediction(result);
    } catch (err) {
      setError("Ошибка ML-сервиса. Убедитесь, что все поля заполнены корректно.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen py-8 px-4 text-left">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-5xl mx-auto">
        
        {/* Шапка */}
        <h2 className="text-3xl font-extrabold text-gray-900 mb-8 flex items-center">
          <span className="bg-indigo-100 text-indigo-600 p-2 rounded-lg mr-4">❤️</span>
          Оценка кардиориска
        </h2>

        {/* Выбор обследования (если ID не в URL) */}
        {!examId && (
          <div className="mb-10 bg-indigo-50 p-6 rounded-xl border border-indigo-100">
            <label className="block text-sm font-bold text-indigo-900 mb-2 uppercase tracking-wider">Выберите обследование</label>
            <select
              className="w-full p-4 border-none rounded-lg shadow-inner focus:ring-2 focus:ring-indigo-500"
              value={selectedExam?.id || ''}
              onChange={(e) => setSelectedExam(examinations.find(ex => ex.id === Number(e.target.value)))}
            >
              <option value="">— Список обследований —</option>
              {examinations.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.exam_type} | {exam.patient?.full_name} ({new Date(exam.exam_date).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Группа 1: Личные данные */}
          <section>
            <h3 className="text-lg font-bold text-gray-700 mb-4 border-b pb-2">1. Личные и базовые данные</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Возраст</label>
                <input name="age" type="number" className="w-full p-3 border rounded-lg" value={formData.age} onChange={handleChange} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Пол</label>
                <select name="sex" className="w-full p-3 border rounded-lg" value={formData.sex} onChange={handleChange} required>
                  <option value="">Выбрать</option>
                  <option value="1">Мужской (1)</option>
                  <option value="0">Женский (0)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Сахар больше 120 (fbs)</label>
                <select name="fbs" className="w-full p-3 border rounded-lg" value={formData.fbs} onChange={handleChange}>
                  <option value="0">Нет (0)</option>
                  <option value="1">Да (1)</option>
                </select>
              </div>
            </div>
          </section>

          {/* Группа 2: Клинические показатели */}
          <section>
            <h3 className="text-lg font-bold text-gray-700 mb-4 border-b pb-2">2. Клинические показатели</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Тип боли (cp)</label>
                <select name="cp" className="w-full p-3 border rounded-lg" value={formData.cp} onChange={handleChange}>
                  <option value="0">Типичная (0)</option>
                  <option value="1">Атипичная (1)</option>
                  <option value="2">Неангинальная (2)</option>
                  <option value="3">Без симптомов (3)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">АД в покое (trestbps)</label>
                <input name="trestbps" type="number" className="w-full p-3 border rounded-lg" value={formData.trestbps} onChange={handleChange} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Холестерин</label>
                <input name="cholesterol" type="number" className="w-full p-3 border rounded-lg" value={formData.cholesterol} onChange={handleChange} required />
              </div>
            </div>
          </section>

          {/* Группа 3: Инструментальные данные */}
          <section>
            <h3 className="text-lg font-bold text-gray-700 mb-4 border-b pb-2">3. Инструментальные данные</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Макс. пульс (thalach)</label>
                <input name="thalach" type="number" className="w-full p-3 border rounded-lg" value={formData.thalach} onChange={handleChange} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-red-600 font-semibold mb-1">ST депрессия (oldpeak)</label>
                <input name="oldpeak" type="number" step="0.1" className="w-full p-3 border-2 border-red-100 rounded-lg" value={formData.oldpeak} onChange={handleChange} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">К-во сосудов (ca)</label>
                <select name="ca" className="w-full p-3 border rounded-lg" value={formData.ca} onChange={handleChange}>
                  <option value="0">0</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                </select>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-600 mb-1">ЭКГ в покое (restecg)</label>
              <select name="restecg" className="w-full p-3 border rounded-lg" value={formData.restecg} onChange={handleChange}>
                <option value="0">Норма (0)</option>
                <option value="1">Аномалия ST-T (1)</option>
                <option value="2">Гипертрофия (2)</option>
              </select>
            </div>
          </section>

          <button
            type="submit" disabled={loading || !selectedExam}
            className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg transition ${
              loading || !selectedExam ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {loading ? 'ИИ анализирует показатели...' : 'Запустить нейронную сеть'}
          </button>
        </form>

        {/* Результаты */}
        {prediction && (
          <div className="mt-12 animate-fade-in">
            <div className="bg-white border-2 border-dashed border-gray-200 p-8 rounded-3xl text-center">
              <p className="text-sm text-gray-500 uppercase tracking-widest mb-2 font-bold">Итоговая вероятность</p>
              <p className="text-6xl font-black mb-4" style={{ color: getRiskColor(prediction.risk_level) }}>
                {Math.round((prediction.risk_score || 0) * 100)}%
              </p>
              <div className="inline-block px-4 py-1 rounded-full text-white font-bold" style={{ backgroundColor: getRiskColor(prediction.risk_level) }}>
                РИСК: {getRiskText(prediction.risk_level).toUpperCase()}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
              <div className="bg-blue-50 p-6 rounded-2xl">
                <h4 className="font-bold text-blue-800 mb-4 flex items-center">
                  <span className="mr-2 text-xl">📋</span> Клинические рекомендации
                </h4>
                <ul className="space-y-3">
                  {prediction.explanation?.recommendations?.map((r, i) => (
                    <li key={i} className="text-blue-700 text-sm flex items-start">
                      <span className="mr-2">•</span> {r}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-gray-50 p-6 rounded-2xl">
                <h4 className="font-bold text-gray-800 mb-4 flex items-center">
                  <span className="mr-2 text-xl">📊</span> Влияние факторов
                </h4>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                  {prediction.explanation?.feature_impacts?.map((item, i) => (
                    <div key={i} className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                      <span className="text-xs font-bold text-gray-500 uppercase">{item.feature}</span>
                      <span className={`text-xs font-black ${item.impact > 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {item.impact > 0 ? '↑' : '↓'} {Math.abs(item.impact).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Блок для врача */}
        {role === 'doctor' && selectedExam && (
          <div className="mt-16 bg-gray-50 p-8 rounded-2xl border-2 border-dashed border-gray-300">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <span className="mr-2">📁</span> DICOM Uploader
            </h3>
            <DicomUploader examinationId={selectedExam.id} onUploadSuccess={() => alert('Снимки загружены')} />
          </div>
        )}

        {error && (
          <div className="mt-8 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
            <p className="text-red-700 font-medium">⚠️ {error}</p>
          </div>
        )}
      </div>
    </div>
  );
}