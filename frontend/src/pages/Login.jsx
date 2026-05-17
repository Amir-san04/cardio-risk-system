import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../services/api';
import useAuthStore from '../store/authStore';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const navigate = useNavigate();
  const { login: authLogin } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(email, password);
      authLogin(res.access_token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Неверный email или пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', fontFamily:"'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');`}</style>

      {/* Левая панель */}
      <div style={{ flex:1, background:'linear-gradient(145deg,#0f4c81 0%,#1a6bb5 50%,#0d7f8f 100%)',
        display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center',
        padding:'3rem', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:'-80px', left:'-80px', width:'300px', height:'300px',
          borderRadius:'50%', background:'rgba(255,255,255,0.05)' }} />
        <div style={{ position:'absolute', bottom:'-60px', right:'-60px', width:'250px', height:'250px',
          borderRadius:'50%', background:'rgba(255,255,255,0.05)' }} />
        <div style={{ position:'relative', zIndex:1, textAlign:'center', maxWidth:'360px' }}>
          <svg viewBox="0 0 200 60" style={{ width:'180px', marginBottom:'2rem', opacity:0.9 }}>
            <polyline points="0,30 30,30 40,10 50,50 60,30 80,30 90,15 100,45 110,30 200,30"
              fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h1 style={{ color:'white', fontSize:'2.2rem', fontWeight:700, marginBottom:'0.75rem' }}>CardioRisk</h1>
          <p style={{ color:'rgba(255,255,255,0.75)', fontSize:'1rem', lineHeight:1.6 }}>
            Система ранней диагностики и прогнозирования сердечно-сосудистых заболеваний
          </p>
          <div style={{ marginTop:'2.5rem', display:'flex', flexDirection:'column', gap:'0.875rem' }}>
            {[['🤖','ML-прогнозирование риска ССЗ'],['🫀','Анализ ЭКГ-изображений (CNN)'],['📁','Поддержка DICOM-файлов']].map(([icon,text],i)=>(
              <div key={i} style={{ display:'flex', alignItems:'center', gap:'0.75rem',
                background:'rgba(255,255,255,0.1)', borderRadius:'10px', padding:'0.75rem 1rem' }}>
                <span style={{ fontSize:'1.1rem' }}>{icon}</span>
                <span style={{ color:'rgba(255,255,255,0.9)', fontSize:'0.875rem' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Правая панель */}
      <div style={{ width:'480px', background:'#fff', display:'flex', flexDirection:'column',
        justifyContent:'center', padding:'3rem', boxShadow:'-4px 0 30px rgba(0,0,0,0.08)' }}>
        <div style={{ marginBottom:'2.5rem' }}>
          <h2 style={{ fontSize:'1.75rem', fontWeight:700, color:'#0f172a', marginBottom:'0.5rem' }}>Добро пожаловать</h2>
          <p style={{ color:'#64748b', fontSize:'0.95rem' }}>Войдите в свой аккаунт</p>
        </div>

        {error && (
          <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'10px',
            padding:'0.875rem 1rem', marginBottom:'1.5rem', color:'#dc2626', fontSize:'0.9rem' }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>
          <div>
            <label style={{ display:'block', fontSize:'0.85rem', fontWeight:600, color:'#374151', marginBottom:'0.5rem' }}>Email</label>
            <input type="email" required value={email} onChange={e=>setEmail(e.target.value)}
              placeholder="doctor@clinic.kz"
              style={{ width:'100%', padding:'0.875rem 1rem', border:'1.5px solid #e2e8f0',
                borderRadius:'10px', fontSize:'0.95rem', outline:'none', boxSizing:'border-box', fontFamily:'inherit', color:'#0f172a' }}
              onFocus={e=>e.target.style.borderColor='#1a6bb5'}
              onBlur={e=>e.target.style.borderColor='#e2e8f0'} />
          </div>
          <div>
            <label style={{ display:'block', fontSize:'0.85rem', fontWeight:600, color:'#374151', marginBottom:'0.5rem' }}>Пароль</label>
            <div style={{ position:'relative' }}>
              <input type={showPass?'text':'password'} required value={password} onChange={e=>setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ width:'100%', padding:'0.875rem 3rem 0.875rem 1rem', border:'1.5px solid #e2e8f0',
                  borderRadius:'10px', fontSize:'0.95rem', outline:'none', boxSizing:'border-box', fontFamily:'inherit', color:'#0f172a' }}
                onFocus={e=>e.target.style.borderColor='#1a6bb5'}
                onBlur={e=>e.target.style.borderColor='#e2e8f0'} />
              <button type="button" onClick={()=>setShowPass(!showPass)}
                style={{ position:'absolute', right:'1rem', top:'50%', transform:'translateY(-50%)',
                  background:'none', border:'none', cursor:'pointer', fontSize:'1rem', color:'#94a3b8' }}>
                {showPass?'🙈':'👁️'}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading}
            style={{ width:'100%', padding:'0.9rem', borderRadius:'10px', border:'none', marginTop:'0.5rem',
              background:loading?'#93c5fd':'linear-gradient(135deg,#1a6bb5,#0d7f8f)',
              color:'white', fontSize:'1rem', fontWeight:600, cursor:loading?'not-allowed':'pointer', fontFamily:'inherit' }}>
            {loading ? 'Вход...' : 'Войти в систему'}
          </button>
        </form>

        <p style={{ marginTop:'2rem', textAlign:'center', fontSize:'0.9rem', color:'#64748b' }}>
          Нет аккаунта?{' '}
          <Link to="/register" style={{ color:'#1a6bb5', fontWeight:600, textDecoration:'none' }}>Зарегистрироваться</Link>
        </p>
        <div style={{ marginTop:'2.5rem', padding:'1rem', background:'#f8fafc',
          borderRadius:'10px', fontSize:'0.8rem', color:'#94a3b8', textAlign:'center' }}>
          Система предназначена исключительно для медицинского персонала
        </div>
      </div>
    </div>
  );
}
