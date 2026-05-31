import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthStore } from './store/store';
import LoginScreen from './components/Auth/LoginScreen';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import SupervisorDashboard from './components/Supervisor/SupervisorDashboard';
import AdminScheduleView from './components/Admin/AdminScheduleView';
import CustomerManagement from './components/Admin/CustomerManagement';
import BolLog from './components/Admin/BolLog';

// Admin wrapper with view switcher
function AdminWrapper() {
  const [view, setView] = useState('schedule');
  const logout = useAuthStore(s => s.logout);

  if (view === 'supervisor') {
    return (
      <div>
        <div style={{ background: '#1e293b', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <span style={{ color: '#c4a35a', fontSize: '13px', fontWeight: '600' }}>👁️ Viewing as Supervisor</span>
          <select
            value={view}
            onChange={e => setView(e.target.value)}
            style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', padding: '4px 10px', color: '#f1f5f9', fontSize: '12px', outline: 'none', cursor: 'pointer' }}
          >
            <option value="schedule">Admin Schedule</option>
            <option value="supervisor">Supervisor View</option>
          </select>
        </div>
        <SupervisorDashboard adminMode />
      </div>
    );
  }

  return <AdminScheduleView onViewChange={setView} currentView={view} />;
}

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
