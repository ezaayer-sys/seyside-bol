import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const STATUS_COLORS = {
  active: { color: '#10b981', bg: 'rgba(16,185,129,0.15)', label: 'Active' },
  voided: { color: '#ef4444', bg: 'rgba(239,68,68,0.15)', label: 'Voided' },
};

export default function BolLog({ onBack }) {
  const [bols, setBols] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterCarrier, setFilterCarrier] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [customers, setCustomers] = useState([]);
  const [carriers, setCarriers] = useState([]);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchBols = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('bol_log')
      .select('*, customer:customers(name), carrier:carriers(name)')
      .order('created_at', { ascending: false });

    if (!error) setBols(data || []);
    setLoading(false);
  };

  const fetchMeta = async () => {
    const [{ data: custs }, { data: cars }] = await Promise.all([
      supabase.from('customers').select('id, name').order('name'),
      supabase.from('carriers').select('id, name').order('name'),
    ]);
    setCustomers(custs || []);
    setCarriers(cars || []);
  };

  useEffect(() => {
    fetchBols();
    fetchMeta();
  }, []);

  const handleVoid = async (bol) => {
    if (!confirm(`Void BOL ${bol.bol_number}? It will remain in the log but marked as voided.`)) return;
    setActionLoading(bol.id);
    await supabase.from('bol_log').update({ status: 'voided' }).eq('id', bol.id);
    setActionLoading(null);
    fetchBols();
  };

  const handleRestore = async (bol) => {
    setActionLoading(bol.id);
    await supabase.from('bol_log').update({ status: 'active' }).eq('id', bol.id);
    setActionLoading(null);
    fetchBols();
  };

  const handleDelete = async (bol) => {
    if (!confirm(`Permanently delete BOL ${bol.bol_number}? This cannot be undone.`)) return;
    setActionLoading(bol.id);
    await supabase.from('bol_log').delete().eq('id', bol.id);
    setActionLoading(null);
    fetchBols();
  };

  const handleReprint = async (bol) => {
    // Open a new window with the BOL data for reprinting
    const printWindow = window.open('', '_blank');
    const addr = bol.ship_to_address || {};
    const date = new Date(bol.ship_date + 'T12:00:00');
    const formattedDate = `${date.getMonth() + 1}-${date.getDate()}-${String(date.getFullYear()).slice(2)}`;
    const weight = (bol.barrel_count || 0) * 100;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>BOL ${bol.bol_number}</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 11px; margin: 0; padding: 20px; }
          @media print { body { padding: 10px; } }
          table { border-collapse: collapse; width: 100%; }
          td, th { border: 1px solid #000; padding: 4px 6px; }
        </style>
      </head>
      <body>
        <div style="background:#000;color:#fff;text-align:center;padding:6px 0;margin-bottom:4px;">
          <span style="font-size:18px;font-weight:bold;letter-spacing:2px;">BILL OF LADING</span>
        </div>
        <div style="font-size:9px;text-align:center;margin-bottom:8px;">
          This is to certify that the below named materials are properly classified, described, packaged, marked and labeled and are in proper condition for transportation according to the applicable regulations of the Department of Transportation.
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <div>
            <div style="font-size:14px;font-weight:bold;">Speyside Bourbon</div>
            <div style="font-size:14px;font-weight:bold;">Cooperage, Inc</div>
            <div style="font-size:9px;margin-top:4px;">960 E. Main St. • P.O. Box 509</div>
            <div style="font-size:9px;">Jackson, Ohio 45640 • 855-276-2386</div>
            <div style="font-size:9px;margin-top:6px;"><b>Name of Carrier:</b> ${bol.carrier?.name || ''} &nbsp;&nbsp; <b>(SCAC)</b> ${bol.carrier_scac || ''}</div>
          </div>
          <div style="text-align:right;font-size:10px;">
            <div style="margin-bottom:4px;"><b>Bill of Lading No.</b> <span style="font-size:14px;font-weight:bold;">${bol.bol_number}</span></div>
            <div style="margin-bottom:4px;"><b>Trailer No.</b> ${bol.trailer_number || ''}</div>
            <div><b>Date</b> ${formattedDate}</div>
          </div>
        </div>
        <table style="margin-bottom:0;">
          <tr>
            <td style="width:50%;vertical-align:top;">
              <b>TO:</b><br>
              <b>Consignee</b> ${bol.customer?.name || ''}<br>
              <b>Street</b> ${addr.street || ''}<br>
              <b>Destination</b> ${addr.city || ''}, ${addr.state || ''} &nbsp; <b>Zip Code</b> ${addr.zip || ''}
            </td>
            <td style="width:50%;vertical-align:top;">
              <b>FROM:</b><br>
              <b>Shipper</b> Speyside Bourbon Cooperage, Inc.<br>
              <b>Street</b> 960 E. Main Street<br>
              <b>Origin</b> Jackson, OH &nbsp; <b>Zip Code</b> 45640
            </td>
          </tr>
        </table>
        <table>
          <thead>
            <tr>
              <th style="width:80px;font-size:9px;">No. Shipping Units</th>
              <th style="width:30px;font-size:9px;">HM</th>
              <th style="font-size:9px;">Kind of Packaging, Description of Articles, Special Marks and Exceptions</th>
              <th style="width:70px;font-size:9px;">Weight Subject to Change</th>
              <th style="width:50px;font-size:9px;">Rate</th>
              <th style="width:60px;font-size:9px;">Charges</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="font-size:13px;font-weight:bold;vertical-align:top;">${bol.barrel_count}</td>
              <td></td>
              <td style="vertical-align:top;">
                American White Oak Barrels<br>
                ${bol.seal_number ? `S# ${bol.seal_number}<br>` : ''}
                ${bol.po_number ? `PO# ${bol.po_number}` : ''}
              </td>
              <td style="vertical-align:top;">100</td>
              <td></td>
              <td></td>
            </tr>
            <tr><td style="height:24px;"></td><td></td><td></td><td></td><td></td><td></td></tr>
            <tr><td style="height:24px;"></td><td></td><td></td><td></td><td></td><td></td></tr>
            <tr style="border-top:1px solid #000;">
              <td colspan="3"></td>
              <td style="font-weight:bold;">${weight.toLocaleString()}</td>
              <td></td>
              <td></td>
            </tr>
          </tbody>
        </table>
        <div style="font-size:7.5px;padding:4px 0;border-top:1px solid #000;line-height:1.3;">
          RECEIVED, subject to the classifications and tariffs in effect on the date of the issue of this Bill of Lading, the property described above in apparent good order, except as noted (contents and condition of packages unknown), marked, consigned, and destined as indicate above which said carrier agrees to carry to its usual place of delivery at said destination...
        </div>
        <table style="border:none;">
          <tr>
            <td style="border:none;width:45%;vertical-align:top;padding-right:16px;">
              <b>SHIPPER</b> &nbsp; Speyside Bourbon Cooperage, Inc.<br>
              <span style="font-size:9px;">960 E. Main Street • Jackson, Ohio 45640</span><br>
              <b>PER</b><br>
              <div style="border-bottom:1px solid #000;min-height:20px;padding-bottom:2px;">${bol.shipper_name || ''}</div>
              <div style="border-bottom:1px solid #000;margin-top:8px;padding-bottom:2px;">${formattedDate}</div>
            </td>
            <td style="border:none;width:55%;vertical-align:top;">
              <b>CARRIER</b> &nbsp; ${bol.carrier?.name || ''}<br>
              <b>PER (Driver Signature)</b><br>
              ${bol.driver_signature ? `<img src="${bol.driver_signature}" style="height:50px;width:200px;object-fit:contain;border:1px solid #ccc;display:block;">` : '<div style="border-bottom:1px solid #000;height:40px;"></div>'}
              <div style="border-bottom:1px solid #000;margin-top:8px;padding-bottom:2px;">DATE &nbsp; ${formattedDate}</div>
            </td>
          </tr>
        </table>
        <div style="font-size:8px;margin-top:4px;">* Mark with "X" to designate Hazardous Material as defined in Title 49 of the Code of Federal Regulations</div>
        ${bol.status === 'voided' ? '<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);font-size:80px;color:rgba(255,0,0,0.2);font-weight:bold;pointer-events:none;">VOIDED</div>' : ''}
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Get unique months from bols
  const months = [...new Set(bols.map(b => b.bol_number?.split('-')[0]).filter(Boolean))];

  const filtered = bols.filter(b => {
    const matchSearch = !search ||
      b.bol_number?.toLowerCase().includes(search.toLowerCase()) ||
      b.customer?.name?.toLowerCase().includes(search.toLowerCase());
    const matchMonth = !filterMonth || b.bol_number?.startsWith(filterMonth);
    const matchCustomer = !filterCustomer || b.customer_id === filterCustomer;
    const matchCarrier = !filterCarrier || b.carrier_id === filterCarrier;
    const matchStatus = !filterStatus || b.status === filterStatus;
    return matchSearch && matchMonth && matchCustomer && matchCarrier && matchStatus;
  });

  const totalBarrels = filtered.reduce((s, b) => s + (b.barrel_count || 0), 0);

  const inputStyle = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '8px 12px', color: '#f1f5f9', fontSize: '13px', outline: 'none', fontFamily: 'inherit' };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1a', color: '#f1f5f9', fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      {/* Top Bar */}
      <div style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px', position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(10px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>← Schedule</button>
          <span style={{ color: '#334155' }}>|</span>
          <span style={{ color: '#c4a35a', fontSize: '18px', fontWeight: '800' }}>📋 BOL Log</span>
        </div>
        <div style={{ color: '#64748b', fontSize: '13px' }}>
          {filtered.length} BOLs • {totalBarrels.toLocaleString()} bbls
        </div>
      </div>

      <div style={{ padding: '24px' }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search BOL # or customer..."
            style={{ ...inputStyle, minWidth: '220px' }}
          />
          <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{ ...inputStyle, background: '#0f172a', cursor: 'pointer' }}>
            <option value="">All Months</option>
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)} style={{ ...inputStyle, background: '#0f172a', cursor: 'pointer' }}>
            <option value="">All Customers</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filterCarrier} onChange={e => setFilterCarrier(e.target.value)} style={{ ...inputStyle, background: '#0f172a', cursor: 'pointer' }}>
            <option value="">All Carriers</option>
            {carriers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...inputStyle, background: '#0f172a', cursor: 'pointer' }}>
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="voided">Voided</option>
          </select>
        </div>

        {/* BOL Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#475569' }}>Loading BOL log...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
            <div style={{ color: '#475569', fontSize: '16px' }}>No BOLs found</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  {['BOL #', 'Date', 'Customer', 'Carrier', 'Trailer', 'Bbls', 'Shipper', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#64748b', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(bol => {
                  const statusCfg = STATUS_COLORS[bol.status] || STATUS_COLORS.active;
                  const isLoading = actionLoading === bol.id;
                  const shipDate = bol.ship_date ? new Date(bol.ship_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—';

                  return (
                    <tr key={bol.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', opacity: bol.status === 'voided' ? 0.6 : 1 }}>
                      <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>
                        <span style={{ color: '#c4a35a', fontWeight: '700' }}>{bol.bol_number}</span>
                      </td>
                      <td style={{ padding: '12px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{shipDate}</td>
                      <td style={{ padding: '12px', color: '#e2e8f0' }}>{bol.customer?.name || '—'}</td>
                      <td style={{ padding: '12px', color: '#94a3b8' }}>{bol.carrier?.name || '—'}</td>
                      <td style={{ padding: '12px', color: '#94a3b8' }}>{bol.trailer_number || '—'}</td>
                      <td style={{ padding: '12px', color: '#94a3b8' }}>{bol.barrel_count}</td>
                      <td style={{ padding: '12px', color: '#94a3b8' }}>{bol.shipper_name || '—'}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ background: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.color}40`, padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {/* Print/Download */}
                          <button
                            onClick={() => handleReprint(bol)}
                            disabled={isLoading}
                            style={{ background: 'rgba(196,163,90,0.15)', border: '1px solid rgba(196,163,90,0.3)', color: '#c4a35a', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                          >
                            🖨️ Print
                          </button>

                          {/* Void / Restore */}
                          {bol.status === 'active' ? (
                            <button
                              onClick={() => handleVoid(bol)}
                              disabled={isLoading}
                              style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}
                            >
                              Void
                            </button>
                          ) : (
                            <button
                              onClick={() => handleRestore(bol)}
                              disabled={isLoading}
                              style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}
                            >
                              Restore
                            </button>
                          )}

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(bol)}
                            disabled={isLoading}
                            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
