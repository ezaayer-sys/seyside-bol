// src/lib/bol-generator.js
// Generate Speyside BOL PDFs matching the physical carbon copy format

import PDFDocument from 'pdfkit';

/**
 * Generate BOL PDF for a load
 * Matches the exact Speyside physical BOL format
 */
export async function generateBolPdf(load, customer, carrier) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'letter',
        margin: 0.5 * 72, // 0.5 inch margins
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      // ─────────────────────────────────────────────────────────────────────
      // HEADER
      // ─────────────────────────────────────────────────────────────────────

      // Black header bar with white text
      doc
        .rect(0, 36, doc.page.width, 24)
        .fill('#000000');

      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .fill('#FFFFFF')
        .text('BILL OF LADING', 40, 42, { width: 475 });

      // Speyside logo and company info (left side)
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fill('#000000')
        .text('Speyside Bourbon', 40, 70);

      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('Cooperage, Inc', 40, 85);

      doc
        .fontSize(10)
        .font('Helvetica')
        .text('960 E. Main St • P.O. Box 509', 40, 102);

      doc
        .fontSize(10)
        .text('Jackson, Ohio 45640 • 855-276-2386', 40, 115);

      // BOL info (right side)
      const rightCol = 400;

      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Bill of Lading No.', rightCol, 70);

      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .text(load.bol_number || 'DRAFT', rightCol + 120, 68, { width: 80 });

      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Shipper No.', rightCol, 100);

      doc
        .fontSize(12)
        .font('Helvetica')
        .text(load.trailer_number || '___________', rightCol + 120, 98, {
          width: 80,
        });

      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Carrier No.', rightCol, 130);

      doc
        .fontSize(10)
        .font('Helvetica')
        .text('___________________', rightCol + 120, 130, { width: 80 });

      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Date', rightCol, 160);

      const shipDate = new Date(load.ship_date).toLocaleDateString('en-US', {
        month: '1-digit',
        day: '1-digit',
        year: '2-digit',
      });

      doc
        .fontSize(10)
        .font('Helvetica')
        .text(shipDate, rightCol + 120, 160, { width: 80 });

      // ─────────────────────────────────────────────────────────────────────
      // FROM / TO SECTION
      // ─────────────────────────────────────────────────────────────────────

      const yFrom = 195;

      // Carrier name
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Name of Carrier:', 40, yFrom);

      doc
        .fontSize(10)
        .font('Helvetica')
        .text(carrier?.name || '', 180, yFrom);

      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('(SCAC)', 420, yFrom);

      doc
        .fontSize(10)
        .font('Helvetica')
        .text(carrier?.scac || '', 470, yFrom);

      // Horizontal line
      doc
        .moveTo(40, yFrom + 20)
        .lineTo(550, yFrom + 20)
        .stroke('#000000');

      // TO: section
      const yTo = yFrom + 30;

      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('TO:', 40, yTo);

      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Consignee', 40, yTo + 15);

      doc
        .fontSize(10)
        .font('Helvetica')
        .text(customer?.name || '', 40, yTo + 30);

      // Ship to address
      const shipAddress = load.ship_to_address || customer?.shipping_address;
      if (shipAddress) {
        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
            `${shipAddress.street || ''}, ${shipAddress.city || ''}, ${shipAddress.state || ''} ${shipAddress.zip || ''}`,
            40,
            yTo + 45,
            { width: 200 }
          );
      }

      // FROM: section (right side)
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('FROM:', 300, yTo);

      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Shipper', 300, yTo + 15);

      doc
        .fontSize(10)
        .font('Helvetica')
        .text('Speyside Bourbon Cooperage, Inc', 300, yTo + 30);

      doc
        .fontSize(9)
        .font('Helvetica')
        .text('960 E. Main St, Jackson, OH 45640', 300, yTo + 45);

      // ─────────────────────────────────────────────────────────────────────
      // SHIPPING DETAILS TABLE
      // ─────────────────────────────────────────────────────────────────────

      const yTable = yTo + 85;

      // Table headers
      const headers = [
        { text: 'No. Shipping Units', x: 40, width: 80 },
        { text: 'HM', x: 120, width: 40 },
        {
          text: 'Kind of Packaging, Description of Articles, Special Marks and Exceptions',
          x: 160,
          width: 200,
        },
        { text: 'Weight Subject to Change', x: 360, width: 80 },
        { text: 'Rate', x: 440, width: 50 },
        { text: 'Charges', x: 490, width: 60 },
      ];

      // Draw header row
      doc.rect(40, yTable, 510, 20).stroke();

      headers.forEach((header) => {
        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .text(header.text, header.x, yTable + 3, {
            width: header.width,
            height: 14,
          });
      });

      // Data row
      const yDataRow = yTable + 20;
      const barrelDescription = buildBarrelDescription(load);

      doc.rect(40, yDataRow, 510, 60).stroke();

      doc
        .fontSize(10)
        .font('Helvetica')
        .text(load.barrel_count.toString(), 45, yDataRow + 5);

      doc
        .fontSize(9)
        .font('Helvetica')
        .text(barrelDescription, 160, yDataRow + 5, {
          width: 200,
          height: 50,
        });

      doc
        .fontSize(10)
        .font('Helvetica')
        .text((load.barrel_count * 100).toString(), 360, yDataRow + 5); // 100 lbs per barrel

      // Total weight row
      const yTotal = yDataRow + 60;
      doc.rect(360, yTotal, 150, 20).stroke();

      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('TOTAL WEIGHT:', 365, yTotal + 3);

      doc
        .fontSize(10)
        .font('Helvetica')
        .text((load.barrel_count * 100).toString(), 440, yTotal + 3);

      // ─────────────────────────────────────────────────────────────────────
      // REMIT / COD / CHARGES SECTION
      // ─────────────────────────────────────────────────────────────────────

      const yBottom = yTotal + 25;

      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('REMIT C.O.D. TO ADDRESS', 40, yBottom);

      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('C.O.D.', 280, yBottom);

      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('Amt. $', 340, yBottom);

      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('C.O.D. FEE PREPAID', 400, yBottom);

      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('TOTAL CHARGES: $', 280, yBottom + 40);

      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('FREIGHT CHARGES', 280, yBottom + 55);

      doc
        .fontSize(9)
        .font('Helvetica')
        .text('FREIGHT PREPAID ☐  Check box if charges', 280, yBottom + 68, {
          width: 140,
        });

      doc
        .fontSize(9)
        .font('Helvetica')
        .text('except when not right ☐  are to be ☐', 280, yBottom + 83, {
          width: 140,
        });

      doc
        .fontSize(9)
        .font('Helvetica')
        .text('is checked.  collected.', 280, yBottom + 98, { width: 140 });

      // ─────────────────────────────────────────────────────────────────────
      // SIGNATURES
      // ─────────────────────────────────────────────────────────────────────

      const ySig = yBottom + 120;

      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('SHIPPER', 40, ySig);

      doc.moveTo(40, ySig + 50).lineTo(180, ySig + 50).stroke();

      doc
        .fontSize(8)
        .font('Helvetica')
        .text('Signature of Consignor', 40, ySig + 55);

      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('CARRIER', 280, ySig);

      doc.moveTo(280, ySig + 50).lineTo(420, ySig + 50).stroke();

      doc
        .fontSize(8)
        .font('Helvetica')
        .text('PER', 280, ySig + 55);

      // PER date
      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('PER', 40, ySig + 80);

      doc.moveTo(40, ySig + 110).lineTo(180, ySig + 110).stroke();

      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('DATE', 280, ySig + 80);

      doc.moveTo(280, ySig + 110).lineTo(420, ySig + 110).stroke();

      // Footer text
      doc
        .fontSize(8)
        .font('Helvetica')
        .text(
          '* Mark with "X" to designate Hazardous Material as defined in Title 49 of the Code of Federal Regulations',
          40,
          ySig + 125
        );

      // Finalize
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Build barrel description string from load specs
 */
