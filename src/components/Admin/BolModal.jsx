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
    const canvas = canvasRef.current;
    lastPos.current = getPos(e, canvas);
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

// ─── BOL Print View (the actual BOL layout for printing) ─────────────────────

function BolPrintView({ load, customer, carrier, shipperName, driverSigDataUrl, bolNumber, shipDate }) {
  const specs = load.barrel_specs_custom || [];
  const weight = (load.barrel_count || 0) * 100;
  const addr = load.ship_to_address || customer?.shipping_address || {};

  const formattedDate = (() => {
    const d = new Date(shipDate + 'T12:00:00');
    return `${d.getMonth() + 1}-${d.getDate()}-${String(d.getFullYear()).slice(2)}`;
  })();

  const descriptionLines = [];
  descriptionLines.push('American White Oak Barrels');
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

  return (
    <div id="bol-print-content" style={{
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px',
      color: '#000',
      background: '#fff',
      padding: '20px',
      width: '750px',
      margin: '0 auto',
      boxSizing: 'border-box',
    }}>
      {/* Header */}
      <div style={{ background: '#000', color: '#fff', textAlign: 'center', padding: '6px 0', marginBottom: '4px' }}>
        <span style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '2px' }}>BILL OF LADING</span>
      </div>

      <div style={{ fontSize: '9px', textAlign: 'center', marginBottom: '8px', color: '#000' }}>
        This is to certify that the below named materials are properly classified, described, packaged, marked and labeled and are in proper condition for transportation according to the applicable regulations of the Department of Transportation.
      </div>

      {/* Company Info + BOL Numbers */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 'bold', lineHeight: '1.3' }}>Speyside Bourbon</div>
          <div style={{ fontSize: '14px', fontWeight: 'bold', lineHeight: '1.3' }}>Cooperage, Inc</div>
          <div style={{ fontSize: '9px', marginTop: '4px' }}>960 E. Main St. • P.O. Box 509</div>
          <div style={{ fontSize: '9px' }}>Jackson, Ohio 45640 • 855-276-2386</div>
          <div style={{ fontSize: '9px', marginTop: '6px' }}>
            <span style={{ fontWeight: 'bold' }}>Name of Carrier: </span>
            <span style={{ borderBottom: '1px solid #000', paddingBottom: '1px', marginRight: '8px' }}>
              {carrier?.name || ''}
            </span>
            <span style={{ fontWeight: 'bold' }}>(SCAC) </span>
            <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '60px' }}>{carrier?.scac || ''}</span>
          </div>
        </div>

        <div style={{ textAlign: 'right', fontSize: '10px' }}>
          <div style={{ marginBottom: '4px' }}>
            <span style={{ fontWeight: 'bold' }}>Bill of Lading No. </span>
            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{bolNumber}</span>
          </div>
          <div style={{ marginBottom: '4px' }}>
            <span style={{ fontWeight: 'bold' }}>Trailer No. </span>
            <span style={{ borderBottom: '1px solid #000', paddingLeft: '4px' }}>{load.trailer_number || ''}</span>
          </div>
          <div style={{ marginBottom: '4px' }}>
            <span style={{ fontWeight: 'bold' }}>Date </span>
            <span style={{ borderBottom: '1px solid #000', paddingLeft: '4px' }}>{formattedDate}</span>
          </div>
        </div>
      </div>

      {/* TO / FROM */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '0', fontSize: '10px', border: '1px solid #000' }}>
        <tbody>
          <tr>
            <td style={{ width: '50%', padding: '4px 6px', borderRight: '1px solid #000', verticalAlign: 'top' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>TO:</div>
              <div><span style={{ fontWeight: 'bold' }}>Consignee </span>{customer?.name || ''}</div>
              <div><span style={{ fontWeight: 'bold' }}>Street </span>{addr.street || ''}</div>
              <div>
                <span style={{ fontWeight: 'bold' }}>Destination </span>{addr.city || ''}, {addr.state || ''}
                <span style={{ marginLeft: '12px', fontWeight: 'bold' }}>Zip Code </span>{addr.zip || ''}
              </div>
            </td>
            <td style={{ width: '50%', padding: '4px 6px', verticalAlign: 'top' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>FROM:</div>
              <div><span style={{ fontWeight: 'bold' }}>Shipper </span>Speyside Bourbon Cooperage, Inc.</div>
              <div><span style={{ fontWeight: 'bold' }}>Street </span>960 E. Main Street</div>
              <div>
                <span style={{ fontWeight: 'bold' }}>Origin </span>Jackson, OH
                <span style={{ marginLeft: '12px', fontWeight: 'bold' }}>Zip Code </span>45640
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Main Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', border: '1px solid #000', borderTop: 'none' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #000' }}>
            <th style={{ padding: '3px 6px', textAlign: 'left', width: '80px', borderRight: '1px solid #000', fontWeight: 'bold', fontSize: '9px' }}>No. Shipping Units</th>
            <th style={{ padding: '3px 6px', textAlign: 'left', width: '30px', borderRight: '1px solid #000', fontWeight: 'bold', fontSize: '9px' }}>HM</th>
            <th style={{ padding: '3px 6px', textAlign: 'left', borderRight: '1px solid #000', fontWeight: 'bold', fontSize: '9px' }}>Kind of Packaging, Description of Articles, Special Marks and Exceptions</th>
            <th style={{ padding: '3px 6px', textAlign: 'left', width: '70px', borderRight: '1px solid #000', fontWeight: 'bold', fontSize: '9px' }}>Weight Subject to Change</th>
            <th style={{ padding: '3px 6px', textAlign: 'left', width: '50px', borderRight: '1px solid #000', fontWeight: 'bold', fontSize: '9px' }}>Rate</th>
            <th style={{ padding: '3px 6px', textAlign: 'left', width: '60px', fontWeight: 'bold', fontSize: '9px' }}>Charges</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: '4px 6px', borderRight: '1px solid #000', verticalAlign: 'top', fontSize: '13px', fontWeight: 'bold' }}>{load.barrel_count}</td>
            <td style={{ padding: '4px 6px', borderRight: '1px solid #000' }}></td>
            <td style={{ padding: '4px 6px', borderRight: '1px solid #000', verticalAlign: 'top' }}>
              {descriptionLines.map((line, i) => (
                <div key={i} style={{ marginBottom: '2px' }}>{line}</div>
              ))}
            </td>
            <td style={{ padding: '4px 6px', borderRight: '1px solid #000', verticalAlign: 'top' }}>100</td>
            <td style={{ padding: '4px 6px', borderRight: '1px solid #000' }}></td>
            <td style={{ padding: '4px 6px' }}></td>
          </tr>
          {/* Empty rows */}
          {[1, 2, 3].map(i => (
            <tr key={i} style={{ borderTop: '1px solid #eee' }}>
              <td style={{ padding: '8px 6px', borderRight: '1px solid #000' }}></td>
              <td style={{ padding: '8px 6px', borderRight: '1px solid #000' }}></td>
              <td style={{ padding: '8px 6px', borderRight: '1px solid #000' }}></td>
              <td style={{ padding: '8px 6px', borderRight: '1px solid #000' }}></td>
              <td style={{ padding: '8px 6px', borderRight: '1px solid #000' }}></td>
              <td style={{ padding: '8px 6px' }}></td>
            </tr>
          ))}
          {/* Total weight row */}
          <tr style={{ borderTop: '1px solid #000' }}>
            <td colSpan={3} style={{ padding: '4px 6px', borderRight: '1px solid #000' }}></td>
            <td style={{ padding: '4px 6px', borderRight: '1px solid #000', fontWeight: 'bold' }}>
              {weight.toLocaleString()}
            </td>
            <td style={{ padding: '4px 6px', borderRight: '1px solid #000' }}></td>
            <td style={{ padding: '4px 6px' }}></td>
          </tr>
        </tbody>
      </table>

      {/* COD / Charges section */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', border: '1px solid #000', borderTop: 'none' }}>
        <tbody>
          <tr>
            <td style={{ width: '30%', padding: '4px 6px', borderRight: '1px solid #000', verticalAlign: 'top' }}>
              <div style={{ fontWeight: 'bold' }}>REMIT C.O.D. TO ADDRESS</div>
            </td>
            <td style={{ width: '40%', padding: '4px 6px', borderRight: '1px solid #000', fontSize: '8px' }}>
              Subject to Section 7 of the conditions, of this shipment is to be delivered to the consignee without recourse on the consignor, the consignor shall sign the following statement: The carrier shall not make delivery of this shipment without payment of freight and all other lawful charges.
              <div style={{ marginTop: '8px', borderTop: '1px solid #000', paddingTop: '4px', textAlign: 'center', fontWeight: 'bold' }}>Signature of Consignor</div>
            </td>
            <td style={{ width: '30%', padding: '4px 6px', fontSize: '8px' }}>
              <div style={{ fontWeight: 'bold' }}>C.O.D. FEE</div>
              <div>PREPAID □ &nbsp;&nbsp; COLLECT □</div>
              <div style={{ marginTop: '6px', fontWeight: 'bold' }}>TOTAL CHARGES: $</div>
              <div style={{ marginTop: '6px', fontWeight: 'bold' }}>FREIGHT CHARGES</div>
              <div>FREIGHT PREPAID □ &nbsp; Check box</div>
              <div>except when &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; if charges</div>
              <div>box at right &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; are to be</div>
              <div>is checked. □ &nbsp;&nbsp;&nbsp;&nbsp; collect.</div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Legal text */}
      <div style={{ fontSize: '7.5px', padding: '4px 0', borderTop: '1px solid #000', lineHeight: '1.3', color: '#000' }}>
        RECEIVED, subject to the classifications and tariffs in effect on the date of the issue of this Bill of Lading, the property described above in apparent good order, except as noted (contents and condition of packages unknown), marked, consigned, and destined as indicate above which said carrier (the word carrier being understood throughout this contract as meaning any person or corporation in possession of the property under the contract) agrees to carry to its usual place of delivery at said destination, if on its route, otherwise to deliver to another carrier on the route to said destination. It is mutually agreed as to each carrier of all or any of, said property overall or any portion of said route to destination and as to each party at any time interested in all or any of said property, that every service to be performed hereunder shall be subject to all the bill of lading terms and conditions in the governing classification on the date of shipment. Shipper hereby certifies that he is familiar with all the bill of lading terms and conditions in the governing classification and the said terms and conditions are hereby agreed to by the shipper and accepted for himself and his assigns.
      </div>

      {/* Signatures */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginTop: '4px' }}>
        <tbody>
          <tr>
            <td style={{ width: '45%', paddingRight: '16px', verticalAlign: 'top' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>SHIPPER &nbsp; Speyside Bourbon Cooperage, Inc.</div>
              <div style={{ fontSize: '9px', marginBottom: '2px' }}>960 E. Main Street • Jackson, Ohio 45640</div>
              <div style={{ fontWeight: 'bold', marginTop: '6px' }}>PER</div>
              <div style={{ borderBottom: '1px solid #000', marginBottom: '4px', paddingBottom: '2px', minHeight: '20px' }}>
                {shipperName}
              </div>
              <div style={{ borderBottom: '1px solid #000', marginTop: '8px', paddingBottom: '2px' }}>
                {formattedDate}
              </div>
            </td>
            <td style={{ width: '55%', verticalAlign: 'top' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>CARRIER &nbsp; {carrier?.name || ''}</div>
              <div style={{ fontWeight: 'bold', marginTop: '6px' }}>PER (Driver Signature)</div>
              {driverSigDataUrl ? (
                <img src={driverSigDataUrl} alt="Driver signature" style={{ height: '50px', width: '200px', objectFit: 'contain', border: '1px solid #ccc', display: 'block' }} />
              ) : (
                <div style={{ borderBottom: '1px solid #000', height: '40px', marginBottom: '4px' }}></div>
              )}
              <div style={{ borderBottom: '1px solid #000', marginTop: '8px', paddingBottom: '2px' }}>
                DATE &nbsp; {formattedDate}
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ fontSize: '8px', marginTop: '4px', color: '#000' }}>
        * Mark with "X" to designate Hazardous Material as defined in Title 49 of the Code of Federal Regulations
      </div>
    </div>
  );
}

// ─── BOL Modal (capture signature, shipper, then print/save) ─────────────────

export function BolModal({ load, onClose, onBolCreated }) {
  const [shipperName, setShipperName] = useState(SHIPPER_NAMES[0]);
  const [customShipper, setCustomShipper] = useState('');
  const [driverSigDataUrl, setDriverSigDataUrl] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const customer = load.customer;
  const carrier = load.carrier;
  const finalShipperName = shipperName === 'Other' ? customShipper : shipperName;

  const handlePrint = async () => {
    setSaving(true);

    // Save PDF record to Supabase
    try {
      const fileName = `${load.bol_number}_${(customer?.name || 'Unknown').replace(/\s+/g, '_')}.pdf`;

      await supabase.from('bol_log').insert([{
        load_id: load.id,
        bol_number: load.bol_number,
        customer_id: load.customer_id,
        carrier_id: load.carrier_id,
        ship_date: load.ship_date,
        barrel_count: load.barrel_count,
        shipper_name: finalShipperName,
        driver_signature: driverSigDataUrl,
        trailer_number: load.trailer_number,
        seal_number: load.seal_number,
        file_name: fileName,
        status: 'active',
        created_at: new Date().toISOString(),
      }]);
    } catch (err) {
      console.error('BOL log save error:', err);
    }

    setSaving(false);
    setSaved(true);

    // Trigger print
    setTimeout(() => {
      window.print();
    }, 300);

    if (onBolCreated) onBolCreated();
  };

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #bol-print-root { display: block !important; }
          #bol-print-content { width: 100% !important; padding: 10px !important; }
        }
        @media screen {
          #bol-print-root { display: none; }
        }
      `}</style>

      {/* Hidden print target */}
      <div id="bol-print-root">
        <BolPrintView
          load={load}
          customer={customer}
          carrier={carrier}
          shipperName={finalShipperName}
          driverSigDataUrl={driverSigDataUrl}
          bolNumber={load.bol_number}
          shipDate={load.ship_date}
        />
      </div>

      {/* Modal UI */}
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
      }}>
        <div style={{
          background: '#1e293b', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '16px', width: '100%', maxWidth: '560px',
          maxHeight: '90vh', overflowY: 'auto', padding: '28px',
        }}>
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
            {driverSigDataUrl && (
              <div style={{ color: '#34d399', fontSize: '12px', marginTop: '6px' }}>✓ Signature captured</div>
            )}
            {!driverSigDataUrl && (
              <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '6px' }}>Draw driver signature above</div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={onClose} style={{ flex: 1, padding: '11px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#94a3b8', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
              Cancel
            </button>
            <button
              onClick={handlePrint}
              disabled={saving || !driverSigDataUrl || (shipperName === 'Other' && !customShipper.trim())}
              style={{
                flex: 2, padding: '11px', background: '#c4a35a', border: 'none', borderRadius: '8px',
                color: '#1a1a1a', fontSize: '14px', fontWeight: '700',
                cursor: (saving || !driverSigDataUrl || (shipperName === 'Other' && !customShipper.trim())) ? 'not-allowed' : 'pointer',
                opacity: (saving || !driverSigDataUrl || (shipperName === 'Other' && !customShipper.trim())) ? 0.5 : 1,
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
    </>
  );
}

export default BolModal;
