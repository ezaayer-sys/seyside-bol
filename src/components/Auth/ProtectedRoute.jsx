import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/store';

export default function ProtectedRoute({ children, requiredRole = null }) {
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const loading = useAuthStore((state) => state.loading);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && role !== requiredRole) {
    if (role === 'admin') {
      return <Navigate to="/admin/schedule" replace />;
    } else if (role === 'supervisor') {
      return <Navigate to="/supervisor/dashboard" replace />;
    } else if (role === 'view_only') {
      return <Navigate to="/viewer/schedule" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return children;
}
