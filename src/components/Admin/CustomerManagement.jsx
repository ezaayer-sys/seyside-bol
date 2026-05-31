import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const CATEGORY_OPTIONS = [
  { value: 'core', label: 'Core Customer' },
  { value: 'craft', label: 'Craft / Small Orders' },
  { value: 'freight', label: 'Freight Customer' },
  { value: 'ltl_spot', label: 'LTL / Spot' },
];

const CATEGORY_COLORS = {
  core: '#10b981',
  craft: '#f59e0b',
  freight: '#3b82f6',
  ltl_spot: '#8b5cf6',
};

const CHAR_LEVELS = ['Ch1', 'Ch2', 'Ch3', 'Ch4'];
const TOAST_LEVELS = ['Light', 'Medium', 'Medium Plus', 'Heavy'];
const AGED_OPTIONS = [12, 18, 24, 36];
const BUNG_OPTIONS = ['Top Fill', 'Side Fill'];
const SIZE_OPTIONS = ['53 gal', '30 gal', '26 gal', '15 gal', '5 gal'];
const WOOD_OPTIONS = ['American White Oak', 'Canadian Oak', 'French Oak'];

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

const selectStyle = {
  ...inputStyle,
  background: '#0f172a',
  cursor: 'pointer',
};

// ─── Spec Row ─────────────────────────────────────────────────────────────────

function SpecRow({ spec, onChange, onDelete }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '10px', padding: '14px', marginBottom: '10px',
    }}>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
        {/* Size */}
        <div style={{ flex: '1 1 120px' }}>
          <label style={labelStyle}>Size</label>
          <select value={spec.size || ''} onChange={e => onChange({ ...spec, size: e.target.value })} style={selectStyle}>
            <option value="">Select...</option>
            {SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Wood */}
        <div style={{ flex: '1 1 160px' }}>
          <label style={labelStyle}>Wood</label>
          <select value={spec.wood || ''} onChange={e => onChange({ ...spec, wood: e.target.value })} style={selectStyle}>
            <option value="">Select...</option>
            {WOOD_OPTIONS.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>

        {/* Char Level */}
        <div style={{ flex: '1 1 100px' }}>
          <label style={labelStyle}>Char Level</label>
          <select value={spec.char_level || ''} onChange={e => onChange({ ...spec, char_level: e.target.value || null })} style={selectStyle}>
            <option value="">None</option>
            {CHAR_LEVELS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Bung Orientation */}
        <div style={{ flex: '1 1 120px' }}>
          <label style={labelStyle}>Bung</label>
          <select value={spec.bung_orientation || ''} onChange={e => onChange({ ...spec, bung_orientation: e.target.value || null })} style={selectStyle}>
            <option value="">None</option>
            {BUNG_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        {/* Toast */}
        <div style={{ flex: '1 1 120px' }}>
          <label style={labelStyle}>Toast</label>
          <select value={spec.toast_level || ''} onChange={e => onChange({ ...spec, toast_level: e.target.value || null })} style={selectStyle}>
            <option value="">None</option>
            {TOAST_LEVELS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Aged Months */}
        <div style={{ flex: '1 1 120px' }}>
          <label style={labelStyle}>Aged Staves</label>
          <select value={spec.aged_months || ''} onChange={e => onChange({ ...spec, aged_months: e.target.value ? parseInt(e.target.value) : null })} style={selectStyle}>
            <option value="">None</option>
            {AGED_OPTIONS.map(a => <option key={a} value={a}>{a} months</option>)}
          </select>
        </div>

        {/* Galvanized */}
        <div style={{ flex: '1 1 120px' }}>
          <label style={labelStyle}>Galvanized Hoops</label>
          <select value={spec.galvanized ? 'yes' : 'no'} onChange={e => onChange({ ...spec, galvanized: e.target.value === 'yes' })} style={selectStyle}>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </div>

        {/* Delete */}
        <button onClick={onDelete} style={{
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
          color: '#ef4444', padding: '9px 14px', borderRadius: '8px',
          fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
          flexShrink: 0,
        }}>Remove</button>
      </div>
    </div>
  );
}