function buildBarrelDescription(load) {
  if (!load.barrel_specs_custom && (!load.barrel_spec_ids || load.barrel_spec_ids.length === 0)) {
    return 'Barrels (specs to be provided)';
  }

  // If custom specs, format from JSONB
  if (load.barrel_specs_custom) {
    return load.barrel_specs_custom
      .map(
        (spec) =>
          `${spec.size || '53 gal'} ${spec.wood || 'Oak'} Barrels\n${spec.char_level || 'Char'}`
      )
      .join('\n\n');
  }

  // Fallback
  return 'American White Oak Barrels';
}

/**
 * Download PDF to browser
 */
export function downloadPdf(pdfBuffer, fileName) {
  const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Convert PDF buffer to base64 for storage
 */
export function pdfBufferToBase64(buffer) {
  if (typeof buffer === 'string') return buffer;
  return Buffer.from(buffer).toString('base64');
}

/**
 * Format BOL number for display
 * Input: load object with ship_date
 * Output: "June26-001"
 */
export function formatBolNumber(shipDate, sequence) {
  const date = new Date(shipDate);
  const month = date.toLocaleString('default', { month: 'long' });
  const year = date.getFullYear().toString().slice(2);
  const seq = String(sequence).padStart(3, '0');

  return `${month}${year}-${seq}`;
}

/**
 * Get month-year string for grouping
 * Output: "June26"
 */
export function getMonthYearString(shipDate) {
  const date = new Date(shipDate);
  const month = date.toLocaleString('default', { month: 'long' });
  const year = date.getFullYear().toString().slice(2);

  return `${month}${year}`;
}
