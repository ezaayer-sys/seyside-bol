import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const SHIPPER_NAMES = [
  'Carson Spohn',
  'Bruce White',
  'Bobby Barker',
  'Chris Rupe',
  'Other',
];

const LOGO_BASE64 = 'data:image/png;base64,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';

// ─── Signature Pad ────────────────────────────────────────────────────────────

function SignaturePad({ onSave, onClear }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const lastPos = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDraw = (e) => { e.preventDefault(); drawing.current = true; lastPos.current = getPos(e, canvasRef.current); };
  const draw = (e) => {
    e.preventDefault();
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  };
  const stopDraw = () => { drawing.current = false; lastPos.current = null; if (onSave) onSave(canvasRef.current.toDataURL('image/png')); };
  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (onClear) onClear();
  };

  return (
    <div>
      <canvas ref={canvasRef} width={400} height={120}
        style={{ border: '1px solid #ccc', borderRadius: '4px', width: '100%', height: '100px', touchAction: 'none', cursor: 'crosshair', background: '#fff', display: 'block' }}
        onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
        onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
      />
      <button onClick={clear} style={{ marginTop: '6px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#94a3b8', padding: '4px 12px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
        Clear Signature
      </button>
    </div>
  );
}

// ─── Build BOL HTML ───────────────────────────────────────────────────────────

function buildBolHtml({ load, customer, carrier, shipperName, driverSigDataUrl, bolNumber, shipDate }) {
  const specs = load.barrel_specs_custom || [];
  const weight = (load.barrel_count || 0) * 100;
  const addr = load.ship_to_address || customer?.shipping_address || {};

  const d = new Date(shipDate + 'T12:00:00');
  const formattedDate = (d.getMonth() + 1) + '-' + d.getDate() + '-' + String(d.getFullYear()).slice(2);

  const descLines = ['American White Oak Barrels'];
  if (specs.length > 0) {
    specs.forEach(s => {
      const parts = [];
      if (s.char_level) parts.push(s.char_level);
      if (s.bung_orientation === 'Top Fill') parts.push('TF');
      if (s.bung_orientation === 'Side Fill') parts.push('SF');
      if (parts.length > 0) descLines.push(parts.join('-'));
      descLines.push('New ' + (s.size || '53 Gal.'));
    });
  }
  if (load.seal_number) descLines.push('S# ' + load.seal_number);
  if (load.po_number) descLines.push('PO# ' + load.po_number);

  const descHtml = descLines.map(l => '<div style="margin-bottom:3px;">' + l + '</div>').join('');
  const sigImg = driverSigDataUrl ? '<img src="' + driverSigDataUrl + '" style="height:60px;max-width:280px;object-fit:contain;display:block;border:1px solid #ccc;">' : '<div style="height:50px;border-bottom:1px solid #000;"></div>';

  return `<!DOCTYPE html>
<html>
<head>
  <title>BOL ${bolNumber}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:Arial,sans-serif; font-size:11px; color:#000; background:#fff; }
    .page { width:8.5in; min-height:11in; padding:0.4in 0.4in 0.3in 0.4in; display:flex; flex-direction:column; }
    table { border-collapse:collapse; width:100%; }
    .bt td, .bt th { border:1px solid #000; padding:4px 6px; vertical-align:top; }
    .bt th { font-size:9px; font-weight:bold; text-align:left; }
    .no-b td { border:none; padding:3px 0; vertical-align:top; }
    @media print {
      html, body { width:8.5in; height:11in; }
      .page { padding:0.35in 0.35in 0.25in 0.35in; }
      @page { size:portrait; margin:0; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- HEADER BAR -->
  <div style="background:#000;color:#fff;text-align:center;padding:5px 0;margin-bottom:5px;">
    <span style="font-size:19px;font-weight:bold;letter-spacing:3px;">BILL OF LADING</span>
  </div>

  <!-- Certification text -->
  <div style="font-size:8px;text-align:center;margin-bottom:7px;line-height:1.3;">
    This is to certify that the below named materials are properly classified, described, packaged, marked and labeled and are in proper condition for transportation according to the applicable regulations of the Department of Transportation.
  </div>

  <!-- LOGO + COMPANY INFO + BOL NUMBERS -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
    <div style="display:flex;align-items:center;gap:12px;">
      <img src="${LOGO_BASE64}" style="height:70px;width:auto;object-fit:contain;" alt="Speyside Logo">
      <div>
        <div style="font-size:16px;font-weight:bold;color:#4a2c0a;line-height:1.25;">Speyside Bourbon</div>
        <div style="font-size:16px;font-weight:bold;color:#4a2c0a;line-height:1.25;">Cooperage, Inc</div>
        <div style="font-size:8.5px;margin-top:5px;color:#333;">960 E. Main St. &bull; P.O. Box 509</div>
        <div style="font-size:8.5px;color:#333;">Jackson, Ohio 45640 &bull; 855-276-2386</div>
      </div>
    </div>
    <div style="text-align:right;font-size:10px;min-width:200px;">
      <div style="margin-bottom:5px;"><b>Bill of Lading No.</b><br><span style="font-size:18px;font-weight:bold;">${bolNumber}</span></div>
      <div style="margin-bottom:5px;"><b>Trailer No.</b> &nbsp;<span style="border-bottom:1px solid #000;padding:0 8px 1px 4px;">${load.trailer_number || ''}</span></div>
      <div><b>Date</b> &nbsp;<span style="border-bottom:1px solid #000;padding:0 8px 1px 4px;">${formattedDate}</span></div>
    </div>
  </div>

  <!-- CARRIER LINE -->
  <div style="font-size:9.5px;margin-bottom:6px;padding-bottom:4px;">
    <b>Name of Carrier:</b> &nbsp;<span style="border-bottom:1px solid #000;padding:0 80px 1px 2px;">${carrier?.name || ''}</span>
    &nbsp;&nbsp;&nbsp;&nbsp;
    <b>(SCAC)</b> &nbsp;<span style="border-bottom:1px solid #000;padding:0 50px 1px 2px;">${carrier?.scac || ''}</span>
  </div>

  <!-- TO / FROM -->
  <table class="bt" style="margin-bottom:0;">
    <tr>
      <td style="width:50%;">
        <div style="font-weight:bold;font-size:9px;margin-bottom:3px;">TO:</div>
        <div style="margin-bottom:2px;"><b>Consignee</b> &nbsp; ${customer?.name || ''}</div>
        <div style="margin-bottom:2px;"><b>Street</b> &nbsp; ${addr.street || ''}</div>
        <div><b>Destination</b> &nbsp; ${addr.city || ''}, ${addr.state || ''} &nbsp;&nbsp;&nbsp; <b>Zip Code</b> &nbsp; ${addr.zip || ''}</div>
      </td>
      <td style="width:50%;">
        <div style="font-weight:bold;font-size:9px;margin-bottom:3px;">FROM:</div>
        <div style="font-weight:bold;margin-bottom:2px;">Shipper</div>
        <div style="margin-bottom:2px;">Speyside Bourbon Cooperage, Inc.</div>
        <div style="margin-bottom:2px;"><b>Street</b> &nbsp; 960 E. Main Street</div>
        <div><b>Origin</b> &nbsp; Jackson, OH &nbsp;&nbsp;&nbsp; <b>Zip Code</b> &nbsp; 45640</div>
      </td>
    </tr>
  </table>

  <!-- ROUTE / VEHICLE ROW -->
  <table class="bt" style="border-top:none;">
    <tr>
      <td style="width:40%;font-size:9px;"><b>Route</b></td>
      <td style="width:60%;font-size:9px;text-align:right;"><b>Vehicle Number:</b></td>
    </tr>
  </table>

  <!-- MAIN SHIPPING TABLE -->
  <table class="bt" style="border-top:none;flex:1;">
    <thead>
      <tr>
        <th style="width:70px;">No. Shipping<br>Units</th>
        <th style="width:25px;">HM</th>
        <th>Kind of Packaging, Description of Articles,<br>Special Marks and Exceptions</th>
        <th style="width:75px;">Weight<br>Subject to<br>Change</th>
        <th style="width:45px;">Rate</th>
        <th style="width:55px;">Charges</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="font-size:15px;font-weight:bold;text-align:center;padding:8px 4px;">${load.barrel_count}</td>
        <td></td>
        <td style="padding:8px 6px;font-size:11px;line-height:1.6;">${descHtml}</td>
        <td style="text-align:center;padding:8px 4px;">100</td>
        <td></td>
        <td></td>
      </tr>
      <tr style="height:32px;"><td></td><td></td><td></td><td></td><td></td><td></td></tr>
      <tr style="height:32px;"><td></td><td></td><td></td><td></td><td></td><td></td></tr>
      <tr style="height:32px;"><td></td><td></td><td></td><td></td><td></td><td></td></tr>
      <tr style="height:32px;"><td></td><td></td><td></td><td></td><td></td><td></td></tr>
      <!-- Total weight row -->
      <tr style="border-top:2px solid #000;">
        <td colspan="3" style="border-right:1px solid #000;"></td>
        <td style="font-weight:bold;font-size:12px;text-align:center;">${weight.toLocaleString()}</td>
        <td></td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <!-- COD / REMIT SECTION -->
  <table class="bt" style="border-top:none;">
    <tr>
      <td style="width:32%;font-size:9px;">
        <b>REMIT</b><br>
        <b>C.O.D. TO</b><br>
        <b>ADDRESS</b>
      </td>
      <td style="width:38%;font-size:8px;">
        <b>C.O.D.</b> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <b>Amt. $</b>
        <div style="margin-top:6px;padding-top:4px;border-top:1px solid #000;font-size:7.5px;line-height:1.3;">
          Subject to Section 7 of the conditions, of this shipment is to be delivered to the consignee without recourse on the consignor, the consignor shall sign the following statement:<br>
          The carrier shall not make delivery of this shipment without payment of freight and all other lawful charges.
        </div>
        <div style="margin-top:6px;text-align:center;border-top:1px solid #000;padding-top:3px;font-size:8px;font-weight:bold;">Signature of Consignor</div>
      </td>
      <td style="width:30%;font-size:8px;">
        <b>C.O.D. FEE</b><br>
        PREPAID &#9633; &nbsp; COLLECT &#9633;<br><br>
        <b>TOTAL CHARGES: $</b><br><br>
        <b>FREIGHT CHARGES</b><br>
        FREIGHT PREPAID &#9633; &nbsp; Check box<br>
        except when &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; if charges<br>
        box at right &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; are to be<br>
        is checked. &#9633; &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; collect.
      </td>
    </tr>
  </table>

  <!-- NOTE -->
  <div style="font-size:7.5px;padding:4px 0;border-top:none;line-height:1.25;border:1px solid #000;border-top:none;padding:5px 6px;">
    <b>Note</b> - Where the rate is dependent on value, shippers are required to state specifically in writing the agreed or declared value of the property.<br>
    The agreed or declared value of the property is hereby specifically stated by the shipper to be not exceeding:<br>
    $ _________________ per _________________
  </div>

  <!-- LEGAL TEXT -->
  <div style="font-size:7px;padding:4px 6px;border:1px solid #000;border-top:none;line-height:1.3;">
    RECEIVED, subject to the classifications and tariffs in effect on the date of the issue of this Bill of Lading, the property described above in apparent good order, except as noted (contents and condition of packages unknown), marked, consigned, and destined as indicate above which said carrier (the word carrier being understood throughout this contract as meaning any person or corporation in possession of the property under the contract) agrees to carry to its usual place of delivery at said destination, if on its route, otherwise to deliver to another carrier on the route to said destination. It is mutually agreed as to each carrier of all or any of, said property overall or any portion of said route to destination and as to each party at any time interested in all or any of said property, that every service to be performed hereunder shall be subject to all the bill of lading terms and conditions in the governing classification on the date of shipment. Shipper hereby certifies that he is familiar with all the bill of lading terms and conditions in the governing classification and the said terms and conditions are hereby agreed to by the shipper and accepted for himself and his assigns.
  </div>

  <!-- SIGNATURES -->
  <table class="no-b" style="margin-top:8px;border-top:1px solid #000;padding-top:6px;">
    <tr>
      <td style="width:48%;padding-right:16px;">
        <div style="font-size:10px;margin-bottom:3px;"><b>SHIPPER</b> &nbsp; Speyside Bourbon Cooperage, Inc.</div>
        <div style="font-size:8.5px;margin-bottom:6px;color:#333;">960 E. Main Street &bull; Jackson, Ohio 45640</div>
        <div style="font-size:10px;font-weight:bold;margin-bottom:2px;">PER</div>
        <div style="border-bottom:1px solid #000;min-height:22px;padding-bottom:2px;font-size:11px;">${shipperName}</div>
        <div style="margin-top:14px;display:flex;align-items:flex-end;gap:8px;">
          <span style="font-size:10px;white-space:nowrap;">&nbsp;</span>
          <div style="border-bottom:1px solid #000;flex:1;padding-bottom:2px;text-align:center;font-size:11px;">${formattedDate}</div>
        </div>
      </td>
      <td style="width:52%;">
        <div style="font-size:10px;margin-bottom:3px;"><b>CARRIER</b> &nbsp; ${carrier?.name || ''}</div>
        <div style="font-size:10px;font-weight:bold;margin-bottom:4px;">PER</div>
        ${sigImg}
        <div style="margin-top:14px;display:flex;align-items:flex-end;gap:8px;">
          <span style="font-size:10px;white-space:nowrap;font-weight:bold;">DATE</span>
          <div style="border-bottom:1px solid #000;flex:1;padding-bottom:2px;text-align:center;font-size:11px;">${formattedDate}</div>
        </div>
      </td>
    </tr>
  </table>

  <!-- FOOTER NOTE -->
  <div style="font-size:7.5px;margin-top:6px;color:#333;">
    * Mark with "X" to designate Hazardous Material as defined in Title 49 of the Code of Federal Regulations
  </div>

</div>
<script>window.onload = function() { setTimeout(function() { window.print(); }, 400); };</script>
</body>
</html>`;
}

// ─── BOL Modal ────────────────────────────────────────────────────────────────

export function BolModal({ load, onClose, onBolCreated }) {
  const [shipperName, setShipperName] = useState(SHIPPER_NAMES[0]);
  const [customShipper, setCustomShipper] = useState('');
  const [driverSigDataUrl, setDriverSigDataUrl] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const customer = load.customer;
  const carrier = load.carrier;
  const finalShipperName = shipperName === 'Other' ? customShipper : shipperName;
  const canPrint = driverSigDataUrl && (shipperName !== 'Other' || customShipper.trim());

  const handlePrint = async () => {
    setSaving(true);
    try {
      const fileName = load.bol_number + '_' + (customer?.name || 'Unknown').replace(/\s+/g, '_') + '.pdf';
      await supabase.from('bol_log').insert([{
        load_id: load.id,
        bol_number: load.bol_number,
        customer_id: load.customer_id,
        carrier_id: load.carrier_id,
        ship_date: load.ship_date,
        barrel_count: load.barrel_count,
        po_number: load.po_number,
        trailer_number: load.trailer_number,
        seal_number: load.seal_number,
        shipper_name: finalShipperName,
        driver_signature: driverSigDataUrl,
        ship_to_address: load.ship_to_address || customer?.shipping_address,
        barrel_specs_custom: load.barrel_specs_custom,
        file_name: fileName,
        status: 'active',
      }]);
    } catch (err) { console.error('BOL log error:', err); }

    setSaving(false);
    setSaved(true);

    const bolHtml = buildBolHtml({ load, customer, carrier, shipperName: finalShipperName, driverSigDataUrl, bolNumber: load.bol_number, shipDate: load.ship_date });
    const printWindow = window.open('', '_blank', 'width=900,height=750');
    printWindow.document.write(bolHtml);
    printWindow.document.close();

    if (onBolCreated) onBolCreated();
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
      <div style={{ background:'#1e293b', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'16px', width:'100%', maxWidth:'560px', maxHeight:'90vh', overflowY:'auto', padding:'28px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px' }}>
          <div>
            <h2 style={{ color:'#f1f5f9', fontSize:'18px', fontWeight:'700', margin:'0 0 4px' }}>Print BOL</h2>
            <p style={{ color:'#c4a35a', fontSize:'13px', fontWeight:'600', margin:0 }}>{load.bol_number}</p>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.06)', border:'none', color:'#94a3b8', width:'32px', height:'32px', borderRadius:'8px', cursor:'pointer', fontSize:'18px' }}>×</button>
        </div>

        <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'10px', padding:'14px', marginBottom:'20px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', fontSize:'13px' }}>
            {[
              { label:'Customer', value: customer?.name || '—' },
              { label:'Carrier', value: carrier?.name || '—' },
              { label:'Trailer No.', value: load.trailer_number || '—' },
              { label:'Seal No.', value: load.seal_number || '—' },
              { label:'Barrels', value: load.barrel_count + ' bbls' },
              { label:'Ship Date', value: new Date(load.ship_date + 'T12:00:00').toLocaleDateString() },
            ].map(({ label, value }) => (
              <div key={label}>
                <span style={{ color:'#64748b' }}>{label}: </span>
                <span style={{ color:'#e2e8f0', fontWeight:'500' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom:'20px' }}>
          <label style={{ display:'block', color:'#94a3b8', fontSize:'11px', fontWeight:'600', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.05em' }}>Signed By (Speyside)</label>
          <select value={shipperName} onChange={e => setShipperName(e.target.value)} style={{ width:'100%', background:'#0f172a', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'8px', padding:'9px 12px', color:'#f1f5f9', fontSize:'13px', outline:'none', fontFamily:'inherit', cursor:'pointer' }}>
            {SHIPPER_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          {shipperName === 'Other' && (
            <input type="text" value={customShipper} onChange={e => setCustomShipper(e.target.value)} placeholder="Enter name..." style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'8px', padding:'9px 12px', color:'#f1f5f9', fontSize:'13px', outline:'none', boxSizing:'border-box', fontFamily:'inherit', marginTop:'8px' }} />
          )}
        </div>

        <div style={{ marginBottom:'24px' }}>
          <label style={{ display:'block', color:'#94a3b8', fontSize:'11px', fontWeight:'600', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.05em' }}>Driver Signature</label>
          <div style={{ background:'#fff', borderRadius:'8px', padding:'8px' }}>
            <SignaturePad onSave={setDriverSigDataUrl} onClear={() => setDriverSigDataUrl(null)} />
          </div>
          {driverSigDataUrl
            ? <div style={{ color:'#34d399', fontSize:'12px', marginTop:'6px' }}>✓ Signature captured</div>
            : <div style={{ color:'#94a3b8', fontSize:'12px', marginTop:'6px' }}>Draw driver signature above</div>
          }
        </div>

        <div style={{ display:'flex', gap:'10px' }}>
          <button onClick={onClose} style={{ flex:1, padding:'11px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', color:'#94a3b8', fontSize:'14px', fontWeight:'600', cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
          <button onClick={handlePrint} disabled={saving || !canPrint} style={{ flex:2, padding:'11px', background:'#c4a35a', border:'none', borderRadius:'8px', color:'#1a1a1a', fontSize:'14px', fontWeight:'700', cursor:(saving || !canPrint) ? 'not-allowed' : 'pointer', opacity:(saving || !canPrint) ? 0.5 : 1, fontFamily:'inherit' }}>
            {saving ? 'Saving...' : saved ? '🖨️ Print Again' : '🖨️ Save & Print BOL'}
          </button>
        </div>
        {!driverSigDataUrl && <p style={{ color:'#475569', fontSize:'11px', textAlign:'center', marginTop:'10px' }}>Driver signature is required before printing</p>}
      </div>
    </div>
  );
}

export default BolModal;
