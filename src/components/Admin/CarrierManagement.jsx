import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const inputStyle = {
  width: '100%', background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px',
  padding: '9px 12px', color: '#f1f5f9', fontSize: '13px',
  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
};

const labelStyle = {
  display: 'block', color: '#94a3b8', fontSize: '11px',
  fontWeight: '600', marginBottom: '5px',
  textTransform: 'uppercase', letterSpacing: '0.05em',
};

// ─── Carrier Modal ─────────────────────────────────────────────────────────────

function CarrierModal({ carrier, onClose, onSave }) {
  const isNew = !carrier;
  const [name, setName] = useState(carrier?.name || '');
  const [phone, setPhone] = useState(carrier?.phone || '');
  const [email, setEmail] = useState(carrier?.email || '');
  const [contactName, setContactName] = useState(carrier?.contact_name || '');
  const [trailerAllotment, setTrailerAllotment] = useState(carrier?.trailer_allotment || '');
  const [notes, setNotes] = useState(carrier?.notes || '');
  const [active, setActive] = useState(carrier?.active !== false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) { setError('Carrier name is required'); return; }
    setSaving(true);
    setError('');

    const data = {
      name: name.trim(),
      phone: phone || null,
      email: email || null,
      contact_name: contactName || null,
      trailer_allotment: trailerAllotment ? parseInt(trailerAllotment) : null,
      notes: notes || null,
      active,
      updated_at: new Date().toISOString(),
    };

    let err;
    if (isNew) {
      ({ error: err } = await supabase.from('carriers').insert([data]));
    } else {
      ({ error: err } = await supabase.from('carriers').update(data).eq('id', carrier.id));
    }

    setSaving(false);
    if (err) { setError(err.message); return; }
    onSave();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ color: '#f1f5f9', fontSize: '18px', fontWeight: '700', margin: 0 }}>
            {isNew ? 'Add New Carrier' : `Edit — ${carrier.name}`}
          </h2>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#94a3b8', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', fontSize: '18px' }}>×</button>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px 14px', color: '#ef4444', fontSize: '13px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Carrier Name *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Montgomery Transport" style={inputStyle} />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Phone</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="555-000-0000" style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Trailer Allotment</label>
              <input type="number" value={trailerAllotment} onChange={e => setTrailerAllotment(e.target.value)} placeholder="e.g. 35" style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="dispatch@carrier.com" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Contact Name</label>
            <input type="text" value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Primary contact" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any special notes about this carrier..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          {!isNew && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={() => setActive(!active)}
                style={{
                  padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                  background: active ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                  color: active ? '#10b981' : '#ef4444',
                  fontSize: '12px', fontWeight: '600', fontFamily: 'inherit',
                }}
              >
                {active ? '✓ Active' : '✗ Inactive'}
              </button>
              <span style={{ color: '#64748b', fontSize: '12px' }}>
                {active ? 'Carrier is available for loads' : 'Carrier will not appear in dropdowns'}
              </span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '11px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#94a3b8', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '11px', background: '#c4a35a', border: 'none', borderRadius: '8px', color: '#1a1a1a', fontSize: '14px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit' }}>
            {saving ? 'Saving...' : isNew ? 'Add Carrier' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Carrier Management Page ─────────────────────────────────────────────

export default function CarrierManagement({ onBack }) {
  const [carriers, setCarriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingCarrier, setEditingCarrier] = useState(null);
  const [showNewCarrier, setShowNewCarrier] = useState(false);

  const fetchCarriers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('carriers')
      .select('*')
      .order('name');
    if (!error) setCarriers(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchCarriers(); }, []);

  const filtered = carriers.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1a', color: '#f1f5f9', fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      {/* Top Bar */}
      <div style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px', position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(10px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>← Schedule</button>
          <span style={{ color: '#334155' }}>|</span>
          <span style={{ color: '#c4a35a', fontSize: '18px', fontWeight: '800' }}>🚛 Carriers</span>
        </div>
        <button onClick={() => setShowNewCarrier(true)} style={{ background: '#c4a35a', border: 'none', color: '#1a1a1a', padding: '8px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
          + Add Carrier
        </button>
      </div>

      <div style={{ padding: '24px' }}>
        {/* Search */}
        <div style={{ marginBottom: '20px' }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search carriers..."
            style={{ ...inputStyle, maxWidth: '300px' }}
          />
        </div>

        {/* Carrier List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#475569' }}>Loading carriers...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🚛</div>
            <div style={{ color: '#475569', fontSize: '16px', marginBottom: '16px' }}>No carriers found</div>
            <button onClick={() => setShowNewCarrier(true)} style={{ background: '#c4a35a', border: 'none', color: '#1a1a1a', padding: '10px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
              Add First Carrier
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '8px' }}>
            {filtered.map(carrier => (
              <div key={carrier.id} style={{
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
                borderLeft: `3px solid ${carrier.active ? '#c4a35a' : '#475569'}`,
                borderRadius: '10px', padding: '14px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
                opacity: carrier.active ? 1 : 0.6,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <span style={{ color: '#f1f5f9', fontSize: '15px', fontWeight: '700' }}>{carrier.name}</span>
                    {!carrier.active && (
                      <span style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '10px', textTransform: 'uppercase' }}>
                        Inactive
                      </span>
                    )}
                    {carrier.trailer_allotment && (
                      <span style={{ background: 'rgba(196,163,90,0.15)', color: '#c4a35a', border: '1px solid rgba(196,163,90,0.3)', fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '10px' }}>
                        {carrier.trailer_allotment} trailers
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    {carrier.phone && <span style={{ color: '#64748b', fontSize: '12px' }}>📞 {carrier.phone}</span>}
                    {carrier.email && <span style={{ color: '#64748b', fontSize: '12px' }}>✉️ {carrier.email}</span>}
                    {carrier.contact_name && <span style={{ color: '#64748b', fontSize: '12px' }}>👤 {carrier.contact_name}</span>}
                  </div>
                  {carrier.notes && (
                    <div style={{ color: '#475569', fontSize: '12px', marginTop: '4px' }}>{carrier.notes}</div>
                  )}
                </div>
                <button
                  onClick={() => setEditingCarrier(carrier)}
                  style={{ background: 'rgba(196,163,90,0.15)', border: '1px solid rgba(196,163,90,0.3)', color: '#c4a35a', padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
                >
                  Edit
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showNewCarrier && (
        <CarrierModal carrier={null} onClose={() => setShowNewCarrier(false)} onSave={() => { setShowNewCarrier(false); fetchCarriers(); }} />
      )}

      {editingCarrier && (
        <CarrierModal carrier={editingCarrier} onClose={() => setEditingCarrier(null)} onSave={() => { setEditingCarrier(null); fetchCarriers(); }} />
      )}
    </div>
  );
}
