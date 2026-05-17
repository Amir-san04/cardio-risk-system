import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../services/api';

export default function Register() {
  const [form, setForm] = useState({
    email:'', password:'', full_name:'', role:'patient',
    phone:'', birth_date:'', gender:'', specialization:'', license_number:''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) { setError('Пароль должен быть не менее 6 символов'); return; }
    setLoading(true);
    try {
      await register(form);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  const inp = { width:'100%', padding:'0.8rem 1rem', border:'1.5px solid #e2e8f0',
    borderRadius:'10px', fontSize:'0.9rem', outline:'none', boxSizing:'border-box',
    fontFamily:'inherit', color:'#0f172a', background:'white' };
  const lbl = { display:'block', fontSize:'0.8rem', fontWeight:600, color:'#374151', marginBottom:'0.4rem' };

  return (
    <div style={{ minHeight:'100vh', background:'#f0f6ff', display:'flex',
      alignItems:'center', justifyContent:'center', padding:'2rem', fontFamily:"'DM Sans',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');`}</style>

      <div style={{ width:'100%', maxWidth:'680px', background:'white', borderRadius:'20px',
        boxShadow:'0 8px 40px rgba(0,0,0,0.10)', overflow:'hidden' }}>

        {/* Header */}
        <div style={{ background:'linear-gradient(135deg,#0f4c81,#0d7f8f)', padding:'2rem 2.5rem' }}>
          <Link to="/login" style={{ color:'rgba(255,255,255,0.7)', fontSize:'0.85rem', textDecoration:'none',
            display:'inline-flex', alignItems:'center', gap:'0.4rem', marginBottom:'1rem' }}>
            ← Назад к входу
          </Link>
          <h1 style={{ color:'white', fontSize:'1.75rem', fontWeight:700, margin:0 }}>Регистрация</h1>
          <p style={{ color:'rgba(255,255,255,0.7)', margin:'0.4rem 0 0', fontSize:'0.9rem' }}>
            Создайте аккаунт в системе CardioRisk
          </p>
        </div>

        <div style={{ padding:'2.5rem' }}>
          {error && (
            <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'10px',
              padding:'0.875rem 1rem', marginBottom:'1.5rem', color:'#dc2626', fontSize:'0.9rem' }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Роль */}
            <div style={{ marginBottom:'1.5rem' }}>
              <label style={lbl}>Роль в системе</label>
              <div style={{ display:'flex', gap:'0.75rem' }}>
                {[['patient','👤 Пациент'],['doctor','👨‍⚕️ Врач'],['admin','⚙️ Администратор']].map(([val,label])=>(
                  <button key={val} type="button" onClick={()=>setForm(p=>({...p,role:val}))}
                    style={{ flex:1, padding:'0.75rem', borderRadius:'10px', cursor:'pointer', fontFamily:'inherit',
                      fontSize:'0.85rem', fontWeight:600, transition:'all 0.2s',
                      background: form.role===val ? 'linear-gradient(135deg,#1a6bb5,#0d7f8f)' : '#f8fafc',
                      color: form.role===val ? 'white' : '#64748b',
                      border: form.role===val ? 'none' : '1.5px solid #e2e8f0' }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.25rem', marginBottom:'1.25rem' }}>
              <div style={{ gridColumn:'1/-1' }}>
                <label style={lbl}>ФИО *</label>
                <input name="full_name" required value={form.full_name} onChange={handleChange}
                  placeholder="Иванов Иван Иванович" style={inp}
                  onFocus={e=>e.target.style.borderColor='#1a6bb5'}
                  onBlur={e=>e.target.style.borderColor='#e2e8f0'} />
              </div>
              <div style={{ gridColumn:'1/-1' }}>
                <label style={lbl}>Email *</label>
                <input name="email" type="email" required value={form.email} onChange={handleChange}
                  placeholder="example@clinic.kz" style={inp}
                  onFocus={e=>e.target.style.borderColor='#1a6bb5'}
                  onBlur={e=>e.target.style.borderColor='#e2e8f0'} />
              </div>
              <div style={{ gridColumn:'1/-1' }}>
                <label style={lbl}>Пароль * (мин. 6 символов)</label>
                <input name="password" type="password" required value={form.password} onChange={handleChange}
                  placeholder="••••••••" style={inp}
                  onFocus={e=>e.target.style.borderColor='#1a6bb5'}
                  onBlur={e=>e.target.style.borderColor='#e2e8f0'} />
              </div>
              <div>
                <label style={lbl}>Телефон</label>
                <input name="phone" value={form.phone} onChange={handleChange}
                  placeholder="+7 (XXX) XXX-XX-XX" style={inp}
                  onFocus={e=>e.target.style.borderColor='#1a6bb5'}
                  onBlur={e=>e.target.style.borderColor='#e2e8f0'} />
              </div>
              <div>
                <label style={lbl}>Дата рождения</label>
                <input name="birth_date" type="date" value={form.birth_date} onChange={handleChange} style={inp}
                  onFocus={e=>e.target.style.borderColor='#1a6bb5'}
                  onBlur={e=>e.target.style.borderColor='#e2e8f0'} />
              </div>
              <div style={{ gridColumn:'1/-1' }}>
                <label style={lbl}>Пол</label>
                <select name="gender" value={form.gender} onChange={handleChange} style={inp}>
                  <option value="">Не указан</option>
                  <option value="M">Мужской</option>
                  <option value="F">Женский</option>
                </select>
              </div>

              {form.role === 'doctor' && (<>
                <div>
                  <label style={lbl}>Специализация</label>
                  <input name="specialization" value={form.specialization} onChange={handleChange}
                    placeholder="Кардиолог" style={inp}
                    onFocus={e=>e.target.style.borderColor='#1a6bb5'}
                    onBlur={e=>e.target.style.borderColor='#e2e8f0'} />
                </div>
                <div>
                  <label style={lbl}>Номер лицензии</label>
                  <input name="license_number" value={form.license_number} onChange={handleChange}
                    placeholder="№ 12345" style={inp}
                    onFocus={e=>e.target.style.borderColor='#1a6bb5'}
                    onBlur={e=>e.target.style.borderColor='#e2e8f0'} />
                </div>
              </>)}
            </div>

            <button type="submit" disabled={loading}
              style={{ width:'100%', padding:'0.9rem', borderRadius:'10px', border:'none',
                background:loading?'#93c5fd':'linear-gradient(135deg,#1a6bb5,#0d7f8f)',
                color:'white', fontSize:'1rem', fontWeight:600,
                cursor:loading?'not-allowed':'pointer', fontFamily:'inherit' }}>
              {loading ? 'Создание аккаунта...' : 'Зарегистрироваться'}
            </button>
          </form>

          <p style={{ marginTop:'1.5rem', textAlign:'center', fontSize:'0.9rem', color:'#64748b' }}>
            Уже есть аккаунт?{' '}
            <Link to="/login" style={{ color:'#1a6bb5', fontWeight:600, textDecoration:'none' }}>Войти</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
