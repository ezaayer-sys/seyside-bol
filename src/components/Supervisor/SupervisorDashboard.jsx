import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/store';
import { supabase } from '../../lib/supabase';

const CUSTOMER_COLORS = {
  'MGPI': '#ef4444',
  'Diageo MGPI': '#f97316',
  'Wild Turkey': '#10b981',
  'Middle West': '#3b82f6',
  'Buffalo Trace': '#8b5cf6',
  'Heaven Hill': '#ec4899',
  'Four Roses': '#f59e0b',
  'Sazerac': '#06b6d4',
  'default': '#6b7280',
};

const STATUS_CONFIG = {
  scheduled: { label: 'Scheduled', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  in_process: { label: 'In Process', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  completed: { label: 'Completed', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  pickup_ready: { label: 'Pickup Ready', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
};

const CATEGORY_ORDER = ['core', 'craft', 'freight', 'ltl_spot'];
const CATEGORY_LABELS = {
  core: 'Core Customers',
  craft: 'Craft / Small Orders',
  freight: 'Freight Customers',
  ltl_spot: 'LTL / Spot',
};
const CATEGORY_ICONS = {
  core: '🏭',
  craft: '☕',
  freight: '📦',
  ltl_spot: '🚛',
};

function getCustomerColor(name) {
  return CUSTOMER_COLORS[name] || CUSTOMER_COLORS['default'];
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function toDateString(date) {
  return date.toISOString().split('T')[0];
}

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.scheduled;
  return (
    <span style={{
      background: config.bg,
      color: config.color,
      border: `1px solid ${config.color}40`,
      padding: '3px 10px',
      borderRadius: '20px',
      fontSize: '11px',
      fontWeight: '600',
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
    }}>
      {config.label}
    </span>
  );
}

function StatCard({ icon, label, value, color, sub }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '12px',
      padding: '18px 20px',
      flex: 1,
      minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <span style={{ fontSize: '22px' }}>{icon}</span>
        <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      </div>
      <div style={{ fontSize: '28px', fontWeight: '700', color: color || '#f1f5f9', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>{sub}</div>}
    </div>
  );
}

function LoadEditModal({ load, onClose, onSave }) {
  const [trailer, setTrailer] = useState(load.trailer_number || '');
  const [seal, setSeal] = useState(load.seal_number || '');
  const [status, setStatus] = useState(load.status || 'scheduled');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const updates = {
      trailer_number: trailer,
      seal_number: seal,
      status,
      updated_at: new Date().toISOString(),
    };
    if (status === 'in_process' && !load.started_at) {
      updates.started_at = new Date().toISOString();
    }
    if ((status === 'completed' || status === 'pickup_ready') && !load.completed_at) {
      updates.completed_at = new Date().toISOString();
    }
    const { error } = await supabase.from('loads').update(updates).eq('id', load.id);
    setSaving(false);
    if (!error) onSave();
  };

  const specLines = load.barrel_specs_custom
    ? load.barrel_specs_custom.map(s => `${s.quantity || ''} × ${s.size || ''} ${s.wood || ''}`).join(' | ')
    : `${load.barrel_count} bbls`;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    }}>
      <div style={{
        background: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px',
        padding: '28px', width: '100%', maxWidth: '480px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <h2 style={{ color: '#f1f5f9', fontSize: '18px', fontWeight: '700', margin: 0 }}>
              {load.customer?.name || 'Load'}
            </h2>
            <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0' }}>
              {load.bol_number || 'No BOL'} • PO: {load.po_number || '—'}
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.06)', border: 'none', color: '#94a3b8',
            width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer',
            fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>×</button>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '12px 14px',
          marginBottom: '20px', fontSize: '13px', color: '#94a3b8',
        }}>
          <strong style={{ color: '#cbd5e1' }}>Specs:</strong> {specLines}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', fontWeight: '600', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Trailer Number (Shipper No.)
            </label>
            <input
              value={trailer}
              onChange={e => setTrailer(e.target.value)}
              placeholder="Enter trailer number"
              style={{
                width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '8px', padding: '10px 14px', color: '#f1f5f9', fontSize: '14px',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', fontWeight: '600', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Seal Number
            </label>
            <input
              value={seal}
              onChange={e => setSeal(e.target.value)}
              placeholder="Enter seal number"
              style={{
                width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '8px', padding: '10px 14px', color: '#f1f5f9', fontSize: '14px',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', fontWeight: '600', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Status
            </label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              style={{
                width: '100%', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '8px', padding: '10px 14px', color: '#f1f5f9', fontSize: '14px',
                outline: 'none', boxSizing: 'border-box', cursor: 'pointer',
              }}
            >
              <option value="scheduled">Scheduled</option>
              <option value="in_process">In Process</option>
              <option value="completed">Completed</option>
              <option value="pickup_ready">Pickup Ready</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '11px', background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
            color: '#94a3b8', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
          }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} style={{
            flex: 2, padding: '11px', background: '#c4a35a',
            border: 'none', borderRadius: '8px',
            color: '#1a1a1a', fontSize: '14px', fontWeight: '700', cursor: 'pointer',
            opacity: saving ? 0.7 : 1,
          }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function LoadRow({ load, onEdit }) {
  const color = getCustomerColor(load.customer?.name);
  const missingTrailer = !load.trailer_number;
  const missingSeal = !load.seal_number;
  const hasAlert = missingTrailer || missingSeal;

  const specLines = load.barrel_specs_custom
    ? load.barrel_specs_custom.map(s => `${s.quantity || ''} × ${s.size || ''} ${s.wood || ''}`).join(' | ')
    : null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '12px 16px',
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderLeft: `3px solid ${color}`,
      borderRadius: '8px',
      marginBottom: '6px',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: specLines ? '4px' : 0 }}>
          <span style={{ color: '#f1f5f9', fontSize: '14px', fontWeight: '600' }}>
            {load.customer?.name || '—'}
          </span>
          {load.po_number && (
            <span style={{ color: '#64748b', fontSize: '12px' }}>PO {load.po_number}</span>
          )}
          {hasAlert && (
            <span style={{
              background: 'rgba(239,68,68,0.15)', color: '#ef4444',
              border: '1px solid rgba(239,68,68,0.3)',
              fontSize: '10px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              ⚠ Incomplete
            </span>
          )}
        </div>
        {specLines && (
          <div style={{ fontSize: '11px', color: '#64748b' }}>{specLines}</div>
        )}
        <div style={{ display: 'flex', gap: '14px', marginTop: '4px' }}>
          <span style={{ fontSize: '12px', color: load.trailer_number ? '#94a3b8' : '#ef4444' }}>
            🚛 {load.trailer_number || 'No trailer'}
          </span>
          <span style={{ fontSize: '12px', color: load.seal_number ? '#94a3b8' : '#ef4444' }}>
            🔒 {load.seal_number || 'No seal'}
          </span>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            📦 {load.barrel_count} bbls
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <StatusBadge status={load.status} />
        <button
          onClick={() => onEdit(load)}
          style={{
            background: 'rgba(196,163,90,0.15)', border: '1px solid rgba(196,163,90,0.3)',
            color: '#c4a35a', padding: '6px 14px', borderRadius: '6px',
            fontSize: '12px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap',
          }}
        >
          Edit
        </button>
      </div>
    </div>
  );
}

function CategoryGroup({ category, loads, onEdit }) {
  const [collapsed, setCollapsed] = useState(false);
  const totalBarrels = loads.reduce((sum, l) => sum + (l.barrel_count || 0), 0);

  return (
    <div style={{ marginBottom: '20px' }}>
      <div
        onClick={() => setCollapsed(!collapsed)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px',
          marginBottom: collapsed ? 0 : '8px', cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '16px' }}>{CATEGORY_ICONS[category]}</span>
          <span style={{ color: '#f1f5f9', fontWeight: '600', fontSize: '14px' }}>
            {CATEGORY_LABELS[category]}
          </span>
          <span style={{
            background: 'rgba(255,255,255,0.08)', color: '#94a3b8',
            fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '10px',
          }}>
            {loads.length}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ color: '#64748b', fontSize: '13px' }}>
            📦 {totalBarrels.toLocaleString()} bbls
          </span>
          <span style={{ color: '#64748b', fontSize: '16px' }}>{collapsed ? '▶' : '▼'}</span>
        </div>
      </div>
      {!collapsed && loads.map(load => (
        <LoadRow key={load.id} load={load} onEdit={onEdit} />
      ))}
    </div>
  );
}

