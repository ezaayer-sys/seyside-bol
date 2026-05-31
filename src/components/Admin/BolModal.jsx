import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const SHIPPER_NAMES = [
  'Carson Spohn',
  'Bruce White',
  'Bobby Barker',
  'Chris Rupe',
  'Other',
];

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
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e) => {
    e.preventDefault();
    drawing.current = true;
    lastPos.current = getPos(e, canvasRef.current);
  };

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

  const stopDraw = () => {
    drawing.current = false;
    lastPos.current = null;
    if (onSave) onSave(canvasRef.current.toDataURL('image/png'));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (onClear) onClear();
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={400}
        height={120}
        style={{
          border: '1px solid #ccc',
          borderRadius: '4px',
          width: '100%',
          height: '100px',
          touchAction: 'none',
          cursor: 'crosshair',
          background: '#fff',
          display: 'block',
        }}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={stopDraw}
      />
      <button
        onClick={clear}
        style={{
          marginTop: '6px',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)',
          color: '#94a3b8',
          padding: '4px 12px',
          borderRadius: '4px',
          fontSize: '12px',
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        Clear Signature
      </button>
    </div>
  );
}

// ─── Build BOL HTML for printing in new window ────────────────────────────────

function buildBolHtml({ load, customer, carrier, shipperName, driverSigDataUrl, bolNumber, shipDate }) {
  const specs = load.barrel_specs_custom || [];
  const weight = (load.barrel_count || 0) * 100;
  const addr = load.ship_to_address || customer?.shipping_address || {};

  const d = new Date(shipDate + 'T12:00:00');
  const formattedDate = `${d.getMonth() + 1}-${d.getDate()}-${String(d.getFullYear()).slice(2)}`;

  const descriptionLines = ['American White Oak Barrels'];
  if (specs.length > 0) {
    specs.forEach(s => {
      const parts = [];
      if (s.char_level) parts.push(s.char_level);
      if (s.bung_orientation === 'Top Fill') parts.push('TF');
      if (s.bung_orientation === 'Side Fill') parts.push('SF');
      if (parts.length > 0) descriptionLines.push(parts.join('-'));
      descriptionLines.push(`New ${s.size || '53 Gal.'}`);
    });
  }
  if (load.seal_number) descriptionLines.push(`S# ${load.seal_number}`);
  if (load.po_number) descriptionLines.push(`PO# ${load.po_number}`);

  const descHtml = descriptionLines.map(l => `<div style="margin-bottom:2px;">${l}</div>`).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <title>BOL ${bolNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #000; background: #fff; padding: 20px; }
    table { border-collapse: collapse; width: 100%; }
    .border-table td, .border-table th { border: 1px solid #000; padding: 4px 6px; }
    .no-border td { border: none; }
    @media print {
      body { padding: 10px; }
      @page { margin: 0.5in; }
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div style="background:#000;color:#fff;text-align:center;padding:6px 0;margin-bottom:4px;">
    <span style="font-size:18px;font-weight:bold;letter-spacing:2px;">BILL OF LADING</span>
  </div>

  <div style="font-size:9px;text-align:center;margin-bottom:8px;">
    This is to certify that the below named materials are properly classified, described, packaged, marked and labeled and are in proper condition for transportation according to the applicable regulations of the Department of Transportation.
  </div>

  <!-- Company + BOL Numbers -->
  <div style="display:flex;justify-content:space-between;margin-bottom:8px;align-items:flex-start;">
    <div>
      <div style="font-size:15px;font-weight:bold;line-height:1.3;">Speyside Bourbon</div>
      <div style="font-size:15px;font-weight:bold;line-height:1.3;">Cooperage, Inc</div>
      <div style="font-size:9px;margin-top:6px;">960 E. Main St. &bull; P.O. Box 509</div>
      <div style="font-size:9px;">Jackson, Ohio 45640 &bull; 855-276-2386</div>
      <div style="font-size:9px;margin-top:8px;">
        <b>Name of Carrier:</b> <span style="border-bottom:1px solid #000;padding:0 60px 1px 2px;">${carrier?.name || ''}</span>
        &nbsp;&nbsp; <b>(SCAC)</b> <span style="border-bottom:1px solid #000;padding:0 40px 1px 2px;">${carrier?.scac || ''}</span>
      </div>
    </div>
    <div style="text-align:right;font-size:10px;min-width:220px;">
      <div style="margin-bottom:6px;"><b>Bill of Lading No.</b> &nbsp; <span style="font-size:16px;font-weight:bold;">${bolNumber}</span></div>
      <div style="margin-bottom:6px;"><b>Trailer No.</b> &nbsp; <span style="border-bottom:1px solid #000;padding:0 10px 1px 4px;">${load.trailer_number || ''}</span></div>
      <div><b>Date</b> &nbsp; <span style="border-bottom:1px solid #000;padding:0 10px 1px 4px;">${formattedDate}</span></div>
    </div>
  </div>

  <!-- TO / FROM -->
  <table class="border-table" style="margin-bottom:0;">
    <tr>
      <td style="width:50%;vertical-align:top;">
        <div style="font-weight:bold;margin-bottom:3px;">TO:</div>
        <div><b>Consignee</b> &nbsp; ${customer?.name || ''}</div>
        <div><b>Street</b> &nbsp; ${addr.street || ''}</div>
        <div><b>Destination</b> &nbsp; ${addr.city || ''}, ${addr.state || ''} &nbsp;&nbsp; <b>Zip Code</b> &nbsp; ${addr.zip || ''}</div>
      </td>
      <td style="width:50%;vertical-align:top;">
        <div style="font-weight:bold;margin-bottom:3px;">FROM:</div>
        <div><b>Shipper</b> &nbsp; Speyside Bourbon Cooperage, Inc.</div>
        <div><b>Street</b> &nbsp; 960 E. Main Street</div>
        <div><b>Origin</b> &nbsp; Jackson, OH &nbsp;&nbsp; <b>Zip Code</b> &nbsp; 45640</div>
      </td>
    </tr>
  </table>

  <!-- Main Shipping Table -->
  <table class="border-table" style="border-top:none;">
    <thead>
      <tr>
        <th style="width:80px;font-size:9px;">No. Shipping Units</th>
        <th style="width:30px;font-size:9px;">HM</th>
        <th style="font-size:9px;">Kind of Packaging, Description of Articles, Special Marks and Exceptions</th>
        <th style="width:80px;font-size:9px;">Weight Subject to Change</th>
        <th style="width:50px;font-size:9px;">Rate</th>
        <th style="width:60px;font-size:9px;">Charges</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="font-size:14px;font-weight:bold;vertical-align:top;padding:6px;">${load.barrel_count}</td>
        <td></td>
        <td style="vertical-align:top;padding:6px;">${descHtml}</td>
        <td style="vertical-align:top;padding:6px;">100</td>
        <td></td>
        <td></td>
      </tr>
      <tr><td style="height:22px;"></td><td></td><td></td><td></td><td></td><td></td></tr>
      <tr><td style="height:22px;"></td><td></td><td></td><td></td><td></td><td></td></tr>
      <tr><td style="height:22px;"></td><td></td><td></td><td></td><td></td><td></td></tr>
      <tr style="border-top:2px solid #000;">
        <td colspan="3" style="border-right:1px solid #000;"></td>
        <td style="font-weight:bold;padding:4px 6px;">${weight.toLocaleString()}</td>
        <td></td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <!-- COD Section -->
  <table class="border-table" style="border-top:none;">
    <tr>
      <td style="width:30%;vertical-align:top;">
        <div style="font-weight:bold;font-size:9px;">REMIT C.O.D. TO ADDRESS</div>
      </td>
      <td style="width:40%;font-size:8px;vertical-align:top;">
        Subject to Section 7 of the conditions, of this shipment is to be delivered to the consignee without recourse on the consignor, the consignor shall sign the following statement: The carrier shall not make delivery of this shipment without payment of freight and all other lawful charges.
        <div style="margin-top:8px;border-top:1px solid #000;padding-top:4px;text-align:center;font-weight:bold;">Signature of Consignor</div>
      </td>
      <td style="width:30%;font-size:8px;vertical-align:top;">
        <div style="font-weight:bold;">C.O.D. FEE</div>
        <div>PREPAID &#9633; &nbsp; COLLECT &#9633;</div>
        <div style="margin-top:4px;font-weight:bold;">TOTAL CHARGES: $</div>
        <div style="margin-top:4px;font-weight:bold;">FREIGHT CHARGES</div>
        <div>FREIGHT PREPAID &#9633; &nbsp; Check box if charges</div>
        <div>except when not right &#9633; are to be &#9633;</div>
        <div>is checked. &nbsp; collected.</div>
      </td>
    </tr>
  </table>

  <!-- Legal Text -->
  <div style="font-size:7.5px;padding:4px 0;border-top:1px solid #000;line-height:1.3;">
    RECEIVED, subject to the classifications and tariffs in effect on the date of the issue of this Bill of Lading, the property described above in apparent good order, except as noted (contents and condition of packages unknown), marked, consigned, and destined as indicate above which said carrier (the word carrier being understood throughout this contract as meaning any person or corporation in possession of the property under the contract) agrees to carry to its usual place of delivery at said destination, if on its route, otherwise to deliver to another carrier on the route to said destination. It is mutually agreed as to each carrier of all or any of, said property overall or any portion of said route to destination and as to each party at any time interested in all or any of said property, that every service to be performed hereunder shall be subject to all the bill of lading terms and conditions in the governing classification on the date of shipment. Shipper hereby certifies that he is familiar with all the bill of lading terms and conditions in the governing classification and the said terms and conditions are hereby agreed to by the shipper and accepted for himself and his assigns.
  </div>

  <!-- Signatures -->
  <table class="no-border" style="margin-top:6px;">
    <tr>
      <td style="width:45%;vertical-align:top;padding-right:20px;">
        <div style="font-weight:bold;margin-bottom:2px;">SHIPPER &nbsp; Speyside Bourbon Cooperage, Inc.</div>
        <div style="font-size:9px;margin-bottom:6px;">960 E. Main Street &bull; Jackson, Ohio 45640</div>
        <div style="font-weight:bold;">PER</div>
        <div style="border-bottom:1px solid #000;min-height:24px;padding-bottom:2px;margin-bottom:4px;">${shipperName}</div>
        <div style="border-bottom:1px solid #000;padding-bottom:2px;margin-top:12px;">${formattedDate}</div>
      </td>
      <td style="width:55%;vertical-align:top;">
        <div style="font-weight:bold;margin-bottom:2px;">CARRIER &nbsp; ${carrier?.name || ''}</div>
        <div style="font-weight:bold;margin-bottom:4px;">PER (Driver Signature)</div>
        ${driverSigDataUrl
          ? `<img src="${driverSigDataUrl}" style="height:55px;max-width:220px;object-fit:contain;border:1px solid #ccc;display:block;">`
          : '<div style="border-bottom:1px solid #000;height:45px;"></div>'
        }
        <div style="border-bottom:1px solid #000;padding-bottom:2px;margin-top:12px;">DATE &nbsp; ${formattedDate}</div>
      </td>
    </tr>
  </table>

  <div style="font-size:8px;margin-top:6px;">
    * Mark with "X" to designate Hazardous Material as defined in Title 49 of the Code of Federal Regulations
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 400);
    };
  </script>
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

    // Save to bol_log
    try {
      const fileName = `${load.bol_number}_${(customer?.name || 'Unknown').replace(/\s+/g, '_')}.pdf`;
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
    } catch (err) {
      console.error('BOL log error:', err);
    }

    setSaving(false);
    setSaved(true);

    // Open BOL in new window and print
    const bolHtml = buildBolHtml({
      load,
      customer,
      carrier,
      shipperName: finalShipperName,
      driverSigDataUrl,
      bolNumber: load.bol_number,
      shipDate: load.ship_date,
    });

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    printWindow.document.write(bolHtml);
    printWindow.document.close();

    if (onBolCreated) onBolCreated();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    }}>
      <div style={{
        background: '#1e293b', border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '16px', width: '100%', maxWidth: '560px',
        maxHeight: '90vh', overflowY: 'auto', padding: '28px',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ color: '#f1f5f9', fontSize: '18px', fontWeight: '700', margin: '0 0 4px' }}>Print BOL</h2>
            <p style={{ color: '#c4a35a', fontSize: '13px', fontWeight: '600', margin: 0 }}>{load.bol_number}</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#94a3b8', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', fontSize: '18px' }}>×</button>
        </div>

        {/* Load Summary */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '14px', marginBottom: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
            {[
              { label: 'Customer', value: customer?.name || '—' },
              { label: 'Carrier', value: carrier?.name || '—' },
              { label: 'Trailer No.', value: load.trailer_number || '—' },
              { label: 'Seal No.', value: load.seal_number || '—' },
              { label: 'Barrels', value: `${load.barrel_count} bbls` },
              { label: 'Ship Date', value: new Date(load.ship_date + 'T12:00:00').toLocaleDateString() },
            ].map(({ label, value }) => (
              <div key={label}>
                <span style={{ color: '#64748b' }}>{label}: </span>
                <span style={{ color: '#e2e8f0', fontWeight: '500' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Shipper Name */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', color: '#94a3b8', fontSize: '11px', fontWeight: '600', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Signed By (Speyside)
          </label>
          <select
            value={shipperName}
            onChange={e => setShipperName(e.target.value)}
            style={{ width: '100%', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '9px 12px', color: '#f1f5f9', fontSize: '13px', outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }}
          >
            {SHIPPER_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          {shipperName === 'Other' && (
            <input
              type="text"
              value={customShipper}
              onChange={e => setCustomShipper(e.target.value)}
              placeholder="Enter name..."
              style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '9px 12px', color: '#f1f5f9', fontSize: '13px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', marginTop: '8px' }}
            />
          )}
        </div>

        {/* Driver Signature */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', color: '#94a3b8', fontSize: '11px', fontWeight: '600', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Driver Signature
          </label>
          <div style={{ background: '#fff', borderRadius: '8px', padding: '8px' }}>
            <SignaturePad
              onSave={setDriverSigDataUrl}
              onClear={() => setDriverSigDataUrl(null)}
            />
          </div>
          {driverSigDataUrl
            ? <div style={{ color: '#34d399', fontSize: '12px', marginTop: '6px' }}>✓ Signature captured</div>
            : <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '6px' }}>Draw driver signature above</div>
          }
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '11px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#94a3b8', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
            Cancel
          </button>
          <button
            onClick={handlePrint}
            disabled={saving || !canPrint}
            style={{
              flex: 2, padding: '11px', background: '#c4a35a', border: 'none', borderRadius: '8px',
              color: '#1a1a1a', fontSize: '14px', fontWeight: '700',
              cursor: (saving || !canPrint) ? 'not-allowed' : 'pointer',
              opacity: (saving || !canPrint) ? 0.5 : 1,
              fontFamily: 'inherit',
            }}
          >
            {saving ? 'Saving...' : saved ? '🖨️ Print Again' : '🖨️ Save & Print BOL'}
          </button>
        </div>

        {!driverSigDataUrl && (
          <p style={{ color: '#475569', fontSize: '11px', textAlign: 'center', marginTop: '10px' }}>
            Driver signature is required before printing
          </p>
        )}
      </div>
    </div>
  );
}

export default BolModal;