// ─── Customer Modal ───────────────────────────────────────────────────────────

function CustomerModal({ customer, carriers, onClose, onSave }) {
  const isNew = !customer;

  const [name, setName] = useState(customer?.name || '');
  const [category, setCategory] = useState(customer?.category || 'core');
  const [carrierId, setCarrierId] = useState(customer?.default_carrier_id || '');
  const [street, setStreet] = useState(customer?.shipping_address?.street || '');
  const [city, setCity] = useState(customer?.shipping_address?.city || '');
  const [state, setState] = useState(customer?.shipping_address?.state || '');
  const [zip, setZip] = useState(customer?.shipping_address?.zip || '');
  const [contactName, setContactName] = useState(customer?.contact_name || '');
  const [contactEmail, setContactEmail] = useState(customer?.contact_email || '');
  const [contactPhone, setContactPhone] = useState(customer?.contact_phone || '');
  const [notes, setNotes] = useState(customer?.notes || '');
  const [specs, setSpecs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('info');

  // Load existing specs
  useEffect(() => {
    if (!customer?.id) return;
    supabase
      .from('barrel_specs')
      .select('*')
      .eq('customer_id', customer.id)
      .eq('active', true)
      .order('created_at')
      .then(({ data }) => setSpecs(data || []));
  }, [customer?.id]);

  const addSpec = () => {
    setSpecs(prev => [...prev, {
      id: null,
      size: '53 gal',
      wood: 'American White Oak',
      char_level: 'Ch4',
      bung_orientation: 'Top Fill',
      toast_level: null,
      aged_months: null,
      galvanized: false,
    }]);
  };

  const updateSpec = (index, updated) => {
    setSpecs(prev => prev.map((s, i) => i === index ? updated : s));
  };

  const removeSpec = (index) => {
    setSpecs(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!name.trim()) { setError('Customer name is required'); return; }
    setSaving(true);
    setError('');

    const customerData = {
      name: name.trim(),
      category,
      default_carrier_id: carrierId || null,
      shipping_address: { street, city, state, zip },
      contact_name: contactName || null,
      contact_email: contactEmail || null,
      contact_phone: contactPhone || null,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    };

    let customerId = customer?.id;

    if (isNew) {
      const { data, error: insertError } = await supabase
        .from('customers')
        .insert([customerData])
        .select();
      if (insertError) { setError(insertError.message); setSaving(false); return; }
      customerId = data[0].id;
    } else {
      const { error: updateError } = await supabase
        .from('customers')
        .update(customerData)
        .eq('id', customerId);
      if (updateError) { setError(updateError.message); setSaving(false); return; }
    }

    // Save specs: delete old ones and re-insert
    if (customerId) {
      await supabase.from('barrel_specs').delete().eq('customer_id', customerId);

      if (specs.length > 0) {
        const specsToInsert = specs.map(s => ({
          customer_id: customerId,
          size: s.size,
          wood: s.wood,
          char_level: s.char_level || null,
          toast_level: s.toast_level || null,
          aged_months: s.aged_months || null,
          galvanized: s.galvanized || false,
          bung_orientation: s.bung_orientation || null,
          active: true,
        }));
        await supabase.from('barrel_specs').insert(specsToInsert);
      }
    }

    setSaving(false);
    onSave();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    }}>
      <div style={{
        background: '#1e293b', border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '16px', width: '100%', maxWidth: '620px',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: '24px 28px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ color: '#f1f5f9', fontSize: '18px', fontWeight: '700', margin: 0 }}>
              {isNew ? 'Add New Customer' : `Edit — ${customer.name}`}
            </h2>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#94a3b8', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', fontSize: '18px' }}>×</button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '3px', marginBottom: '20px' }}>
            {[
              { key: 'info', label: 'Customer Info' },
              { key: 'specs', label: `Barrel Specs ${specs.length > 0 ? `(${specs.length})` : ''}` },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                flex: 1, padding: '7px', borderRadius: '6px', border: 'none',
                background: activeTab === tab.key ? '#c4a35a' : 'transparent',
                color: activeTab === tab.key ? '#1a1a1a' : '#94a3b8',
                fontWeight: activeTab === tab.key ? '700' : '500',
                fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit',
              }}>{tab.label}</button>
            ))}
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ overflowY: 'auto', padding: '0 28px 24px', flex: 1 }}>
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px 14px', color: '#ef4444', fontSize: '13px', marginBottom: '16px' }}>
              {error}
            </div>
          )}

          {activeTab === 'info' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Name + Category */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 2 }}>
                  <label style={labelStyle}>Customer Name *</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Wild Turkey" style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Category</label>
                  <select value={category} onChange={e => setCategory(e.target.value)} style={selectStyle}>
                    {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Default Carrier */}
              <div>
                <label style={labelStyle}>Default Carrier</label>
                <select value={carrierId} onChange={e => setCarrierId(e.target.value)} style={selectStyle}>
                  <option value="">No default carrier</option>
                  {carriers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {/* Shipping Address */}
              <div>
                <label style={labelStyle}>Shipping Address</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input type="text" value={street} onChange={e => setStreet(e.target.value)} placeholder="Street address" style={inputStyle} />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="City" style={{ ...inputStyle, flex: 2 }} />
                    <input type="text" value={state} onChange={e => setState(e.target.value)} placeholder="State" style={{ ...inputStyle, flex: 1 }} />
                    <input type="text" value={zip} onChange={e => setZip(e.target.value)} placeholder="ZIP" style={{ ...inputStyle, flex: 1 }} />
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div>
                <label style={labelStyle}>Contact</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input type="text" value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Contact name" style={inputStyle} />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="Email" style={{ ...inputStyle, flex: 1 }} />
                    <input type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="Phone" style={{ ...inputStyle, flex: 1 }} />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label style={labelStyle}>Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any special requirements or notes..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
            </div>
          )}

          {activeTab === 'specs' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>
                  These specs auto-fill when this customer is selected on a new load.
                </p>
                <button onClick={addSpec} style={{
                  background: 'rgba(196,163,90,0.15)', border: '1px solid rgba(196,163,90,0.3)',
                  color: '#c4a35a', padding: '7px 16px', borderRadius: '8px',
                  fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}>+ Add Spec</button>
              </div>

              {specs.length === 0 ? (
                <div style={{
                  textAlign: 'center', padding: '40px',
                  background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                }}>
                  <div style={{ fontSize: '32px', marginBottom: '10px' }}>🛢️</div>
                  <div style={{ color: '#475569', fontSize: '14px', marginBottom: '12px' }}>No barrel specs yet</div>
                  <button onClick={addSpec} style={{
                    background: '#c4a35a', border: 'none', color: '#1a1a1a',
                    padding: '9px 20px', borderRadius: '8px', fontSize: '13px',
                    fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
                  }}>Add First Spec</button>
                </div>
              ) : (
                specs.map((spec, i) => (
                  <SpecRow
                    key={i}
                    spec={spec}
                    onChange={updated => updateSpec(i, updated)}
                    onDelete={() => removeSpec(i)}
                  />
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 28px 24px', borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0, display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '11px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#94a3b8', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '11px', background: '#c4a35a', border: 'none', borderRadius: '8px', color: '#1a1a1a', fontSize: '14px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit' }}>
            {saving ? 'Saving...' : isNew ? 'Add Customer' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Customer Management Page ───────────────────────────────────────────

export default function CustomerManagement({ onBack }) {
  const [customers, setCustomers] = useState([]);
  const [carriers, setCarriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [showNewCustomer, setShowNewCustomer] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: custs }, { data: cars }] = await Promise.all([
      supabase.from('customers').select('*').order('name'),
      supabase.from('carriers').select('*').eq('active', true).order('name'),
    ]);
    setCustomers(custs || []);
    setCarriers(cars || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = customers.filter(c => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCategory || c.category === filterCategory;
    return matchSearch && matchCat;
  });

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1a', color: '#f1f5f9', fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      {/* Top Bar */}
      <div style={{
        background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: '60px', position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(10px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>
            ← Schedule
          </button>
          <span style={{ color: '#334155' }}>|</span>
          <span style={{ color: '#c4a35a', fontSize: '18px', fontWeight: '800' }}>🛢️ Customers</span>
        </div>
        <button onClick={() => setShowNewCustomer(true)} style={{ background: '#c4a35a', border: 'none', color: '#1a1a1a', padding: '8px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
          + Add Customer
        </button>
      </div>

      <div style={{ padding: '24px' }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search customers..."
            style={{ ...inputStyle, maxWidth: '280px' }}
          />
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ ...selectStyle, maxWidth: '200px' }}>
            <option value="">All Categories</option>
            {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <span style={{ color: '#475569', fontSize: '13px', alignSelf: 'center' }}>
            {filtered.length} customer{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Customer List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#475569' }}>Loading customers...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>👥</div>
            <div style={{ color: '#475569', fontSize: '16px', marginBottom: '16px' }}>No customers found</div>
            <button onClick={() => setShowNewCustomer(true)} style={{ background: '#c4a35a', border: 'none', color: '#1a1a1a', padding: '10px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
              Add First Customer
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '8px' }}>
            {filtered.map(customer => {
              const catColor = CATEGORY_COLORS[customer.category] || '#6b7280';
              const addr = customer.shipping_address;
              return (
                <div
                  key={customer.id}
                  style={{
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
                    borderLeft: `3px solid ${catColor}`, borderRadius: '10px',
                    padding: '14px 16px', display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', gap: '16px',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                      <span style={{ color: '#f1f5f9', fontSize: '15px', fontWeight: '700' }}>{customer.name}</span>
                      <span style={{
                        background: `${catColor}20`, color: catColor,
                        border: `1px solid ${catColor}40`,
                        fontSize: '10px', fontWeight: '700', padding: '2px 8px',
                        borderRadius: '10px', textTransform: 'uppercase', letterSpacing: '0.04em',
                      }}>
                        {CATEGORY_OPTIONS.find(o => o.value === customer.category)?.label || customer.category}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                      {addr && (addr.city || addr.state) && (
                        <span style={{ color: '#64748b', fontSize: '12px' }}>
                          📍 {[addr.city, addr.state].filter(Boolean).join(', ')}
                        </span>
                      )}
                      {customer.contact_name && (
                        <span style={{ color: '#64748b', fontSize: '12px' }}>👤 {customer.contact_name}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setEditingCustomer(customer)}
                    style={{
                      background: 'rgba(196,163,90,0.15)', border: '1px solid rgba(196,163,90,0.3)',
                      color: '#c4a35a', padding: '7px 16px', borderRadius: '8px',
                      fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                      fontFamily: 'inherit', flexShrink: 0,
                    }}
                  >
                    Edit
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {showNewCustomer && (
        <CustomerModal
          customer={null}
          carriers={carriers}
          onClose={() => setShowNewCustomer(false)}
          onSave={() => { setShowNewCustomer(false); fetchData(); }}
        />
      )}

      {editingCustomer && (
        <CustomerModal
          customer={editingCustomer}
          carriers={carriers}
          onClose={() => setEditingCustomer(null)}
          onSave={() => { setEditingCustomer(null); fetchData(); }}
        />
      )}
    </div>
  );
}
