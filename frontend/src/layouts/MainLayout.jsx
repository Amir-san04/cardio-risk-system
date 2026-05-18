import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export default function MainLayout() {
  const { role, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => { logout(); navigate('/login'); };

  const navItems = [
    { to:'/dashboard', icon:'📊', label:'Dashboard', roles:['doctor','patient','admin'] },
    { to:'/patients', icon:'👥', label:'Пациенты', roles:['doctor','admin'] },
    { to:'/risk-assessment', icon:'🫀', label:'Оценка риска', roles:['doctor','patient'] },
    { to:'/my-profile', icon:'👤', label:'Мой профиль', roles:['patient'] },
    { to:'/model-metrics', icon:'📈', label:'Метрики моделей', roles:['doctor','admin'] },
  ].filter(item => item.roles.includes(role?.toLowerCase()));

  const roleLabel = { doctor:'Врач', patient:'Пациент', admin:'Администратор' }[role?.toLowerCase()] || role;
  const roleColor = { doctor:'#0d7f8f', patient:'#1a6bb5', admin:'#7c3aed' }[role?.toLowerCase()] || '#64748b';

  return (
    <div style={{ display:'flex', height:'100vh', fontFamily:"'DM Sans',sans-serif", background:'#f0f6ff' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        .nav-link:hover { background: rgba(26,107,181,0.08) !important; color: #1a6bb5 !important; }
        .nav-link.active { background: linear-gradient(135deg,rgba(26,107,181,0.12),rgba(13,127,143,0.08)) !important; color: #1a6bb5 !important; border-left: 3px solid #1a6bb5 !important; }
      `}</style>

      {/* Sidebar */}
      <div style={{ width:'240px', background:'white', borderRight:'1px solid #e8f0fe',
        display:'flex', flexDirection:'column', boxShadow:'2px 0 12px rgba(0,0,0,0.04)', flexShrink:0 }}>

        {/* Logo */}
        <div style={{ padding:'1.5rem 1.25rem', borderBottom:'1px solid #f1f5f9' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'0.6rem' }}>
            <div style={{ width:'36px', height:'36px', borderRadius:'10px',
              background:'linear-gradient(135deg,#1a6bb5,#0d7f8f)',
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg viewBox="0 0 24 24" style={{ width:'18px', fill:'none', stroke:'white', strokeWidth:2 }}>
                <polyline points="2,12 6,12 8,4 10,20 12,12 14,16 16,12 22,12"/>
              </svg>
            </div>
            <span style={{ fontSize:'1.1rem', fontWeight:700, color:'#0f172a' }}>CardioRisk</span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:'1rem 0.75rem', display:'flex', flexDirection:'column', gap:'0.25rem' }}>
          {navItems.map(item => {
            const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
            return (
              <Link key={item.to} to={item.to}
                className={`nav-link${isActive?' active':''}`}
                style={{ display:'flex', alignItems:'center', gap:'0.75rem', padding:'0.7rem 1rem',
                  borderRadius:'10px', textDecoration:'none', fontSize:'0.9rem', fontWeight:500,
                  color: isActive ? '#1a6bb5' : '#475569', transition:'all 0.15s',
                  borderLeft: isActive ? '3px solid #1a6bb5' : '3px solid transparent' }}>
                <span style={{ fontSize:'1rem' }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User info + logout */}
        <div style={{ padding:'1rem', borderTop:'1px solid #f1f5f9' }}>
          <div style={{ background:'#f8fafc', borderRadius:'10px', padding:'0.875rem', marginBottom:'0.75rem' }}>
            <div style={{ fontSize:'0.75rem', color:'#94a3b8', marginBottom:'0.25rem' }}>Роль</div>
            <div style={{ display:'inline-flex', alignItems:'center', gap:'0.4rem',
              background:`${roleColor}15`, borderRadius:'20px', padding:'0.2rem 0.6rem' }}>
              <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:roleColor }} />
              <span style={{ fontSize:'0.8rem', fontWeight:600, color:roleColor }}>{roleLabel}</span>
            </div>
          </div>
          <button onClick={handleLogout}
            style={{ width:'100%', padding:'0.7rem', borderRadius:'10px', border:'1.5px solid #fee2e2',
              background:'#fff', color:'#ef4444', fontSize:'0.875rem', fontWeight:600,
              cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s' }}
            onMouseOver={e=>{ e.target.style.background='#fef2f2'; }}
            onMouseOut={e=>{ e.target.style.background='#fff'; }}>
            Выйти из системы
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex:1, overflow:'auto', padding:'2rem' }}>
        <Outlet />
      </div>
    </div>
  );
}
