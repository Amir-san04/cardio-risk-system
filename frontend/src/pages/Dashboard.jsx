import { useEffect, useState } from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { getExaminations } from '../services/api';
import useAuthStore from '../store/authStore';
import CreateExaminationModal from '../components/CreateExaminationModal';

export default function Dashboard() {
  const role = useAuthStore(s => s.role?.toLowerCase() || 'guest');
  const isAuthenticated = useAuthStore(s => s.isAuthenticated());
  const [examinations, setExaminations] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const stats = {
    total: new Set(examinations.map(e => e.patient_id)).size,
    high: examinations.filter(e => e.latest_risk_level?.toLowerCase() === 'high').length,
    medium: examinations.filter(e => e.latest_risk_level?.toLowerCase() === 'medium').length,
    all: examinations.length,
  };

  const fetchData = async () => {
    try {
      setLoading(true); setError(null);
      const data = await getExaminations();
      setExaminations(Array.isArray(data) ? data : []);
    } catch { setError('Не удалось загрузить данные'); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (isAuthenticated) fetchData(); }, [isAuthenticated]);
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const statCards = [
    { label:'Всего пациентов', value:stats.total, color:'#1a6bb5', bg:'#eff6ff', icon:'👥' },
    { label:'Высокий риск', value:stats.high, color:'#dc2626', bg:'#fef2f2', icon:'🔴' },
    { label:'Средний риск', value:stats.medium, color:'#d97706', bg:'#fffbeb', icon:'🟡' },
    { label:'Обследований', value:stats.all, color:'#0d7f8f', bg:'#f0fdfa', icon:'📋' },
  ];

  const riskBadge = (level) => {
    const cfg = {
      high:   { bg:'#fef2f2', color:'#dc2626', label:'Высокий' },
      medium: { bg:'#fffbeb', color:'#d97706', label:'Средний' },
      low:    { bg:'#f0fdf4', color:'#16a34a', label:'Низкий' },
    }[level?.toLowerCase()] || { bg:'#f8fafc', color:'#94a3b8', label:'—' };
    return (
      <span style={{ background:cfg.bg, color:cfg.color, padding:'0.2rem 0.65rem',
        borderRadius:'20px', fontSize:'0.75rem', fontWeight:600 }}>
        {cfg.label}
      </span>
    );
  };

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", maxWidth:'1200px', margin:'0 auto' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');`}</style>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'2rem' }}>
        <div>
          <h1 style={{ fontSize:'1.75rem', fontWeight:700, color:'#0f172a', margin:0 }}>Клиническая панель</h1>
          <p style={{ color:'#64748b', margin:'0.25rem 0 0', fontSize:'0.9rem' }}>
            {new Date().toLocaleDateString('ru-RU', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
          </p>
        </div>
        {['doctor','admin'].includes(role) && (
          <button onClick={() => setIsModalOpen(true)}
            style={{ display:'flex', alignItems:'center', gap:'0.5rem', padding:'0.75rem 1.5rem',
              borderRadius:'12px', border:'none', cursor:'pointer', fontFamily:'inherit',
              background:'linear-gradient(135deg,#1a6bb5,#0d7f8f)', color:'white',
              fontSize:'0.9rem', fontWeight:600, boxShadow:'0 4px 12px rgba(26,107,181,0.3)' }}>
            <span style={{ fontSize:'1.1rem' }}>+</span> Новое обследование
          </button>
        )}
      </div>

      {/* Stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'1.25rem', marginBottom:'2rem' }}>
        {statCards.map((c,i) => (
          <div key={i} style={{ background:'white', borderRadius:'16px', padding:'1.5rem',
            boxShadow:'0 2px 8px rgba(0,0,0,0.06)', border:'1px solid #f1f5f9' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <p style={{ fontSize:'0.8rem', color:'#64748b', fontWeight:500, margin:0 }}>{c.label}</p>
                <p style={{ fontSize:'2rem', fontWeight:700, color:c.color, margin:'0.5rem 0 0' }}>
                  {loading ? '—' : c.value}
                </p>
              </div>
              <div style={{ width:'44px', height:'44px', borderRadius:'12px', background:c.bg,
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem' }}>
                {c.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'12px',
          padding:'1rem', marginBottom:'1.5rem', color:'#dc2626', fontSize:'0.9rem' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Recent examinations */}
      <div style={{ background:'white', borderRadius:'16px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)',
        border:'1px solid #f1f5f9', overflow:'hidden' }}>
        <div style={{ padding:'1.25rem 1.5rem', borderBottom:'1px solid #f1f5f9',
          display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h2 style={{ fontSize:'1rem', fontWeight:600, color:'#0f172a', margin:0 }}>Последние обследования</h2>
          <span style={{ fontSize:'0.8rem', color:'#94a3b8' }}>{examinations.length} записей</span>
        </div>

        {loading ? (
          <div style={{ padding:'3rem', textAlign:'center' }}>
            <div style={{ width:'36px', height:'36px', border:'3px solid #e2e8f0',
              borderTopColor:'#1a6bb5', borderRadius:'50%', margin:'0 auto',
              animation:'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <p style={{ color:'#94a3b8', marginTop:'1rem', fontSize:'0.9rem' }}>Загрузка...</p>
          </div>
        ) : examinations.length === 0 ? (
          <div style={{ padding:'3rem', textAlign:'center' }}>
            <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>📋</div>
            <p style={{ color:'#64748b', fontSize:'0.95rem' }}>Нет обследований. Создайте первое.</p>
            {['doctor','admin'].includes(role) && (
              <button onClick={() => setIsModalOpen(true)}
                style={{ marginTop:'1rem', padding:'0.6rem 1.5rem', borderRadius:'10px', border:'none',
                  background:'linear-gradient(135deg,#1a6bb5,#0d7f8f)', color:'white',
                  fontSize:'0.875rem', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                + Создать обследование
              </button>
            )}
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#f8fafc' }}>
                {['Пациент','Дата','Тип','Риск','Действия'].map(h => (
                  <th key={h} style={{ padding:'0.875rem 1.5rem', textAlign:'left',
                    fontSize:'0.75rem', fontWeight:600, color:'#64748b', textTransform:'uppercase',
                    letterSpacing:'0.05em', borderBottom:'1px solid #f1f5f9' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {examinations.slice(0,10).map((exam,i) => (
                <tr key={exam.id}
                  style={{ borderBottom: i < Math.min(examinations.length,10)-1 ? '1px solid #f8fafc' : 'none' }}
                  onMouseOver={e=>e.currentTarget.style.background='#fafbff'}
                  onMouseOut={e=>e.currentTarget.style.background='white'}>
                  <td style={{ padding:'1rem 1.5rem' }}>
                    <div style={{ fontWeight:600, color:'#0f172a', fontSize:'0.9rem' }}>
                      {exam.patient?.full_name || `Пациент #${exam.patient_id}`}
                    </div>
                  </td>
                  <td style={{ padding:'1rem 1.5rem', color:'#64748b', fontSize:'0.875rem' }}>
                    {new Date(exam.exam_date).toLocaleDateString('ru-RU')}
                  </td>
                  <td style={{ padding:'1rem 1.5rem' }}>
                    <span style={{ background:'#eff6ff', color:'#1a6bb5', padding:'0.2rem 0.65rem',
                      borderRadius:'20px', fontSize:'0.75rem', fontWeight:600 }}>
                      {exam.exam_type || 'General'}
                    </span>
                  </td>
                  <td style={{ padding:'1rem 1.5rem' }}>
                    {riskBadge(exam.latest_risk_level)}
                  </td>
                  <td style={{ padding:'1rem 1.5rem' }}>
                    <button onClick={() => navigate(`/risk-assessment/${exam.id}`)}
                      style={{ padding:'0.4rem 1rem', borderRadius:'8px', border:'none',
                        background:'linear-gradient(135deg,#1a6bb5,#0d7f8f)', color:'white',
                        fontSize:'0.8rem', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                      Прогноз →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <CreateExaminationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onCreated={fetchData} />
    </div>
  );
}
