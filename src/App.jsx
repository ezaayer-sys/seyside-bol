import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store/store';
import LoginScreen from './components/Auth/LoginScreen';
import ProtectedRoute from './components/Auth/ProtectedRoute';

const AdminScheduleView = () => <div className="p-8">Admin Schedule View (Coming Soon)</div>;
const SupervisorDashboard = () => <div className="p-8">Supervisor Dashboard (Coming Soon)</div>;
const MonthlyScheduleViewer = () => <div className="p-8">Monthly Schedule Viewer (Coming Soon)</div>;

export default function App() {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/admin/schedule" element={<ProtectedRoute requiredRole="admin"><AdminScheduleView /></ProtectedRoute>} />
        <Route path="/supervisor/dashboard" element={<ProtectedRoute requiredRole="supervisor"><SupervisorDashboard /></ProtectedRoute>} />
        <Route path="/viewer/schedule" element={<ProtectedRoute requiredRole="view_only"><MonthlyScheduleViewer /></ProtectedRoute>} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}