export default function SupervisorDashboard() {
  const logout = useAuthStore(s => s.logout);
  const [activeTab, setActiveTab] = useState('today');
  const [loads, setLoads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingLoad, setEditingLoad] = useState(null);
  const [lastSync, setLastSync] = useState(new Date());

  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const activeDate = activeTab === 'today' ? today : tomorrow;
  const activeDateStr = toDateString(activeDate);

  const fetchLoads = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('loads')
      .select('*, customer:customers(*), carrier:carriers(*)')
      .gte('ship_date', toDateString(today))
      .lt('ship_date', toDateString(new Date(tomorrow.getTime() + 86400000)))
      .order('ship_date')
      .order('status');

    if (!error && data) {
      setLoads(data);
      setLastSync(new Date());
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLoads();
    const interval = setInterval(fetchLoads, 120000);
    return () => clearInterval(interval);
  }, []);

  const dayLoads = loads.filter(l => l.ship_date === activeDateStr);

  // Stats
  const totalLoads = dayLoads.length;
  const totalBarrels = dayLoads.reduce((s, l) => s + (l.barrel_count || 0), 0);
  const inProcess = dayLoads.filter(l => l.status === 'in_process').length;
  const completed = dayLoads.filter(l => l.status === 'completed').length;
  const pickupReady = dayLoads.filter(l => l.status === 'pickup_ready').length;

  // Alerts
  const alerts = dayLoads.filter(l => !l.trailer_number || !l.seal_number);

  // Group by category
  const grouped = {};
  dayLoads.forEach(load => {
    const cat = load.customer?.category || 'core';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(load);
  });

  // Top specs
  const specCounts = {};
  dayLoads.forEach(load => {
    if (load.barrel_specs_custom) {
      load.barrel_specs_custom.forEach(s => {
        const key = `${s.size || '53 gal'} ${s.wood || 'Oak'}`;
        specCounts[key] = (specCounts[key] || 0) + (s.quantity || load.barrel_count || 0);
      });
    } else {
      const key = '53 gal American White Oak';
      specCounts[key] = (specCounts[key] || 0) + (load.barrel_count || 0);
    }
  });
  const topSpecs = Object.entries(specCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0f1a',
      color: '#f1f5f9',
      fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      {/* Top Bar */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: '60px', position: 'sticky', top: 0, zIndex: 100,
        backdropFilter: 'blur(10px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '20px', fontWeight: '800', color: '#c4a35a', letterSpacing: '-0.03em' }}>
            🛢️ Speyside
          </span>
          <span style={{ color: '#334155', fontSize: '18px' }}>|</span>
          <span style={{ color: '#94a3b8', fontSize: '14px', fontWeight: '500' }}>Supervisor</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#475569', fontSize: '12px' }}>
            Synced {lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <button onClick={fetchLoads} style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#94a3b8', padding: '6px 12px', borderRadius: '6px',
            fontSize: '12px', cursor: 'pointer',
          }}>↻ Refresh</button>
          <button onClick={logout} style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
            color: '#ef4444', padding: '6px 12px', borderRadius: '6px',
            fontSize: '12px', fontWeight: '600', cursor: 'pointer',
          }}>Sign Out</button>
        </div>
      </div>

      <div style={{ display: 'flex', height: 'calc(100vh - 60px)' }}>
        {/* Main Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {/* Tab Selector */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div style={{ display: 'flex', gap: '0', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '4px' }}>
              {['today', 'tomorrow'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '8px 24px', borderRadius: '7px', border: 'none',
                    background: activeTab === tab ? '#c4a35a' : 'transparent',
                    color: activeTab === tab ? '#1a1a1a' : '#94a3b8',
                    fontWeight: activeTab === tab ? '700' : '500',
                    fontSize: '14px', cursor: 'pointer', transition: 'all 0.15s',
                    fontFamily: 'inherit',
                  }}
                >
                  {tab === 'today' ? `📅 Today` : `📅 Tomorrow`}
                </button>
              ))}
            </div>
            <div style={{ color: '#475569', fontSize: '14px' }}>
              {formatDate(activeDate)}
            </div>
          </div>

          {/* Stat Cards */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '28px', flexWrap: 'wrap' }}>
            <StatCard icon="🚛" label="Total Loads" value={totalLoads} color="#f1f5f9" />
            <StatCard icon="🛢️" label="Barrels to Make" value={totalBarrels.toLocaleString()} color="#c4a35a" sub="today" />
            <StatCard icon="⚙️" label="In Process" value={inProcess} color="#f59e0b" />
            <StatCard icon="✅" label="Completed" value={completed} color="#10b981" />
            <StatCard icon="📤" label="Pickup Ready" value={pickupReady} color="#8b5cf6" />
          </div>

          {/* Load Groups */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#475569' }}>
              Loading loads...
            </div>
          ) : dayLoads.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '60px',
              background: 'rgba(255,255,255,0.02)', borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
              <div style={{ color: '#475569', fontSize: '16px' }}>No loads scheduled for {activeTab}</div>
            </div>
          ) : (
            CATEGORY_ORDER
              .filter(cat => grouped[cat]?.length > 0)
              .map(cat => (
                <CategoryGroup
                  key={cat}
                  category={cat}
                  loads={grouped[cat]}
                  onEdit={setEditingLoad}
                />
              ))
          )}
        </div>

        {/* Right Sidebar */}
        <div style={{
          width: '280px', flexShrink: 0, borderLeft: '1px solid rgba(255,255,255,0.08)',
          overflowY: 'auto', padding: '24px 16px',
          background: 'rgba(255,255,255,0.01)',
        }}>
          {/* Production Overview */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ color: '#94a3b8', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
              Production Overview
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: 'Scheduled', count: dayLoads.filter(l => l.status === 'scheduled').length, color: '#3b82f6' },
                { label: 'In Process', count: inProcess, color: '#f59e0b' },
                { label: 'Completed', count: completed, color: '#10b981' },
                { label: 'Pickup Ready', count: pickupReady, color: '#8b5cf6' },
              ].map(({ label, count, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
                    <span style={{ color: '#94a3b8', fontSize: '13px' }}>{label}</span>
                  </div>
                  <span style={{ color, fontSize: '13px', fontWeight: '700' }}>{count}</span>
                </div>
              ))}
            </div>

            {totalLoads > 0 && (
              <div style={{ marginTop: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: '#64748b', fontSize: '11px' }}>Completion</span>
                  <span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: '600' }}>
                    {Math.round(((completed + pickupReady) / totalLoads) * 100)}%
                  </span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '4px', height: '4px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: '4px', background: '#10b981',
                    width: `${Math.round(((completed + pickupReady) / totalLoads) * 100)}%`,
                    transition: 'width 0.5s ease',
                  }} />
                </div>
              </div>
            )}
          </div>

          {/* Top Specs */}
          {topSpecs.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ color: '#94a3b8', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
                Top Barrel Specs
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {topSpecs.map(([spec, count]) => (
                  <div key={spec} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#94a3b8', fontSize: '12px', flex: 1, marginRight: '8px', lineHeight: 1.3 }}>{spec}</span>
                    <span style={{ color: '#c4a35a', fontSize: '12px', fontWeight: '700', whiteSpace: 'nowrap' }}>
                      {count.toLocaleString()} bbls
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attention Needed */}
          {alerts.length > 0 && (
            <div>
              <h3 style={{
                color: '#ef4444', fontSize: '11px', fontWeight: '700',
                textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                ⚠ Attention Needed
                <span style={{
                  background: '#ef4444', color: '#fff', borderRadius: '10px',
                  fontSize: '10px', fontWeight: '800', padding: '1px 6px',
                }}>{alerts.length}</span>
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {alerts.map(load => (
                  <div
                    key={load.id}
                    onClick={() => setEditingLoad(load)}
                    style={{
                      background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
                      borderRadius: '8px', padding: '10px 12px', cursor: 'pointer',
                    }}
                  >
                    <div style={{ color: '#fca5a5', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                      {load.customer?.name || '—'}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {!load.trailer_number && (
                        <div style={{ color: '#ef4444', fontSize: '11px' }}>• Missing trailer number</div>
                      )}
                      {!load.seal_number && (
                        <div style={{ color: '#ef4444', fontSize: '11px' }}>• Missing seal number</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {alerts.length === 0 && totalLoads > 0 && (
            <div style={{
              background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: '8px', padding: '12px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '20px', marginBottom: '4px' }}>✅</div>
              <div style={{ color: '#34d399', fontSize: '12px', fontWeight: '600' }}>All loads complete</div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingLoad && (
        <LoadEditModal
          load={editingLoad}
          onClose={() => setEditingLoad(null)}
          onSave={() => {
            setEditingLoad(null);
            fetchLoads();
          }}
        />
      )}
    </div>
  );
}
