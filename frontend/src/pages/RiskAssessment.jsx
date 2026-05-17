import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getExaminations, requestPrediction } from '../services/api';
import useAuthStore from '../store/authStore';
import DicomUploader from '../components/DicomUploader';
import EcgUpload from '../components/EcgUpload';

const FONT = "'DM Sans', sans-serif";

export default function RiskAssessment() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { role, isAuthenticated } = useAuthStore();

  const [examinations, setExaminations] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('numeric');

  const [formData, setFormData] = useState({
    age:'', sex:'', cp:'0', trestbps:'', cholesterol:'',
    fbs:'0', restecg:'0', thalach:'', oldpeak:'', ca:'0'
  });

  useEffect(() => {
    if (!isAuthenticated()) { navigate('/login'); return; }
    const fetchExams = async () => {
      try {
        const data = await getExaminations();
        const list = Array.isArray(data) ? data : [];
        setExaminations(list);
        if (examId) {
          const found = list.find(e => e.id === Number(examId));
          if (found) {
            setSelectedExam(found);
            if (found.patient?.birth_date) {
              const age = new Date().getFullYear() - new Date(found.patient.birth_date).getFullYear();
              setFormData(p => ({ ...p, age: String(age) }));
            }
            if (found.patient?.gender) {
              setFormData(p => ({ ...p, sex: found.patient.gender === 'M' ? '1' : '0' }));
            }
          }
        }
      } catch { setError('Ошибка загрузки обследований'); }
    };
    fetchExams();
  }, [examId]);

  const handleChange = e => setFormData(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const targetId = examId || selectedExam?.id;
    if (!targetId) { setError('Выберите обследование'); return; }
    setLoading(true); setError(null);
    try {
      const payload = {
        age: parseInt(formData.age), sex: parseInt(formData.sex),
        cp: parseInt(formData.cp), trestbps: parseInt(formData.trestbps),
        cholesterol: parseInt(formData.cholesterol), fbs: parseInt(formData.fbs),
        restecg: parseInt(formData.restecg), thalach: parseInt(formData.thalach),
        oldpeak: parseFloat(formData.oldpeak), ca: parseInt(formData.ca)
      };
      const result = await requestPrediction(targetId, payload);
      setPrediction(result);
    } catch { setError('Ошибка ML-сервиса. Проверьте все поля.'); }
    finally { setLoading(false); }
  };

  const riskCfg = {
    high:   { color:'#dc2626', bg:'#fef2f2', border:'#fecaca', label:'Высокий риск', icon:'🔴' },
    medium: { color:'#d97706', bg:'#fffbeb', border:'#fde68a', label:'Средний риск', icon:'🟡' },
    low:    { color:'#16a34a', bg:'#f0fdf4', border:'#bbf7d0', label:'Низкий риск',  icon:'🟢' },
  };
  const rc = riskCfg[prediction?.risk_level?.toLowerCase()] || riskCfg.low;

  const inp = {
    width:'100%', padding:'0.75rem 1rem', border:'1.5px solid #e2e8f0',
    borderRadius:'10px', fontSize:'0.875rem', outline:'none',
    boxSizing:'border-box', fontFamily:FONT, color:'#0f172a', background:'white'
  };
  const lbl = { display:'block', fontSize:'0.78rem', fontWeight:600, color:'#475569', marginBottom:'0.4rem' };

  const Field = ({ label, name, type='number', children, ...rest }) => (
    <div>
      <label style={lbl}>{label}</label>
      {children || (
        <input name={name} type={type} value={formData[name]} onChange={handleChange}
          style={inp} required={rest.required}
          onFocus={e=>e.target.style.borderColor='#1a6bb5'}
          onBlur={e=>e.target.style.borderColor='#e2e8f0'} {...rest} />
      )}
    </div>
  );

  const Select = ({ label, name, options }) => (
    <div>
      <label style={lbl}>{label}</label>
      <select name={name} value={formData[name]} onChange={handleChange} style={inp}>
        {options.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );

  return (
    <div style={{ fontFamily:FONT, maxWidth:'960px', margin:'0 auto' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');`}</style>

      {/* Header */}
      <div style={{ marginBottom:'1.75rem' }}>
        <h1 style={{ fontSize:'1.75rem', fontWeight:700, color:'#0f172a', margin:0 }}>
          Оценка кардиориска
        </h1>
        <p style={{ color:'#64748b', margin:'0.25rem 0 0', fontSize:'0.9rem' }}>
          Прогнозирование риска сердечно-сосудистых заболеваний с помощью ИИ
        </p>
      </div>

      {/* Выбор обследования */}
      {!examId && (
        <div style={{ background:'white', borderRadius:'16px', padding:'1.5rem',
          boxShadow:'0 2px 8px rgba(0,0,0,0.06)', border:'1px solid #f1f5f9', marginBottom:'1.5rem' }}>
          <label style={{ ...lbl, fontSize:'0.85rem', marginBottom:'0.6rem' }}>Выберите обследование</label>
          <select value={selectedExam?.id || ''} onChange={e => setSelectedExam(examinations.find(ex => ex.id === Number(e.target.value)))}
            style={{ ...inp, borderColor: selectedExam ? '#1a6bb5' : '#e2e8f0' }}>
            <option value="">— Список обследований —</option>
            {examinations.map(exam => (
              <option key={exam.id} value={exam.id}>
                {exam.exam_type} | {exam.patient?.full_name} ({new Date(exam.exam_date).toLocaleDateString('ru-RU')})
              </option>
            ))}
          </select>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:'1.5rem', alignItems:'start' }}>
        {/* Left: form */}
        <div>
          {/* Tabs */}
          <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1.25rem' }}>
            {[['numeric','📊 Числовые данные'],['ecg','🫀 ЭКГ-изображение']].map(([tab,label]) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{ padding:'0.6rem 1.25rem', borderRadius:'10px', border:'none',
                  cursor:'pointer', fontFamily:FONT, fontSize:'0.875rem', fontWeight:600,
                  background: activeTab===tab ? 'linear-gradient(135deg,#1a6bb5,#0d7f8f)' : 'white',
                  color: activeTab===tab ? 'white' : '#64748b',
                  boxShadow: activeTab===tab ? '0 4px 12px rgba(26,107,181,0.25)' : '0 2px 4px rgba(0,0,0,0.06)' }}>
                {label}
              </button>
            ))}
          </div>

          {/* Numeric form */}
          {activeTab === 'numeric' && (
            <form onSubmit={handleSubmit}>
              <div style={{ background:'white', borderRadius:'16px', padding:'1.5rem',
                boxShadow:'0 2px 8px rgba(0,0,0,0.06)', border:'1px solid #f1f5f9', marginBottom:'1rem' }}>
                <h3 style={{ fontSize:'0.9rem', fontWeight:700, color:'#0f172a',
                  margin:'0 0 1.25rem', paddingBottom:'0.75rem', borderBottom:'1px solid #f1f5f9' }}>
                  Личные данные
                </h3>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'1rem' }}>
                  <Field label="Возраст" name="age" required placeholder="55" />
                  <Select label="Пол" name="sex" options={[['','Выбрать'],['1','Мужской'],['0','Женский']]} />
                  <Select label="Сахар > 120 мг/дл (fbs)" name="fbs" options={[['0','Нет'],['1','Да']]} />
                </div>
              </div>

              <div style={{ background:'white', borderRadius:'16px', padding:'1.5rem',
                boxShadow:'0 2px 8px rgba(0,0,0,0.06)', border:'1px solid #f1f5f9', marginBottom:'1rem' }}>
                <h3 style={{ fontSize:'0.9rem', fontWeight:700, color:'#0f172a',
                  margin:'0 0 1.25rem', paddingBottom:'0.75rem', borderBottom:'1px solid #f1f5f9' }}>
                  Клинические показатели
                </h3>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'1rem' }}>
                  <Select label="Тип боли (cp)" name="cp" options={[['0','Типичная'],['1','Атипичная'],['2','Неангинальная'],['3','Асимптомная']]} />
                  <Field label="АД в покое (trestbps)" name="trestbps" required placeholder="120" />
                  <Field label="Холестерин (мг/дл)" name="cholesterol" required placeholder="240" />
                </div>
              </div>

              <div style={{ background:'white', borderRadius:'16px', padding:'1.5rem',
                boxShadow:'0 2px 8px rgba(0,0,0,0.06)', border:'1px solid #f1f5f9', marginBottom:'1.25rem' }}>
                <h3 style={{ fontSize:'0.9rem', fontWeight:700, color:'#0f172a',
                  margin:'0 0 1.25rem', paddingBottom:'0.75rem', borderBottom:'1px solid #f1f5f9' }}>
                  Инструментальные данные
                </h3>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                  <Field label="Макс. пульс (thalach)" name="thalach" required placeholder="150" />
                  <Field label="ST депрессия (oldpeak)" name="oldpeak" type="number" required placeholder="1.0" step="0.1" />
                  <Select label="Сосуды (ca)" name="ca" options={[['0','0'],['1','1'],['2','2'],['3','3']]} />
                  <Select label="ЭКГ в покое (restecg)" name="restecg" options={[['0','Норма'],['1','Аномалия ST-T'],['2','Гипертрофия']]} />
                </div>
              </div>

              {error && (
                <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'10px',
                  padding:'0.875rem', marginBottom:'1rem', color:'#dc2626', fontSize:'0.875rem' }}>
                  ⚠️ {error}
                </div>
              )}

              <button type="submit" disabled={loading || !selectedExam}
                style={{ width:'100%', padding:'0.9rem', borderRadius:'12px', border:'none',
                  background: (!selectedExam||loading) ? '#cbd5e1' : 'linear-gradient(135deg,#1a6bb5,#0d7f8f)',
                  color:'white', fontSize:'1rem', fontWeight:700,
                  cursor: (!selectedExam||loading) ? 'not-allowed' : 'pointer',
                  fontFamily:FONT, boxShadow: selectedExam ? '0 4px 16px rgba(26,107,181,0.3)' : 'none' }}>
                {loading ? '⏳ Анализируем показатели...' : '🤖 Запустить ML-прогноз'}
              </button>
            </form>
          )}

          {/* ECG tab */}
          {activeTab === 'ecg' && (
            <div style={{ background:'white', borderRadius:'16px', padding:'1.5rem',
              boxShadow:'0 2px 8px rgba(0,0,0,0.06)', border:'1px solid #f1f5f9' }}>
              <div style={{ marginBottom:'1rem' }}>
                <h3 style={{ fontSize:'0.9rem', fontWeight:700, color:'#0f172a', margin:0 }}>Анализ ЭКГ-изображения</h3>
                <p style={{ color:'#64748b', fontSize:'0.85rem', margin:'0.3rem 0 0' }}>
                  CNN-модель (EfficientNet-B0) анализирует паттерны ЭКГ и определяет наличие патологии
                </p>
              </div>
              {selectedExam ? (
                <EcgUpload examinationId={selectedExam.id} token={localStorage.getItem('token')}
                  onResult={r => setPrediction(r)} />
              ) : (
                <div style={{ padding:'2rem', textAlign:'center', color:'#94a3b8', fontSize:'0.9rem' }}>
                  Сначала выберите обследование выше
                </div>
              )}
            </div>
          )}

          {/* DICOM */}
          {role === 'doctor' && selectedExam && (
            <div style={{ background:'white', borderRadius:'16px', padding:'1.5rem', marginTop:'1rem',
              boxShadow:'0 2px 8px rgba(0,0,0,0.06)', border:'1px solid #f1f5f9' }}>
              <h3 style={{ fontSize:'0.9rem', fontWeight:700, color:'#0f172a', margin:'0 0 1rem' }}>
                📁 DICOM-файлы
              </h3>
              <DicomUploader examinationId={selectedExam.id} onUploadSuccess={() => {}} />
            </div>
          )}
        </div>

        {/* Right: result */}
        <div style={{ position:'sticky', top:'1rem' }}>
          {prediction ? (
            <div style={{ background:'white', borderRadius:'16px', overflow:'hidden',
              boxShadow:'0 4px 20px rgba(0,0,0,0.10)', border:`1.5px solid ${rc.border}` }}>
              {/* Risk header */}
              <div style={{ background:rc.bg, padding:'1.5rem', textAlign:'center', borderBottom:`1px solid ${rc.border}` }}>
                <div style={{ fontSize:'2.5rem', marginBottom:'0.5rem' }}>{rc.icon}</div>
                <div style={{ fontSize:'0.8rem', color:'#64748b', fontWeight:600, textTransform:'uppercase',
                  letterSpacing:'0.08em', marginBottom:'0.5rem' }}>Вероятность ССЗ</div>
                <div style={{ fontSize:'3rem', fontWeight:800, color:rc.color, lineHeight:1 }}>
                  {Math.round((prediction.risk_score || 0) * 100)}%
                </div>
                <div style={{ marginTop:'0.75rem', display:'inline-block', background:rc.color,
                  color:'white', padding:'0.3rem 1rem', borderRadius:'20px',
                  fontSize:'0.8rem', fontWeight:700 }}>
                  {rc.label.toUpperCase()}
                </div>
              </div>

              {/* Risk bar */}
              <div style={{ padding:'1.25rem 1.5rem', borderBottom:'1px solid #f1f5f9' }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.75rem',
                  color:'#94a3b8', marginBottom:'0.5rem' }}>
                  <span>Низкий</span><span>Средний</span><span>Высокий</span>
                </div>
                <div style={{ height:'8px', background:'#f1f5f9', borderRadius:'4px', overflow:'hidden' }}>
                  <div style={{ height:'100%', borderRadius:'4px', transition:'width 0.5s',
                    width:`${Math.round((prediction.risk_score||0)*100)}%`,
                    background:`linear-gradient(90deg,#16a34a,#d97706,#dc2626)` }} />
                </div>
              </div>

              {/* Recommendations */}
              {prediction.explanation?.recommendations?.length > 0 && (
                <div style={{ padding:'1.25rem 1.5rem', borderBottom:'1px solid #f1f5f9' }}>
                  <div style={{ fontSize:'0.78rem', fontWeight:700, color:'#374151',
                    textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'0.75rem' }}>
                    Рекомендации
                  </div>
                  {prediction.explanation.recommendations.map((r,i) => (
                    <div key={i} style={{ display:'flex', gap:'0.5rem', marginBottom:'0.5rem',
                      fontSize:'0.85rem', color:'#475569', lineHeight:1.5 }}>
                      <span style={{ color:rc.color, flexShrink:0 }}>•</span> {r}
                    </div>
                  ))}
                </div>
              )}

              {/* ECG result */}
              {prediction.explanation?.ecg_class && (
                <div style={{ padding:'1.25rem 1.5rem', borderBottom:'1px solid #f1f5f9' }}>
                  <div style={{ fontSize:'0.78rem', fontWeight:700, color:'#374151',
                    textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'0.75rem' }}>
                    Результат ЭКГ
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.875rem' }}>
                    <span style={{ color:'#64748b' }}>Класс ЭКГ:</span>
                    <span style={{ fontWeight:600, color:rc.color }}>{prediction.explanation.ecg_class}</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.875rem', marginTop:'0.4rem' }}>
                    <span style={{ color:'#64748b' }}>Патология:</span>
                    <span style={{ fontWeight:600 }}>
                      {((prediction.explanation.abnormal_prob||0)*100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}

              {/* Feature impacts */}
              {prediction.explanation?.feature_impacts?.length > 0 && (
                <div style={{ padding:'1.25rem 1.5rem' }}>
                  <div style={{ fontSize:'0.78rem', fontWeight:700, color:'#374151',
                    textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'0.75rem' }}>
                    Влияние факторов
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem' }}>
                    {prediction.explanation.feature_impacts.slice(0,5).map((item,i) => (
                      <div key={i} style={{ display:'flex', justifyContent:'space-between',
                        alignItems:'center', fontSize:'0.8rem' }}>
                        <span style={{ color:'#64748b', textTransform:'uppercase', fontSize:'0.72rem' }}>
                          {item.feature}
                        </span>
                        <span style={{ fontWeight:700,
                          color: item.impact > 0 ? '#dc2626' : '#16a34a' }}>
                          {item.impact > 0 ? '↑' : '↓'} {Math.abs(item.impact).toFixed(1)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ padding:'0.75rem 1.5rem', background:'#f8fafc',
                fontSize:'0.72rem', color:'#94a3b8', textAlign:'center' }}>
                Модель: {prediction.ml_model_version}
              </div>
            </div>
          ) : (
            <div style={{ background:'white', borderRadius:'16px', padding:'2.5rem',
              boxShadow:'0 2px 8px rgba(0,0,0,0.06)', border:'1px solid #f1f5f9', textAlign:'center' }}>
              <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>🫀</div>
              <p style={{ color:'#64748b', fontSize:'0.9rem', lineHeight:1.6 }}>
                Заполните форму и запустите анализ — здесь появится результат прогнозирования
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
