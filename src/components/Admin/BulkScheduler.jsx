import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getMonthYearStr(year, month) {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  return monthNames[month] + String(year).slice(2);
}

function getDayOfWeek(year, month, day) {
  return new Date(year, month, day).toLocaleDateString('en-US', { weekday: 'short' });
}

function isWeekend(year, month, day) {
  const d = new Date(year, month, day).getDay();
  return d === 0 || d === 6;
}

export default function BulkScheduler({ onBack, onLoadsAdded }) {
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [coreCustomers, setCoreCustomers] = useState([]);
  const [loadGrid, setLoadGrid] = useState({}); // { customerId: { day: count } }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [existingLoads, setExistingLoads] = useState([]);

  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = [today.getFullYear(), today.getFullYear() + 1];

  useEffect(() => {
    fetchCoreCustomers();
  }, []);

  useEffect(() => {
    fetchExistingLoads();
    // Reset grid when month changes
    setLoadGrid({});
    setSaved(false);
  }, [selectedYear, selectedMonth]);

  const fetchCoreCustomers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('customers')
      .select('*, carriers:default_carrier_id(*)')
      .eq('category', 'core')
      .eq('active', true)
      .order('name');

    if (!error) setCoreCustomers(data || []);
    setLoading(false);
  };

  const fetchExistingLoads = async () => {
    const startDate = toDateStr(selectedYear, selectedMonth, 1);
    const endDate = toDateStr(selectedYear, selectedMonth, getDaysInMonth(selectedYear, selectedMonth));

    const { data } = await supabase
      .from('loads')
      .select('ship_date, customer_id, barrel_count')
      .gte('ship_date', startDate)
      .lte('ship_date', endDate)
      .in('customer_id', coreCustomers.map(c => c.id));

    setExistingLoads(data || []);
  };

  useEffect(() => {
    if (coreCustomers.length > 0) fetchExistingLoads();
  }, [coreCustomers, selectedYear, selectedMonth]);

  const getExistingCount = (customerId, day) => {
    const dateStr = toDateStr(selectedYear, selectedMonth, day);
    return existingLoads.filter(l => l.customer_id === customerId && l.ship_date === dateStr).length;
  };

  const handleCellChange = (customerId, day, value) => {
    const num = parseInt(value) || 0;
    if (num < 0) return;
    setLoadGrid(prev => ({
      ...prev,
      [customerId]: {
        ...(prev[customerId] || {}),
        [day]: num,
      }
    }));
  };

  const getGridValue = (customerId, day) => {
    return loadGrid[customerId]?.[day] || '';
  };

  const getTotalForDay = (day) => {
    return coreCustomers.reduce((sum, c) => sum + (parseInt(loadGrid[c.id]?.[day]) || 0), 0);
  };

  const getTotalForCustomer = (customerId) => {
    return days.reduce((sum, day) => sum + (parseInt(loadGrid[customerId]?.[day]) || 0), 0);
  };

  const getGrandTotal = () => {
    return coreCustomers.reduce((sum, c) => sum + getTotalForCustomer(c.id), 0);
  };

  const handleSave = async () => {
    const loadsToCreate = [];

    for (const customer of coreCustomers) {
      for (const day of days) {
        const count = parseInt(loadGrid[customer.id]?.[day]) || 0;
        if (count === 0) continue;

        const shipDate = toDateStr(selectedYear, selectedMonth, day);
        const monthYear = getMonthYearStr(selectedYear, selectedMonth);

        for (let i = 0; i < count; i++) {
          loadsToCreate.push({
            customer_id: customer.id,
            ship_date: shipDate,
            barrel_count: 288,
            barrel_specs_custom: customer.barrel_specs || null,
            status: 'scheduled',
            bol_month_year: monthYear,
            carrier_id: customer.default_carrier_id || null,
            ship_to_address: customer.shipping_address || null,
            notes: null,
          });
        }
      }
    }

    if (loadsToCreate.length === 0) {
      setError('No loads entered. Fill in the grid first.');
      return;
    }

    setSaving(true);
    setError('');

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    // Get next BOL sequences for each month
    const monthYear = getMonthYearStr(selectedYear, selectedMonth);
    const { data: seqData } = await supabase
      .from('loads')
      .select('bol_sequence')
      .eq('bol_month_year', monthYear)
      .order('bol_sequence', { ascending: false })
      .limit(1);

    let nextSeq = (seqData?.[0]?.bol_sequence || 0) + 1;

    // Add BOL numbers and user IDs
    const loadsWithBol = loadsToCreate.map(load => ({
      ...load,
      bol_number: `${monthYear}-${String(nextSeq++).padStart(3, '0')}`,
      bol_sequence: nextSeq - 1,
      created_by_id: user.id,
      updated_by_id: user.id,
    }));

    // Insert in batches of 50
    const batchSize = 50;
    for (let i = 0; i < loadsWithBol.length; i += batchSize) {
      const batch = loadsWithBol.slice(i, i + batchSize);
      const { error: insertError } = await supabase.from('loads').insert(batch);
      if (insertError) {
        setError('Error saving loads: ' + insertError.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setSaved(true);
    setLoadGrid({});
    fetchExistingLoads();
    if (onLoadsAdded) onLoadsAdded();
  };

  const handleClear = () => {
    setLoadGrid({});
    setSaved(false);
    setError('');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#475569' }}>Loading core customers...</div>
      </div>
    );
  }

  const grandTotal = getGrandTotal();

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1a', color: '#f1f5f9', fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      {/* Top Bar */}
      <div style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px', position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(10px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>← Schedule</button>
          <span style={{ color: '#334155' }}>|</span>
          <span style={{ color: '#c4a35a', fontSize: '18px', fontWeight: '800' }}>📅 Bulk Scheduler</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {grandTotal > 0 && (
            <span style={{ color: '#64748b', fontSize: '13px' }}>
              {grandTotal} loads · {(grandTotal * 288).toLocaleString()} bbls
            </span>
          )}
          <button onClick={handleClear} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', padding: '7px 14px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
            Clear
          </button>
          <button
            onClick={handleSave}
            disabled={saving || grandTotal === 0}
            style={{ background: grandTotal > 0 ? '#c4a35a' : 'rgba(196,163,90,0.3)', border: 'none', color: grandTotal > 0 ? '#1a1a1a' : '#64748b', padding: '8px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: grandTotal > 0 ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}
          >
            {saving ? 'Adding Loads...' : saved ? '✓ Loads Added!' : `Add ${grandTotal} Load${grandTotal !== 1 ? 's' : ''} to Schedule`}
          </button>
        </div>
      </div>

      <div style={{ padding: '24px' }}>
        {/* Month/Year selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(parseInt(e.target.value))}
            style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '8px 14px', color: '#f1f5f9', fontSize: '14px', outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }}
          >
            {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(parseInt(e.target.value))}
            style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '8px 14px', color: '#f1f5f9', fontSize: '14px', outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }}
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <span style={{ color: '#475569', fontSize: '13px' }}>
            Enter number of loads per customer per day. Each load = 288 bbls.
          </span>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px 14px', color: '#ef4444', fontSize: '13px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {saved && (
          <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', padding: '10px 14px', color: '#34d399', fontSize: '13px', marginBottom: '16px' }}>
            ✓ Loads successfully added to the schedule! Head back to the schedule to view them.
          </div>
        )}

        {coreCustomers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>👥</div>
            <div style={{ color: '#475569', fontSize: '16px', marginBottom: '8px' }}>No core customers found</div>
            <div style={{ color: '#334155', fontSize: '13px' }}>Go to Customers and set customer category to "Core Customer"</div>
          </div>
        ) : (
          /* Scrollable grid */
          <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <table style={{ borderCollapse: 'collapse', minWidth: '100%', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                  {/* Customer column header */}
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: '#94a3b8', fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.08)', position: 'sticky', left: 0, background: '#111827', zIndex: 10, minWidth: '150px', whiteSpace: 'nowrap' }}>
                    Customer
                  </th>
                  {/* Day columns */}
                  {days.map(day => {
                    const dow = getDayOfWeek(selectedYear, selectedMonth, day);
                    const weekend = isWeekend(selectedYear, selectedMonth, day);
                    return (
                      <th key={day} style={{ padding: '6px 4px', textAlign: 'center', color: weekend ? '#475569' : '#94a3b8', fontWeight: '600', fontSize: '10px', borderBottom: '1px solid rgba(255,255,255,0.08)', minWidth: '44px', background: weekend ? 'rgba(0,0,0,0.2)' : 'transparent' }}>
                        <div style={{ color: weekend ? '#334155' : '#64748b' }}>{dow}</div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: weekend ? '#475569' : '#f1f5f9' }}>{day}</div>
                      </th>
                    );
                  })}
                  {/* Total column */}
                  <th style={{ padding: '10px 10px', textAlign: 'center', color: '#c4a35a', fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.08)', minWidth: '60px', whiteSpace: 'nowrap' }}>
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {coreCustomers.map((customer, ci) => {
                  const customerTotal = getTotalForCustomer(customer.id);
                  return (
                    <tr key={customer.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: ci % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                      {/* Customer name - sticky */}
                      <td style={{ padding: '8px 14px', position: 'sticky', left: 0, background: ci % 2 === 0 ? '#0a0f1a' : '#0d1219', zIndex: 5, borderRight: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: customer.color_code || '#6b7280', flexShrink: 0 }} />
                          <span style={{ color: '#e2e8f0', fontWeight: '600', whiteSpace: 'nowrap' }}>{customer.name}</span>
                        </div>
                      </td>
                      {/* Day cells */}
                      {days.map(day => {
                        const weekend = isWeekend(selectedYear, selectedMonth, day);
                        const existingCount = getExistingCount(customer.id, day);
                        const newCount = parseInt(loadGrid[customer.id]?.[day]) || 0;
                        return (
                          <td key={day} style={{ padding: '4px 3px', textAlign: 'center', background: weekend ? 'rgba(0,0,0,0.15)' : 'transparent' }}>
                            <div style={{ position: 'relative' }}>
                              <input
                                type="number"
                                min="0"
                                max="20"
                                value={getGridValue(customer.id, day)}
                                onChange={e => handleCellChange(customer.id, day, e.target.value)}
                                style={{
                                  width: '38px',
                                  padding: '5px 2px',
                                  textAlign: 'center',
                                  background: newCount > 0 ? 'rgba(196,163,90,0.15)' : 'rgba(255,255,255,0.04)',
                                  border: `1px solid ${newCount > 0 ? 'rgba(196,163,90,0.4)' : 'rgba(255,255,255,0.08)'}`,
                                  borderRadius: '5px',
                                  color: newCount > 0 ? '#c4a35a' : '#64748b',
                                  fontSize: '13px',
                                  fontWeight: newCount > 0 ? '700' : '400',
                                  outline: 'none',
                                  fontFamily: 'inherit',
                                }}
                              />
                              {/* Show existing loads indicator */}
                              {existingCount > 0 && (
                                <div style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#3b82f6', color: '#fff', fontSize: '8px', fontWeight: '800', width: '14px', height: '14px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }} title={`${existingCount} existing load(s)`}>
                                  {existingCount}
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                      {/* Customer total */}
                      <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: '700', color: customerTotal > 0 ? '#c4a35a' : '#334155', fontSize: '13px' }}>
                        {customerTotal > 0 ? customerTotal : '—'}
                      </td>
                    </tr>
                  );
                })}

                {/* Daily totals row */}
                <tr style={{ borderTop: '2px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '8px 14px', position: 'sticky', left: 0, background: '#111827', zIndex: 5, borderRight: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>
                    Daily Total
                  </td>
                  {days.map(day => {
                    const total = getTotalForDay(day);
                    const weekend = isWeekend(selectedYear, selectedMonth, day);
                    return (
                      <td key={day} style={{ padding: '8px 4px', textAlign: 'center', background: weekend ? 'rgba(0,0,0,0.15)' : 'transparent' }}>
                        <span style={{ color: total > 0 ? '#c4a35a' : '#334155', fontWeight: '700', fontSize: '13px' }}>
                          {total > 0 ? total : '—'}
                        </span>
                      </td>
                    );
                  })}
                  <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: '800', color: '#c4a35a', fontSize: '14px' }}>
                    {grandTotal > 0 ? grandTotal : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Legend */}
        <div style={{ display: 'flex', gap: '20px', marginTop: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#475569' }}>
            <div style={{ width: '12px', height: '12px', background: 'rgba(196,163,90,0.15)', border: '1px solid rgba(196,163,90,0.4)', borderRadius: '3px' }} />
            New loads you're adding
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#475569' }}>
            <div style={{ width: '12px', height: '12px', background: '#3b82f6', borderRadius: '50%' }} />
            Blue dot = existing loads already scheduled
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#475569' }}>
            <div style={{ width: '12px', height: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '3px' }} />
            Shaded = weekend
          </div>
        </div>
      </div>
    </div>
  );
}
