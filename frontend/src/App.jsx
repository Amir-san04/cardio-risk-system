// frontend/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore'; // zustand store из предыдущих сообщений
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import RiskAssessment from './pages/RiskAssessment';
import Login from './pages/Login';
import Register from './pages/Register';
import Unauthorized from './pages/Unauthorized'; // простая страница "Доступ запрещён"

function ProtectedRoute({ children, allowedRoles = [] }) {
  const { isAuthenticated, role } = useAuthStore();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Публичные страницы */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Защищённые страницы внутри MainLayout */}
        <Route element={<MainLayout />}>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['doctor', 'patient', 'admin']}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/risk-assessment/:examId?"
            element={
              <ProtectedRoute allowedRoles={['doctor', 'patient']}>
                <RiskAssessment />
              </ProtectedRoute>
            }
          />
          {/* Можно добавить /patients только для doctor */}
          <Route
            path="/patients"
            element={
              <ProtectedRoute allowedRoles={['doctor', 'admin']}>
                <PatientsTable /> {/* или отдельная страница */}
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Редирект с корня */}
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}