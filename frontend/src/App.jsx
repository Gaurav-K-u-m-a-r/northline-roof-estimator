import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Estimator from './pages/Estimator.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import AdminPanel from './pages/AdminPanel.jsx';

function isLoggedIn() {
  return Boolean(localStorage.getItem('wantace_admin_token'));
}

function RequireAuth({ children }) {
  if (!isLoggedIn()) return <Navigate to="/admin/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Estimator />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <AdminPanel />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
