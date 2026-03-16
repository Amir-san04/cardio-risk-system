import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import useAuthStore from './store/authStore';
import MainLayout from './layouts/MainLayout';

import Dashboard from './pages/Dashboard';
import RiskAssessment from './pages/RiskAssessment';
import Login from './pages/Login';
import Register from './pages/Register';
import Unauthorized from './pages/Unauthorized';
import PatientsTable from './components/PatientsTable';

function ProtectedRoute({ children, allowedRoles = [] }) {
  const { token, role } = useAuthStore();
  const isAuthenticated = !!token;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}

export default function App() {
  const { init, token } = useAuthStore();
  const isAuthenticated = !!token;

  // Инициализируем стор при первом запуске
  useEffect(() => {
    init();
  }, [init]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

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
          <Route
            path="/patients"
            element={
              <ProtectedRoute allowedRoles={['doctor', 'admin']}>
                <PatientsTable />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}