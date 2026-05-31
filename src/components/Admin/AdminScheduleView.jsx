import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/store';
import { supabase } from '../../lib/supabase';

// ─── Helpers ────────────────────────────────────────────────────────────────

function toDateStr(date) {
  return date.toISOString().split('T')[0];
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function formatMonthYear(date) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function formatDay(date) {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatShortDate(date) {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
}

function getMonthYearStr(date) {
  return date.toLocaleDateString('en-US', { month: 'long' }).replace(' ', '') +
    date.getFullYear().toString().slice(2);
}

function isToday(date) {
  return toDateStr(date) === toDateStr(new Date());
}

// Load is "ready" if it has customer, barrel_count, ship_date, and barrel specs
function isLoadReady(load) {
  const hasSpecs = (load.barrel_specs_custom && load.barrel_specs_custom.length > 0) ||
    (load.barrel_spec_ids && load.barrel_spec_ids.length > 0);
  return load.customer_id && load.barrel_count && load.ship_date && hasSpecs;
}

const STATUS_CONFIG = {
  scheduled: { label: 'Scheduled', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  in_process: { label: 'In Process', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  completed: { label: 'Completed', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  pickup_ready: { label: 'Pickup Ready', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
};

const CATEGORY_COLORS = {
  core: '#10b981',
  craft: '#f59e0b',
  freight: '#3b82f6',
  ltl_spot: '#8b5cf6',
};

// ─── Status Badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.scheduled;
  return (
    <span style={{
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.color}40`,
      padding: '2px 8px', borderRadius: '20px',
      fontSize: '10px', fontWeight: '700',
      textTransform: 'uppercase', letterSpacing: '0.04em',
      whiteSpace: 'nowrap',
    }}>{cfg.label}</span>
  );
}

// ─── New Load Modal ───────────────────────────────────────────────────────────

function NewLoadModal({ customers, carriers, defaultDate, onClose, onSave, userId }) {
  const [customerId, setCustomerId] = useState('');
  const [shipDate, setShipDate] = useState(defaultDate || toDateStr(new Date()));
  const [barrelCount, setBarrelCount] = useState(288);
  const [poNumber, setPoNumber] = useState('');
  const [carrierId, setCarrierId] = useState('');
  const [notes, setNotes] = useState('');
  const [specs, setSpecs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selectedCustomer = customers.find(c => c.id === customerId);

  // Auto-fill when customer selected
  useEffect(() => {
    if (!customerId) return;
    const cust = customers.find(c => c.id === customerId);
    if (!cust) return;
    if (cust.default_carrier_id) setCarrierId(cust.default_carrier_id);

    // Fetch barrel specs for this customer
    supabase
      .from('barrel_specs')
      .select('*')
      .eq('customer_id', customerId)
      .eq('active', true)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setSpecs(data.map(s => ({
            id: s.id,
            size: s.size,
            wood: s.wood,
            char_level: s.char_level,
            toast_level: s.toast_level,
            aged_months: s.aged_months,
            galvanized: s.galvanized,
            bung_orientation: s.bung_orientation,
            quantity: barrelCount,
          })));
        } else {
          setSpecs([]);
        }
      });
  }, [customerId]);

  const handleSave = async () => {
    if (!customerId) { setError('Please select a customer'); return; }
    if (!shipDate) { setError('Please select a ship date'); return; }
    if (!barrelCount || barrelCount < 1) { setError('Please enter barrel count'); return; }
    if (barrelCount > 288) { setError('Max 288 barrels per load. Split into multiple loads.'); return; }

    setSaving(true);
    setError('');

    const date = new Date(shipDate);
    const monthYear = getMonthYearStr(date);

    // Get next BOL sequence
    const { data: seqData } = await supabase
      .from('loads')
      .select('bol_sequence')
      .eq('bol_month_year', monthYear)
      .order('bol_sequence', { ascending: false })
      .limit(1);

    const nextSeq = (seqData?.[0]?.bol_sequence || 0) + 1;
    const bolNumber = `${monthYear}-${String(nextSeq).padStart(3, '0')}`;

    const shipAddress = selectedCustomer?.shipping_address || null;

    const { error: insertError } = await supabase.from('loads').insert([{
      customer_id: customerId,
      ship_date: shipDate,
      po_number: poNumber || null,
      barrel_count: parseInt(barrelCount),
      barrel_specs_custom: specs.length > 0 ? specs : null,
      status: 'scheduled',
      bol_number: bolNumber,
      bol_month_year: monthYear,
      bol_sequence: nextSeq,
      carrier_id: carrierId || null,
      ship_to_address: shipAddress,
      notes: notes || null,
      created_by_id: userId,
      updated_by_id: userId,
    }]);

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
    } else {
      onSave();
    }
  };

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

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    }}>
      <div style={{
        background: '#1e293b', border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '520px',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ color: '#f1f5f9', fontSize: '18px', fontWeight: '700', margin: 0 }}>
            Add New Load
          </h2>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.06)', border: 'none', color: '#94a3b8',
            width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', fontSize: '18px',
          }}>×</button>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '8px', padding: '10px 14px', color: '#ef4444',
            fontSize: '13px', marginBottom: '16px',
          }}>{error}</div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Customer */}
          <div>
            <label style={labelStyle}>Customer *</label>
            <select value={customerId} onChange={e => setCustomerId(e.target.value)} style={{ ...inputStyle, background: '#0f172a', cursor: 'pointer' }}>
              <option value="">Select customer...</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Ship Date + Barrel Count */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Ship Date *</label>
              <input type="date" value={shipDate} onChange={e => setShipDate(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Barrel Count *</label>
              <input
                type="number" min="1" max="288"
                value={barrelCount}
                onChange={e => setBarrelCount(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {barrelCount > 288 && (
            <div style={{ color: '#f59e0b', fontSize: '12px', background: 'rgba(245,158,11,0.1)', padding: '8px 12px', borderRadius: '6px' }}>
              ⚠ Over 288 barrels. Consider splitting into {Math.ceil(barrelCount / 288)} loads of 288.
            </div>
          )}

          {/* PO Number + Carrier */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>PO Number</label>
              <input type="text" value={poNumber} onChange={e => setPoNumber(e.target.value)} placeholder="Optional" style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Carrier</label>
              <select value={carrierId} onChange={e => setCarrierId(e.target.value)} style={{ ...inputStyle, background: '#0f172a', cursor: 'pointer' }}>
                <option value="">Select carrier...</option>
                {carriers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Barrel Specs */}
          <div>
            <label style={labelStyle}>Barrel Specs</label>
            {specs.length > 0 ? (
              <div style={{
                background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)',
                borderRadius: '8px', padding: '12px',
              }}>
                <div style={{ color: '#34d399', fontSize: '12px', fontWeight: '600', marginBottom: '8px' }}>
                  ✓ Auto-filled from customer profile
                </div>
                {specs.map((s, i) => (
                  <div key={i} style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>
                    • {s.size} {s.wood}
                    {s.char_level && ` — ${s.char_level}`}
                    {s.bung_orientation && ` — ${s.bung_orientation}`}
                    {s.toast_level && ` — Toast: ${s.toast_level}`}
                    {s.aged_months && ` — ${s.aged_months}M aged`}
                    {s.galvanized && ` — Galvanized`}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)',
                borderRadius: '8px', padding: '12px',
              }}>
                <div style={{ color: '#f59e0b', fontSize: '12px' }}>
                  {customerId
                    ? '⚠ No specs on file for this customer. Add specs to customer profile first, or this load will be incomplete.'
                    : 'Select a customer to auto-fill specs.'}
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any special instructions..."
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>
        </div>

        {/* Ready indicator */}
        {customerId && barrelCount && shipDate && (
          <div style={{
            marginTop: '16px',
            background: specs.length > 0 ? 'rgba(16,185,129,0.06)' : 'rgba(245,158,11,0.06)',
            border: `1px solid ${specs.length > 0 ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`,
            borderRadius: '8px', padding: '10px 14px',
            color: specs.length > 0 ? '#34d399' : '#f59e0b',
            fontSize: '12px', fontWeight: '600',
          }}>
            {specs.length > 0
              ? '✓ Load is complete — supervisor can process this order'
              : '⚠ Load is incomplete — supervisor will not be able to process until specs are added'}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '11px', background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
            color: '#94a3b8', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
          }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{
            flex: 2, padding: '11px', background: '#c4a35a',
            border: 'none', borderRadius: '8px',
            color: '#1a1a1a', fontSize: '14px', fontWeight: '700',
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1, fontFamily: 'inherit',
          }}>
            {saving ? 'Adding...' : 'Add Load'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Load Card (used in both week and month view) ────────────────────────────

function LoadCard({ load, onClick, compact }) {
  const color = load.customer?.category
    ? CATEGORY_COLORS[load.customer.category] || '#6b7280'
    : '#6b7280';

  return (
    <div
      onClick={() => onClick(load)}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid rgba(255,255,255,0.08)`,
        borderLeft: `3px solid ${color}`,
        borderRadius: '6px',
        padding: compact ? '6px 8px' : '10px 12px',
        cursor: 'pointer',
        marginBottom: '4px',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ color: '#e2e8f0', fontSize: compact ? '11px' : '13px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {load.customer?.name || '—'}
          </div>
          {!compact && (
            <div style={{ color: '#64748b', fontSize: '11px', marginTop: '2px' }}>
              {load.barrel_count} bbls {load.bol_number ? `• ${load.bol_number}` : ''}
            </div>
          )}
          {compact && (
            <div style={{ color: '#64748b', fontSize: '10px' }}>{load.barrel_count} bbls</div>
          )}
        </div>
        {!compact && <StatusBadge status={load.status} />}
        {!isLoadReady(load) && (
          <span style={{ color: '#f59e0b', fontSize: '12px', flexShrink: 0 }} title="Incomplete load">⚠</span>
        )}
      </div>
    </div>
  );
}

// ─── Load Detail Panel ────────────────────────────────────────────────────────

function LoadDetailPanel({ load, onClose, onRefresh, userId }) {
  const [editing, setEditing] = useState(false);
  const [shipDate, setShipDate] = useState(load.ship_date);
  const [poNumber, setPoNumber] = useState(load.po_number || '');
  const [barrelCount, setBarrelCount] = useState(load.barrel_count);
  const [notes, setNotes] = useState(load.notes || '');
  const [status, setStatus] = useState(load.status);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await supabase.from('loads').update({
      ship_date: shipDate,
      po_number: poNumber || null,
      barrel_count: parseInt(barrelCount),
      notes: notes || null,
      status,
      updated_by_id: userId,
      updated_at: new Date().toISOString(),
    }).eq('id', load.id);
    setSaving(false);
    setEditing(false);
    onRefresh();
  };

  const handleDelete = async () => {
    if (!confirm('Delete this load? This cannot be undone.')) return;
    setDeleting(true);
    await supabase.from('loads').delete().eq('id', load.id);
    setDeleting(false);
    onClose();
    onRefresh();
  };

  const inputStyle = {
    width: '100%', background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px',
    padding: '8px 12px', color: '#f1f5f9', fontSize: '13px',
    outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  };

  const ready = isLoadReady(load);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    }}>
      <div style={{
        background: '#1e293b', border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '500px',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <h2 style={{ color: '#f1f5f9', fontSize: '18px', fontWeight: '700', margin: '0 0 4px' }}>
              {load.customer?.name || '—'}
            </h2>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {load.bol_number && (
                <span style={{ color: '#c4a35a', fontSize: '13px', fontWeight: '600' }}>{load.bol_number}</span>
              )}
              <StatusBadge status={load.status} />
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.06)', border: 'none', color: '#94a3b8',
            width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', fontSize: '18px',
          }}>×</button>
        </div>

        {/* Ready indicator */}
        <div style={{
          background: ready ? 'rgba(16,185,129,0.06)' : 'rgba(245,158,11,0.06)',
          border: `1px solid ${ready ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`,
          borderRadius: '8px', padding: '10px 14px', marginBottom: '20px',
          color: ready ? '#34d399' : '#f59e0b', fontSize: '12px', fontWeight: '600',
        }}>
          {ready
            ? '✓ Complete — supervisor can process this load'
            : '⚠ Incomplete — missing specs or info. Supervisor cannot process.'}
        </div>

        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '11px', fontWeight: '600', marginBottom: '5px', textTransform: 'uppercase' }}>Ship Date</label>
                <input type="date" value={shipDate} onChange={e => setShipDate(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '11px', fontWeight: '600', marginBottom: '5px', textTransform: 'uppercase' }}>Barrels</label>
                <input type="number" min="1" max="288" value={barrelCount} onChange={e => setBarrelCount(e.target.value)} style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '11px', fontWeight: '600', marginBottom: '5px', textTransform: 'uppercase' }}>PO Number</label>
              <input type="text" value={poNumber} onChange={e => setPoNumber(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '11px', fontWeight: '600', marginBottom: '5px', textTransform: 'uppercase' }}>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} style={{ ...inputStyle, background: '#0f172a', cursor: 'pointer' }}>
                <option value="scheduled">Scheduled</option>
                <option value="in_process">In Process</option>
                <option value="completed">Completed</option>
                <option value="pickup_ready">Pickup Ready</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '11px', fontWeight: '600', marginBottom: '5px', textTransform: 'uppercase' }}>Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setEditing(false)} style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#94a3b8', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '10px', background: '#c4a35a', border: 'none', borderRadius: '8px', color: '#1a1a1a', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              {[
                { label: 'Ship Date', value: new Date(load.ship_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) },
                { label: 'Barrels', value: `${load.barrel_count} bbls` },
                { label: 'PO Number', value: load.po_number || '—' },
                { label: 'Carrier', value: load.carrier?.name || '—' },
                { label: 'Trailer', value: load.trailer_number || 'Not assigned' },
                { label: 'Seal', value: load.seal_number || 'Not assigned' },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b', fontSize: '13px' }}>{label}</span>
                  <span style={{ color: '#e2e8f0', fontSize: '13px', fontWeight: '500' }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Specs */}
            {load.barrel_specs_custom && load.barrel_specs_custom.length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '12px', marginBottom: '20px' }}>
                <div style={{ color: '#94a3b8', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Barrel Specs</div>
                {load.barrel_specs_custom.map((s, i) => (
                  <div key={i} style={{ color: '#cbd5e1', fontSize: '12px', marginBottom: '4px' }}>
                    • {s.size} {s.wood}
                    {s.char_level && ` — ${s.char_level}`}
                    {s.bung_orientation && ` — ${s.bung_orientation}`}
                  </div>
                ))}
              </div>
            )}

            {load.notes && (
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '12px', marginBottom: '20px' }}>
                <div style={{ color: '#94a3b8', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>Notes</div>
                <div style={{ color: '#cbd5e1', fontSize: '13px' }}>{load.notes}</div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, padding: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: '#ef4444', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
              <button onClick={() => setEditing(true)} style={{ flex: 2, padding: '10px', background: '#c4a35a', border: 'none', borderRadius: '8px', color: '#1a1a1a', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
                Edit Load
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Week View ────────────────────────────────────────────────────────────────

function WeekView({ loads, weekStart, onLoadClick, onAddLoad }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
      {days.map(day => {
        const dateStr = toDateStr(day);
        const dayLoads = loads.filter(l => l.ship_date === dateStr);
        const totalBarrels = dayLoads.reduce((s, l) => s + (l.barrel_count || 0), 0);
        const today = isToday(day);

        return (
          <div key={dateStr} style={{
            background: today ? 'rgba(196,163,90,0.06)' : 'rgba(255,255,255,0.02)',
            border: `1px solid ${today ? 'rgba(196,163,90,0.3)' : 'rgba(255,255,255,0.07)'}`,
            borderRadius: '10px', padding: '10px', minHeight: '200px',
          }}>
            <div style={{ marginBottom: '8px' }}>
              <div style={{ color: today ? '#c4a35a' : '#94a3b8', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>
                {day.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              <div style={{ color: today ? '#c4a35a' : '#f1f5f9', fontSize: '18px', fontWeight: '800', lineHeight: 1 }}>
                {day.getDate()}
              </div>
              {totalBarrels > 0 && (
                <div style={{ color: '#475569', fontSize: '10px' }}>{totalBarrels.toLocaleString()} bbls</div>
              )}
            </div>

            {dayLoads.map(load => (
              <LoadCard key={load.id} load={load} onClick={onLoadClick} compact />
            ))}

            <button
              onClick={() => onAddLoad(dateStr)}
              style={{
                width: '100%', padding: '6px', background: 'transparent',
                border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '6px',
                color: '#475569', fontSize: '11px', cursor: 'pointer',
                marginTop: '4px', fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(196,163,90,0.4)'; e.currentTarget.style.color = '#c4a35a'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#475569'; }}
            >
              + Add
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Month View ───────────────────────────────────────────────────────────────

function MonthView({ loads, currentDate, onLoadClick, onAddLoad }) {
  const start = startOfMonth(currentDate);
  const end = endOfMonth(currentDate);
  const startPad = start.getDay();

  const days = [];
  for (let i = 0; i < startPad; i++) days.push(null);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }

  return (
    <div>
      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} style={{ color: '#475569', fontSize: '11px', fontWeight: '700', textAlign: 'center', padding: '4px 0', textTransform: 'uppercase' }}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {days.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;
          const dateStr = toDateStr(day);
          const dayLoads = loads.filter(l => l.ship_date === dateStr);
          const today = isToday(day);

          return (
            <div key={dateStr} style={{
              background: today ? 'rgba(196,163,90,0.06)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${today ? 'rgba(196,163,90,0.3)' : 'rgba(255,255,255,0.06)'}`,
              borderRadius: '8px', padding: '6px', minHeight: '90px',
            }}>
              <div style={{ color: today ? '#c4a35a' : '#94a3b8', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>
                {day.getDate()}
              </div>
              {dayLoads.slice(0, 2).map(load => (
                <LoadCard key={load.id} load={load} onClick={onLoadClick} compact />
              ))}
              {dayLoads.length > 2 && (
                <div style={{ color: '#475569', fontSize: '10px', padding: '2px 4px' }}>+{dayLoads.length - 2} more</div>
              )}
              <button
                onClick={() => onAddLoad(dateStr)}
                style={{
                  width: '100%', padding: '2px', background: 'transparent',
                  border: 'none', color: '#334155', fontSize: '14px', cursor: 'pointer',
                  lineHeight: 1,
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#c4a35a'}
                onMouseLeave={e => e.currentTarget.style.color = '#334155'}
              >+</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Admin Schedule View ─────────────────────────────────────────────────

export default function AdminScheduleView() {
  const logout = useAuthStore(s => s.logout);
  const user = useAuthStore(s => s.user);

  const [viewMode, setViewMode] = useState('week'); // 'week' | 'month'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loads, setLoads] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [carriers, setCarriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewLoad, setShowNewLoad] = useState(false);
  const [newLoadDate, setNewLoadDate] = useState(null);
  const [selectedLoad, setSelectedLoad] = useState(null);

  const weekStart = startOfWeek(currentDate);
  const weekEnd = addDays(weekStart, 6);
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  const rangeStart = viewMode === 'week' ? weekStart : monthStart;
  const rangeEnd = viewMode === 'week' ? weekEnd : monthEnd;

  const fetchLoads = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('loads')
      .select('*, customer:customers(*), carrier:carriers(*)')
      .gte('ship_date', toDateStr(rangeStart))
      .lte('ship_date', toDateStr(rangeEnd))
      .order('ship_date');
    setLoads(data || []);
    setLoading(false);
  };

  const fetchMeta = async () => {
    const [{ data: custs }, { data: cars }] = await Promise.all([
      supabase.from('customers').select('*').eq('active', true).order('name'),
      supabase.from('carriers').select('*').eq('active', true).order('name'),
    ]);
    setCustomers(custs || []);
    setCarriers(cars || []);
  };

  useEffect(() => { fetchMeta(); }, []);
  useEffect(() => { fetchLoads(); }, [currentDate, viewMode]);

  const navigate = (dir) => {
    const d = new Date(currentDate);
    if (viewMode === 'week') d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCurrentDate(d);
  };

  const handleAddLoad = (dateStr) => {
    setNewLoadDate(dateStr);
    setShowNewLoad(true);
  };

  // Summary stats for current view
  const totalLoads = loads.length;
  const totalBarrels = loads.reduce((s, l) => s + (l.barrel_count || 0), 0);
  const incompleteLoads = loads.filter(l => !isLoadReady(l)).length;

  const rangeLabel = viewMode === 'week'
    ? `${formatShortDate(weekStart)} — ${formatShortDate(weekEnd)}`
    : formatMonthYear(currentDate);

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0f1a', color: '#f1f5f9',
      fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      {/* Top Bar */}
      <div style={{
        background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: '60px', position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(10px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '20px', fontWeight: '800', color: '#c4a35a', letterSpacing: '-0.03em' }}>
            🛢️ Speyside
          </span>
          <span style={{ color: '#334155' }}>|</span>
          <span style={{ color: '#94a3b8', fontSize: '14px', fontWeight: '500' }}>Admin Schedule</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setShowNewLoad(true)}
            style={{
              background: '#c4a35a', border: 'none', color: '#1a1a1a',
              padding: '8px 18px', borderRadius: '8px', fontSize: '13px',
              fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >+ Add Load</button>
          <button onClick={logout} style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
            color: '#ef4444', padding: '7px 14px', borderRadius: '6px',
            fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
          }}>Sign Out</button>
        </div>
      </div>

      <div style={{ padding: '24px' }}>
        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          {/* Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', width: '34px', height: '34px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' }}>‹</button>
            <span style={{ color: '#f1f5f9', fontWeight: '700', fontSize: '16px', minWidth: '200px', textAlign: 'center' }}>{rangeLabel}</span>
            <button onClick={() => navigate(1)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', width: '34px', height: '34px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' }}>›</button>
            <button onClick={() => setCurrentDate(new Date())} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', padding: '7px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit' }}>Today</button>
          </div>

          {/* View toggle + Stats */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '8px', color: '#64748b', fontSize: '13px' }}>
              <span>{totalLoads} loads</span>
              <span>•</span>
              <span>{totalBarrels.toLocaleString()} bbls</span>
              {incompleteLoads > 0 && (
                <>
                  <span>•</span>
                  <span style={{ color: '#f59e0b' }}>⚠ {incompleteLoads} incomplete</span>
                </>
              )}
            </div>
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '3px' }}>
              {['week', 'month'].map(mode => (
                <button key={mode} onClick={() => setViewMode(mode)} style={{
                  padding: '6px 16px', borderRadius: '6px', border: 'none',
                  background: viewMode === mode ? '#c4a35a' : 'transparent',
                  color: viewMode === mode ? '#1a1a1a' : '#94a3b8',
                  fontWeight: viewMode === mode ? '700' : '500',
                  fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit',
                  textTransform: 'capitalize',
                }}>{mode}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Calendar */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px', color: '#475569' }}>Loading schedule...</div>
        ) : viewMode === 'week' ? (
          <WeekView loads={loads} weekStart={weekStart} onLoadClick={setSelectedLoad} onAddLoad={handleAddLoad} />
        ) : (
          <MonthView loads={loads} currentDate={currentDate} onLoadClick={setSelectedLoad} onAddLoad={handleAddLoad} />
        )}
      </div>

      {/* Modals */}
      {showNewLoad && (
        <NewLoadModal
          customers={customers}
          carriers={carriers}
          defaultDate={newLoadDate}
          userId={user?.id}
          onClose={() => { setShowNewLoad(false); setNewLoadDate(null); }}
          onSave={() => { setShowNewLoad(false); setNewLoadDate(null); fetchLoads(); }}
        />
      )}

      {selectedLoad && (
        <LoadDetailPanel
          load={selectedLoad}
          userId={user?.id}
          onClose={() => setSelectedLoad(null)}
          onRefresh={fetchLoads}
        />
      )}
    </div>
  );
}
