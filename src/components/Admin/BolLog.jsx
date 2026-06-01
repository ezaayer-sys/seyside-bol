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

  const handleReprint = (bol) => {
    const addr = bol.ship_to_address || {};
    const date = new Date(bol.ship_date + 'T12:00:00');
    const formattedDate = (date.getMonth() + 1) + '-' + date.getDate() + '-' + String(date.getFullYear()).slice(2);
    const weight = (bol.barrel_count || 0) * 100;
    const LOGO = 'data:image/png;base64,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';
    const specs = bol.barrel_specs_custom || [];
    const descLines = ['American White Oak Barrels'];
    specs.forEach(s => {
      const parts = [];
      if (s.char_level) parts.push(s.char_level);
      if (s.bung_orientation === 'Top Fill') parts.push('TF');
      if (s.bung_orientation === 'Side Fill') parts.push('SF');
      if (parts.length > 0) descLines.push(parts.join('-'));
      descLines.push('New ' + (s.size || '53 Gal.'));
    });
    if (bol.seal_number) descLines.push('S# ' + bol.seal_number);
    if (bol.po_number) descLines.push('PO# ' + bol.po_number);
    const descHtml = descLines.map(l => '<div style="margin-bottom:3px;">' + l + '</div>').join('');
    const sigImg = bol.driver_signature
      ? '<img src="' + bol.driver_signature + '" style="height:60px;max-width:280px;object-fit:contain;display:block;border:1px solid #ccc;">'
      : '<div style="height:50px;border-bottom:1px solid #000;"></div>';
    const voidStamp = bol.status === 'voided'
      ? '<div style="position:fixed;top:40%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);font-size:100px;color:rgba(255,0,0,0.15);font-weight:bold;pointer-events:none;z-index:999;">VOIDED</div>'
      : '';
    const html = '<!DOCTYPE html><html><head><title>BOL ' + bol.bol_number + '</title><style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Arial,sans-serif;font-size:11px;color:#000;background:#fff;}.page{width:8.5in;min-height:11in;padding:0.4in 0.4in 0.3in 0.4in;display:flex;flex-direction:column;}table{border-collapse:collapse;width:100%;}.bt td,.bt th{border:1px solid #000;padding:4px 6px;vertical-align:top;}.bt th{font-size:9px;font-weight:bold;text-align:left;}.no-b td{border:none;padding:3px 0;vertical-align:top;}@media print{html,body{width:8.5in;height:11in;}.page{padding:0.35in;}@page{size:portrait;margin:0;}}</style></head><body><div class="page">'
      + voidStamp
      + '<div style="background:#000;color:#fff;text-align:center;padding:5px 0;margin-bottom:5px;"><span style="font-size:19px;font-weight:bold;letter-spacing:3px;">BILL OF LADING</span></div>'
      + '<div style="font-size:8px;text-align:center;margin-bottom:7px;line-height:1.3;">This is to certify that the below named materials are properly classified, described, packaged, marked and labeled and are in proper condition for transportation according to the applicable regulations of the Department of Transportation.</div>'
      + '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">'
      + '<div style="display:flex;align-items:center;gap:12px;"><img src="' + LOGO + '" style="height:70px;width:auto;object-fit:contain;" alt="Speyside Logo"><div>'
      + '<div style="font-size:16px;font-weight:bold;color:#4a2c0a;line-height:1.25;">Speyside Bourbon</div>'
      + '<div style="font-size:16px;font-weight:bold;color:#4a2c0a;line-height:1.25;">Cooperage, Inc</div>'
      + '<div style="font-size:8.5px;margin-top:5px;color:#333;">960 E. Main St. &bull; P.O. Box 509</div>'
      + '<div style="font-size:8.5px;color:#333;">Jackson, Ohio 45640 &bull; 855-276-2386</div></div></div>'
      + '<div style="text-align:right;font-size:10px;min-width:200px;">'
      + '<div style="margin-bottom:5px;"><b>Bill of Lading No.</b><br><span style="font-size:18px;font-weight:bold;">' + bol.bol_number + '</span></div>'
      + '<div style="margin-bottom:5px;"><b>Trailer No.</b> &nbsp;<span style="border-bottom:1px solid #000;padding:0 8px 1px 4px;">' + (bol.trailer_number || '') + '</span></div>'
      + '<div><b>Date</b> &nbsp;<span style="border-bottom:1px solid #000;padding:0 8px 1px 4px;">' + formattedDate + '</span></div>'
      + '</div></div>'
      + '<div style="font-size:9.5px;margin-bottom:6px;"><b>Name of Carrier:</b> &nbsp;<span style="border-bottom:1px solid #000;padding:0 80px 1px 2px;">' + (bol.carrier?.name || '') + '</span>&nbsp;&nbsp;&nbsp;&nbsp;<b>(SCAC)</b> &nbsp;<span style="border-bottom:1px solid #000;padding:0 50px 1px 2px;"></span></div>'
      + '<table class="bt" style="margin-bottom:0;"><tr>'
      + '<td style="width:50%;"><div style="font-weight:bold;font-size:9px;margin-bottom:3px;">TO:</div><div style="margin-bottom:2px;"><b>Consignee</b> &nbsp; ' + (bol.customer?.name || '') + '</div><div style="margin-bottom:2px;"><b>Street</b> &nbsp; ' + (addr.street || '') + '</div><div><b>Destination</b> &nbsp; ' + (addr.city || '') + ', ' + (addr.state || '') + ' &nbsp;&nbsp;&nbsp; <b>Zip Code</b> &nbsp; ' + (addr.zip || '') + '</div></td>'
      + '<td style="width:50%;"><div style="font-weight:bold;font-size:9px;margin-bottom:3px;">FROM:</div><div style="font-weight:bold;margin-bottom:2px;">Shipper</div><div style="margin-bottom:2px;">Speyside Bourbon Cooperage, Inc.</div><div style="margin-bottom:2px;"><b>Street</b> &nbsp; 960 E. Main Street</div><div><b>Origin</b> &nbsp; Jackson, OH &nbsp;&nbsp;&nbsp; <b>Zip Code</b> &nbsp; 45640</div></td>'
      + '</tr></table>'
      + '<table class="bt" style="border-top:none;"><tr><td style="width:40%;font-size:9px;"><b>Route</b></td><td style="font-size:9px;text-align:right;"><b>Vehicle Number:</b></td></tr></table>'
      + '<table class="bt" style="border-top:none;"><thead><tr>'
      + '<th style="width:70px;">No. Shipping<br>Units</th><th style="width:25px;">HM</th><th>Kind of Packaging, Description of Articles,<br>Special Marks and Exceptions</th><th style="width:75px;">Weight<br>Subject to<br>Change</th><th style="width:45px;">Rate</th><th style="width:55px;">Charges</th>'
      + '</tr></thead><tbody>'
      + '<tr><td style="font-size:15px;font-weight:bold;text-align:center;padding:8px 4px;">' + bol.barrel_count + '</td><td></td><td style="padding:8px 6px;line-height:1.6;">' + descHtml + '</td><td style="text-align:center;padding:8px 4px;">100</td><td></td><td></td></tr>'
      + '<tr style="height:28px;"><td></td><td></td><td></td><td></td><td></td><td></td></tr>'
      + '<tr style="height:28px;"><td></td><td></td><td></td><td></td><td></td><td></td></tr>'
      + '<tr style="height:28px;"><td></td><td></td><td></td><td></td><td></td><td></td></tr>'
      + '<tr style="height:28px;"><td></td><td></td><td></td><td></td><td></td><td></td></tr>'
      + '<tr style="border-top:2px solid #000;"><td colspan="3" style="border-right:1px solid #000;"></td><td style="font-weight:bold;font-size:12px;text-align:center;">' + weight.toLocaleString() + '</td><td></td><td></td></tr>'
      + '</tbody></table>'
      + '<table class="bt" style="border-top:none;"><tr>'
      + '<td style="width:32%;font-size:9px;"><b>REMIT C.O.D. TO ADDRESS</b></td>'
      + '<td style="width:38%;font-size:7.5px;"><b>C.O.D.</b> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <b>Amt. $</b><div style="margin-top:6px;padding-top:4px;border-top:1px solid #000;line-height:1.3;">Subject to Section 7 of the conditions, this shipment is to be delivered to the consignee without recourse on the consignor. The carrier shall not make delivery without payment of freight and all other lawful charges.</div><div style="margin-top:6px;text-align:center;border-top:1px solid #000;padding-top:3px;font-weight:bold;">Signature of Consignor</div></td>'
      + '<td style="width:30%;font-size:8px;"><b>C.O.D. FEE</b><br>PREPAID &#9633; &nbsp; COLLECT &#9633;<br><br><b>TOTAL CHARGES: $</b><br><br><b>FREIGHT CHARGES</b><br>FREIGHT PREPAID &#9633;<br>except when box at right<br>is checked. &#9633; collect.</td>'
      + '</tr></table>'
      + '<div style="font-size:7px;padding:4px 6px;border:1px solid #000;border-top:none;line-height:1.3;">RECEIVED, subject to the classifications and tariffs in effect on the date of the issue of this Bill of Lading, the property described above in apparent good order, except as noted (contents and condition of packages unknown), marked, consigned, and destined as indicate above which said carrier agrees to carry to its usual place of delivery at said destination. Shipper hereby certifies that he is familiar with all the bill of lading terms and conditions in the governing classification and the said terms and conditions are hereby agreed to by the shipper and accepted for himself and his assigns.</div>'
      + '<table class="no-b" style="margin-top:8px;border-top:1px solid #000;padding-top:6px;"><tr>'
      + '<td style="width:48%;padding-right:16px;"><div style="font-size:10px;margin-bottom:3px;"><b>SHIPPER</b> &nbsp; Speyside Bourbon Cooperage, Inc.</div><div style="font-size:8.5px;margin-bottom:6px;color:#333;">960 E. Main Street &bull; Jackson, Ohio 45640</div><div style="font-size:10px;font-weight:bold;margin-bottom:2px;">PER</div><div style="border-bottom:1px solid #000;min-height:22px;padding-bottom:2px;">' + (bol.shipper_name || '') + '</div><div style="margin-top:14px;border-bottom:1px solid #000;padding-bottom:2px;text-align:center;">' + formattedDate + '</div></td>'
      + '<td style="width:52%;"><div style="font-size:10px;margin-bottom:3px;"><b>CARRIER</b> &nbsp; ' + (bol.carrier?.name || '') + '</div><div style="font-size:10px;font-weight:bold;margin-bottom:4px;">PER (Driver Signature)</div>' + sigImg + '<div style="margin-top:14px;display:flex;align-items:flex-end;gap:8px;"><span style="font-size:10px;font-weight:bold;white-space:nowrap;">DATE</span><div style="border-bottom:1px solid #000;flex:1;padding-bottom:2px;text-align:center;">' + formattedDate + '</div></div></td>'
      + '</tr></table>'
      + '<div style="font-size:7.5px;margin-top:6px;">* Mark with "X" to designate Hazardous Material as defined in Title 49 of the Code of Federal Regulations</div>'
      + '</div><script>window.onload=function(){setTimeout(function(){window.print();},400);};<\/script></body></html>';

    const printWindow = window.open('', '_blank', 'width=900,height=750');
    printWindow.document.write(html);
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
