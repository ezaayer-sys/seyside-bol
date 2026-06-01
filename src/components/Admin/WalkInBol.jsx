import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { BolModal } from './BolModal';

// ─── Walk-in BOL Modal ────────────────────────────────────────────────────────
// Quick BOL for walk-in / cash sales - no scheduling needed

export default function WalkInBol({ onClose }) {
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [customCustomerName, setCustomCustomerName] = useState('');
  const [barrelCount, setBarrelCount] = useState(288);
  const [specs, setSpecs] = useState([]);
  const [carrierId, setCarrierId] = useState('');
  const [carriers, setCarriers] = useState([]);
  const [poNumber, setPoNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemQuantity, setItemQuantity] = useState('');
  const [itemUnit, setItemUnit] = useState('Barrels');
  const [isBarrels, setIsBarrels] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showBolPrint, setShowBolPrint] = useState(false);
  const [createdLoad, setCreatedLoad] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: custs }, { data: cars }] = await Promise.all([
        supabase.from('customers').select('*, barrel_specs(*)').eq('active', true).order('name'),
        supabase.from('carriers').select('*').eq('active', true).order('name'),
      ]);
      setCustomers(custs || []);
      setCarriers(cars || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  // Auto-fill specs when customer selected
  useEffect(() => {
    if (!customerId) { setSpecs([]); return; }
    const cust = customers.find(c => c.id === customerId);
    if (cust?.barrel_specs?.length > 0) {
      setSpecs(cust.barrel_specs);
    } else {
      setSpecs([]);
    }
    if (cust?.default_carrier_id) setCarrierId(cust.default_carrier_id);
  }, [customerId, customers]);

  const handleCreateBol = async () => {
    const finalCustomerName = customerId
      ? customers.find(c => c.id === customerId)?.name
      : customCustomerName.trim();

    if (!finalCustomerName) { setError('Please enter a customer name'); return; }
    if (isBarrels && (!barrelCount || barrelCount < 1)) { setError('Please enter barrel count'); return; }
    if (!isBarrels && !itemDescription.trim()) { setError('Please enter item description'); return; }
    if (!isBarrels && !itemQuantity.trim()) { setError('Please enter quantity'); return; }

    setSaving(true);
    setError('');

    const { data: { user } } = await supabase.auth.getUser();
    const today = new Date();
    const shipDate = today.toISOString().split('T')[0];

    // Generate BOL number
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const monthYear = monthNames[today.getMonth()] + String(today.getFullYear()).slice(2);

    const { data: seqData } = await supabase
      .from('loads')
      .select('bol_sequence')
      .eq('bol_month_year', monthYear)
      .order('bol_sequence', { ascending: false })
      .limit(1);

    const nextSeq = (seqData?.[0]?.bol_sequence || 0) + 1;
    const bolNumber = `${monthYear}-${String(nextSeq).padStart(3, '0')}`;

    // Get customer details if selected
    const selectedCustomer = customerId ? customers.find(c => c.id === customerId) : null;
    const shipAddress = selectedCustomer?.shipping_address || null;

    // Create the load
    // Build specs/description for non-barrel items
    const customSpecs = !isBarrels ? [{ size: itemQuantity + ' ' + itemUnit, wood: itemDescription, char_level: null, bung_orientation: null }] : (specs.length > 0 ? specs : null);
    const finalBarrelCount = isBarrels ? parseInt(barrelCount) : 1;

    const loadData = {
      customer_id: customerId || null,
      ship_date: shipDate,
      po_number: poNumber || null,
      barrel_count: finalBarrelCount,
      barrel_specs_custom: customSpecs,
      status: 'scheduled',
      bol_number: bolNumber,
      bol_month_year: monthYear,
      bol_sequence: nextSeq,
      carrier_id: carrierId || null,
      ship_to_address: shipAddress,
      notes: notes || 'Walk-in / Cash Sale',
      created_by_id: user.id,
      updated_by_id: user.id,
    };

    const { data: loadResult, error: loadError } = await supabase
      .from('loads')
      .insert([loadData])
      .select('*, customer:customers(*), carrier:carriers(*)')
      .single();

    if (loadError) {
      setError(loadError.message);
      setSaving(false);
      return;
    }

    // If no customer selected, patch customer name for BOL display
    if (!customerId && customCustomerName) {
      loadResult.customer = { name: customCustomerName, shipping_address: null };
    }

    setSaving(false);
    setCreatedLoad(loadResult);
    setShowBolPrint(true);
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

  if (showBolPrint && createdLoad) {
    return (
      <BolModal
        load={createdLoad}
        onClose={() => { setShowBolPrint(false); onClose(); }}
        onBolCreated={() => { setShowBolPrint(false); onClose(); }}
      />
    );
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    }}>
      <div style={{
        background: '#1e293b', border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '16px', width: '100%', maxWidth: '500px',
        maxHeight: '90vh', overflowY: 'auto', padding: '28px',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ color: '#f1f5f9', fontSize: '18px', fontWeight: '700', margin: '0 0 4px' }}>
              Walk-in / Quick BOL
            </h2>
            <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>
              Creates BOL immediately — no scheduling needed
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#94a3b8', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', fontSize: '18px' }}>×</button>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px 14px', color: '#ef4444', fontSize: '13px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#475569' }}>Loading...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Customer — dropdown or type */}
            <div>
              <label style={labelStyle}>Customer</label>
              <select
                value={customerId}
                onChange={e => { setCustomerId(e.target.value); setCustomCustomerName(''); }}
                style={{ ...inputStyle, background: '#0f172a', cursor: 'pointer' }}
              >
                <option value="">-- Type a name below or select existing --</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {!customerId && (
                <input
                  type="text"
                  value={customCustomerName}
                  onChange={e => setCustomCustomerName(e.target.value)}
                  placeholder="Or type customer name here..."
                  style={{ ...inputStyle, marginTop: '8px' }}
                />
              )}
            </div>

            {/* Item Type Toggle */}
            <div>
              <label style={labelStyle}>Item Type</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <button
                  onClick={() => setIsBarrels(true)}
                  style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600', background: isBarrels ? '#c4a35a' : 'rgba(255,255,255,0.06)', color: isBarrels ? '#1a1a1a' : '#94a3b8' }}
                >
                  🛢️ Barrels
                </button>
                <button
                  onClick={() => setIsBarrels(false)}
                  style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600', background: !isBarrels ? '#c4a35a' : 'rgba(255,255,255,0.06)', color: !isBarrels ? '#1a1a1a' : '#94a3b8' }}
                >
                  📦 Other Item
                </button>
              </div>

              {isBarrels ? (
                <div>
                  <label style={labelStyle}>Number of Barrels *</label>
                  <input
                    type="number"
                    min="1"
                    max="288"
                    value={barrelCount}
                    onChange={e => setBarrelCount(e.target.value)}
                    style={inputStyle}
                  />
                  {barrelCount > 288 && (
                    <div style={{ color: '#f59e0b', fontSize: '12px', marginTop: '4px' }}>
                      ⚠ Over 288 — this will be a partial load
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <label style={labelStyle}>Description *</label>
                    <input
                      type="text"
                      value={itemDescription}
                      onChange={e => setItemDescription(e.target.value)}
                      placeholder="e.g. Barrel Heads, Staves, Hardware..."
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Quantity *</label>
                      <input
                        type="text"
                        value={itemQuantity}
                        onChange={e => setItemQuantity(e.target.value)}
                        placeholder="e.g. 100"
                        style={inputStyle}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Unit</label>
                      <input
                        type="text"
                        value={itemUnit}
                        onChange={e => setItemUnit(e.target.value)}
                        placeholder="e.g. Units, Lbs, Boxes..."
                        style={inputStyle}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Barrel Specs — only shown for barrel orders */}
            {isBarrels && <div>
              <label style={labelStyle}>Barrel Specs</label>
              {specs.length > 0 ? (
                <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ color: '#34d399', fontSize: '12px', fontWeight: '600', marginBottom: '8px' }}>
                    ✓ Auto-filled from customer profile
                  </div>
                  {specs.map((s, i) => (
                    <div key={i} style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>
                      • {s.size} {s.wood}{s.char_level && ` — ${s.char_level}`}{s.bung_orientation && ` — ${s.bung_orientation}`}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ color: '#f59e0b', fontSize: '12px' }}>
                    {customerId ? '⚠ No specs on file for this customer.' : 'Specs will be filled manually on the BOL.'}
                  </div>
                </div>
              )}
            </div>}

            {/* Carrier */}
            <div>
              <label style={labelStyle}>Carrier</label>
              <select
                value={carrierId}
                onChange={e => setCarrierId(e.target.value)}
                style={{ ...inputStyle, background: '#0f172a', cursor: 'pointer' }}
              >
                <option value="">Select carrier...</option>
                {carriers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* PO Number */}
            <div>
              <label style={labelStyle}>PO Number (optional)</label>
              <input
                type="text"
                value={poNumber}
                onChange={e => setPoNumber(e.target.value)}
                placeholder="Leave blank if not needed"
                style={inputStyle}
              />
            </div>

            {/* Notes */}
            <div>
              <label style={labelStyle}>Notes (optional)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any special instructions..."
                rows={2}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '11px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#94a3b8', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
            Cancel
          </button>
          <button
            onClick={handleCreateBol}
            disabled={saving || loading}
            style={{ flex: 2, padding: '11px', background: '#c4a35a', border: 'none', borderRadius: '8px', color: '#1a1a1a', fontSize: '14px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit' }}
          >
            {saving ? 'Creating...' : '🖨️ Create & Print BOL'}
          </button>
        </div>
      </div>
    </div>
  );
}
