import { useState } from 'react';
import { useAuthStore } from '../../store/store';
import AdminScheduleView from './AdminScheduleView';
import SupervisorDashboard from '../Supervisor/SupervisorDashboard';

export default function AdminWrapper() {
  const [view, setView] = useState('schedule');

  if (view === 'supervisor') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a' }}>
        <div style={{ background: '#1e293b', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)', position: 'sticky', top: 0, zIndex: 200 }}>
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
