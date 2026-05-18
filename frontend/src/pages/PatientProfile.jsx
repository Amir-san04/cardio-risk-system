import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import api from '../services/api';

const FONT = "'DM Sans', sans-serif";

export default function PatientProfile() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get(`/patients/${patientId}`)
      .then(r => setPatient(r.data))
      .catch(() => setError('Пациент не найден'))
      .finally(() => setLoading(false));
  }, [patientId]);

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center',
      height:'60vh', fontFamily:FONT }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:'40px', height:'40px', border:'3px solid #e2e8f0',
          borderTopColor:'#1a6bb5', borderRadius:'50%', margin:'0 auto',
          animation:'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ color:'#94a3b8', marginTop:'1rem' }}>Загрузка профиля...</p>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ textAlign:'center', padding:'3rem', fontFamily:FONT }}>
      <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>❌</div>
      <p style={{ color:'#dc2626' }}>{error}</p>
      <button onClick={() => navigate('/patients')}
        style={{ marginTop:'1rem', padding:'0.6rem 1.5rem', borderRadius:'10px',
          border:'none', background:'#1a6bb5', color:'white', cursor:'pointer', fontFamily:FONT }}>
        ← Назад
      </button>
    </div>
  );

  const riskCfg = {
    high:   { color:'#dc2626', bg:'#fef2f2', label:'Высокий' },
    medium: { color:'#d97706', bg:'#fffbeb', label:'Средний' },
    low:    { color:'#16a34a', bg:'#f0fdf4', label:'Низкий' },
  };

  const chartData = [...(patient.examinations || [])]
    .reverse()
    .filter(e => e.latest_risk_score !== null)
    .map(e => ({
      date: new Date(e.exam_date).toLocaleDateString('ru-RU', { day:'numeric', month:'short' }),
      score: Math.round((e.latest_risk_score || 0) * 100),
      level: e.latest_risk_level,
    }));

  const lastExam = patient.examinations?.[0];
  const lastRisk = riskCfg[lastExam?.latest_risk_level] || null;

  const genderLabel = { M:'Мужской', F:'Женский' }[patient.gender] || 'Не указан';

  const CustomDot = ({ cx, cy, payload }) => {
    const color = riskCfg[payload.level]?.color || '#94a3b8';
    return <circle cx={cx} cy={cy} r={5} fill={color} stroke="white" strokeWidth={2} />;
  };

  return (
    <div style={{ fontFamily:FONT, maxWidth:'960px', margin:'0 auto' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');`}</style>

      {/* Back */}
      <button onClick={() => navigate('/patients')}
        style={{ display:'flex', alignItems:'center', gap:'0.4rem', marginBottom:'1.5rem',
          background:'none', border:'none', color:'#64748b', cursor:'pointer',
          fontSize:'0.875rem', fontFamily:FONT, padding:0 }}>
        ← Назад к пациентам
      </button>

      {/* Header card */}
      <div style={{ background:'white', borderRadius:'16px', overflow:'hidden',
        boxShadow:'0 2px 8px rgba(0,0,0,0.06)', border:'1px solid #f1f5f9', marginBottom:'1.5rem' }}>
        <div style={{ background:'linear-gradient(135deg,#0f4c81,#0d7f8f)', padding:'2rem' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'1.25rem' }}>
              <div style={{ width:'64px', height:'64px', borderRadius:'50%',
                background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center',
                justifyContent:'center', fontSize:'1.75rem' }}>
                {patient.gender === 'F' ? '👩' : '👨'}
              </div>
              <div>
                <h1 style={{ color:'white', fontSize:'1.5rem', fontWeight:700, margin:0 }}>
                  {patient.full_name}
                </h1>
                <p style={{ color:'rgba(255,255,255,0.75)', margin:'0.25rem 0 0', fontSize:'0.9rem' }}>
                  {genderLabel} · {patient.age ? `${patient.age} лет` : 'Возраст не указан'}
                </p>
              </div>
            </div>
            {lastRisk && (
              <div style={{ background:'rgba(255,255,255,0.15)', borderRadius:'12px', padding:'1rem 1.5rem', textAlign:'center' }}>
                <div style={{ color:'rgba(255,255,255,0.75)', fontSize:'0.75rem', marginBottom:'0.25rem' }}>
                  Последний риск
                </div>
                <div style={{ color:'white', fontSize:'1.75rem', fontWeight:800 }}>
                  {Math.round((lastExam?.latest_risk_score || 0) * 100)}%
                </div>
                <div style={{ background:lastRisk.color, color:'white', borderRadius:'20px',
                  padding:'0.2rem 0.75rem', fontSize:'0.75rem', fontWeight:700, marginTop:'0.25rem' }}>
                  {lastRisk.label}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Info grid */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)',
          borderTop:'1px solid #f1f5f9' }}>
          {[
            { label:'Email', value:patient.email, icon:'📧' },
            { label:'Телефон', value:patient.phone || 'Не указан', icon:'📱' },
            { label:'Дата рождения', value:patient.birth_date
              ? new Date(patient.birth_date).toLocaleDateString('ru-RU') : 'Не указана', icon:'🎂' },
            { label:'Обследований', value:patient.total_examinations, icon:'📋' },
          ].map((item, i) => (
            <div key={i} style={{ padding:'1.25rem',
              borderRight: i < 3 ? '1px solid #f1f5f9' : 'none' }}>
              <div style={{ fontSize:'0.75rem', color:'#94a3b8', marginBottom:'0.25rem' }}>
                {item.icon} {item.label}
              </div>
              <div style={{ fontSize:'0.9rem', fontWeight:600, color:'#0f172a' }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem', marginBottom:'1.5rem' }}>
        {/* Risk chart */}
        <div style={{ background:'white', borderRadius:'16px', padding:'1.5rem',
          boxShadow:'0 2px 8px rgba(0,0,0,0.06)', border:'1px solid #f1f5f9' }}>
          <h3 style={{ fontSize:'1rem', fontWeight:700, color:'#0f172a', margin:'0 0 1.25rem' }}>
            📈 Динамика кардиориска
          </h3>
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize:11, fill:'#94a3b8' }} />
                <YAxis domain={[0,100]} tick={{ fontSize:11, fill:'#94a3b8' }}
                  tickFormatter={v => `${v}%`} />
                <Tooltip formatter={v => [`${v}%`, 'Риск']}
                  contentStyle={{ borderRadius:'10px', border:'1px solid #e2e8f0', fontSize:'12px' }} />
                <ReferenceLine y={30} stroke="#16a34a" strokeDasharray="3 3" />
                <ReferenceLine y={70} stroke="#dc2626" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="score" stroke="#1a6bb5"
                  strokeWidth={2.5} dot={<CustomDot />} activeDot={{ r:7 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height:'200px', display:'flex', alignItems:'center',
              justifyContent:'center', color:'#94a3b8', fontSize:'0.875rem' }}>
              Недостаточно данных для графика
            </div>
          )}
        </div>

        {/* Stats */}
        <div style={{ background:'white', borderRadius:'16px', padding:'1.5rem',
          boxShadow:'0 2px 8px rgba(0,0,0,0.06)', border:'1px solid #f1f5f9' }}>
          <h3 style={{ fontSize:'1rem', fontWeight:700, color:'#0f172a', margin:'0 0 1.25rem' }}>
            📊 Статистика
          </h3>
          <div style={{ display:'flex', flexDirection:'column', gap:'0.875rem' }}>
            {[
              { label:'Всего обследований', value:patient.total_examinations, color:'#1a6bb5' },
              { label:'С высоким риском', value:patient.examinations?.filter(e=>e.latest_risk_level==='high').length || 0, color:'#dc2626' },
              { label:'Со средним риском', value:patient.examinations?.filter(e=>e.latest_risk_level==='medium').length || 0, color:'#d97706' },
              { label:'С низким риском', value:patient.examinations?.filter(e=>e.latest_risk_level==='low').length || 0, color:'#16a34a' },
            ].map((s,i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between',
                alignItems:'center', padding:'0.75rem', background:'#f8fafc', borderRadius:'10px' }}>
                <span style={{ fontSize:'0.875rem', color:'#475569' }}>{s.label}</span>
                <span style={{ fontSize:'1.25rem', fontWeight:700, color:s.color }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Examinations history */}
      <div style={{ background:'white', borderRadius:'16px',
        boxShadow:'0 2px 8px rgba(0,0,0,0.06)', border:'1px solid #f1f5f9', overflow:'hidden' }}>
        <div style={{ padding:'1.25rem 1.5rem', borderBottom:'1px solid #f1f5f9',
          display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h3 style={{ fontSize:'1rem', fontWeight:700, color:'#0f172a', margin:0 }}>
            История обследований
          </h3>
          <Link to={`/risk-assessment`}
            style={{ padding:'0.5rem 1rem', borderRadius:'8px', border:'none',
              background:'linear-gradient(135deg,#1a6bb5,#0d7f8f)', color:'white',
              fontSize:'0.8rem', fontWeight:600, textDecoration:'none' }}>
            + Новый прогноз
          </Link>
        </div>

        {patient.examinations?.length === 0 ? (
          <div style={{ padding:'3rem', textAlign:'center', color:'#94a3b8' }}>
            Нет обследований
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#f8fafc' }}>
                {['Дата','Тип','Жалобы','Риск','Действия'].map(h => (
                  <th key={h} style={{ padding:'0.875rem 1.5rem', textAlign:'left',
                    fontSize:'0.75rem', fontWeight:600, color:'#64748b',
                    textTransform:'uppercase', letterSpacing:'0.05em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {patient.examinations.map((exam, i) => {
                const rc = riskCfg[exam.latest_risk_level];
                return (
                  <tr key={exam.id}
                    style={{ borderBottom: i < patient.examinations.length-1 ? '1px solid #f8fafc' : 'none' }}
                    onMouseOver={e=>e.currentTarget.style.background='#fafbff'}
                    onMouseOut={e=>e.currentTarget.style.background='white'}>
                    <td style={{ padding:'1rem 1.5rem', fontSize:'0.875rem', color:'#0f172a', fontWeight:500 }}>
                      {new Date(exam.exam_date).toLocaleDateString('ru-RU')}
                    </td>
                    <td style={{ padding:'1rem 1.5rem' }}>
                      <span style={{ background:'#eff6ff', color:'#1a6bb5', padding:'0.2rem 0.65rem',
                        borderRadius:'20px', fontSize:'0.75rem', fontWeight:600 }}>
                        {exam.exam_type}
                      </span>
                    </td>
                    <td style={{ padding:'1rem 1.5rem', fontSize:'0.875rem', color:'#64748b' }}>
                      {exam.complaints || '—'}
                    </td>
                    <td style={{ padding:'1rem 1.5rem' }}>
                      {rc ? (
                        <span style={{ background:rc.bg, color:rc.color, padding:'0.2rem 0.65rem',
                          borderRadius:'20px', fontSize:'0.75rem', fontWeight:600 }}>
                          {rc.label} {exam.latest_risk_score !== null
                            ? `(${Math.round(exam.latest_risk_score*100)}%)` : ''}
                        </span>
                      ) : (
                        <span style={{ color:'#94a3b8', fontSize:'0.8rem' }}>Нет данных</span>
                      )}
                    </td>
                    <td style={{ padding:'1rem 1.5rem' }}>
                      <Link to={`/risk-assessment/${exam.id}`}
                        style={{ padding:'0.35rem 0.875rem', borderRadius:'8px',
                          background:'linear-gradient(135deg,#1a6bb5,#0d7f8f)',
                          color:'white', fontSize:'0.78rem', fontWeight:600, textDecoration:'none' }}>
                        Открыть →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
