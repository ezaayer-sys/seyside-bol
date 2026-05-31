import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store/store';
import LoginScreen from './components/Auth/LoginScreen';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import SupervisorDashboard from './components/Supervisor/SupervisorDashboard';
import AdminWrapper from './components/Admin/AdminWrapper';
import CustomerManagement from './components/Admin/CustomerManagement';
import BolLog from './components/Admin/BolLog';

function MonthlyScheduleViewer() {
  const logout = useAuthStore((state) => state.logout);
  return (
    <div style={{ padding: '40px', color: '#94a3b8', background: '#0a0f1a', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <span style={{ color: '#c4a35a', fontSize: '20px', fontWeight: '800' }}>🛢️ Speyside — Schedule</span>
        <button onClick={logout} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Sign Out</button>
      </div>
      <div style={{ color: '#475569', fontSize: '16px' }}>Monthly Schedule Viewer — Coming Soon</div>
    </div>
  );
}

export default function App() {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/admin/schedule" element={<ProtectedRoute requiredRole="admin"><AdminWrapper /></ProtectedRoute>} />
        <Route path="/admin/customers" element={<ProtectedRoute requiredRole="admin"><CustomerManagement onBack={() => window.location.href = '/admin/schedule'} /></ProtectedRoute>} />
        <Route path="/admin/bol-log" element={<ProtectedRoute requiredRole="admin"><BolLog onBack={() => window.location.href = '/admin/schedule'} /></ProtectedRoute>} />
        <Route path="/supervisor/dashboard" element={<ProtectedRoute requiredRole="supervisor"><SupervisorDashboard /></ProtectedRoute>} />
        <Route path="/viewer/schedule" element={<ProtectedRoute requiredRole="view_only"><MonthlyScheduleViewer /></ProtectedRoute>} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}
