import { Invoice, BusinessProfile } from './types';

export function generateGSTR1JSON(invoices: Invoice[], businessProfile: BusinessProfile, periodYear: number, periodMonth: number) {
  const gstin = businessProfile.gstin || 'UNREGISTERED';
  const fp = `${String(periodMonth).padStart(2, '0')}${periodYear}`;
  
  const b2b: any[] = [];
  const b2cs: any[] = [];
  
  // Basic separation of B2B and B2CS
  invoices.forEach(inv => {
    // Only process Tax Invoices
    if (inv.type && inv.type !== 'Tax Invoice') return;

    // Filter by period
    const d = new Date(inv.date);
    if (d.getFullYear() !== periodYear || (d.getMonth() + 1) !== periodMonth) return;

    const invoiceData = {
      inum: inv.invoiceNumber || inv.id,
      idt: d.toLocaleDateString('en-IN').replace(/\//g, '-'), // DD-MM-YYYY
      val: inv.total,
      pos: '27', // Place of supply state code (dummy 27 for Maharashtra)
      rchrg: 'N',
      inv_typ: 'R',
      itms: inv.items.map(item => ({
        num: 1, // Line number
        itm_det: {
          txval: item.amount - (item.amount * (item.taxPercent / (100 + item.taxPercent))),
          rt: item.taxPercent,
          iamt: inv.gstType === 'IGST' ? (item.amount * (item.taxPercent / (100 + item.taxPercent))) : 0,
          camt: inv.gstType === 'CGST+SGST' ? (item.amount * (item.taxPercent / (100 + item.taxPercent)) / 2) : 0,
          samt: inv.gstType === 'CGST+SGST' ? (item.amount * (item.taxPercent / (100 + item.taxPercent)) / 2) : 0,
        }
      }))
    };

    if (inv.customerGstin && inv.customerGstin.length === 15) {
      // It's B2B
      let existingB2b = b2b.find(b => b.ctin === inv.customerGstin);
      if (!existingB2b) {
        existingB2b = { ctin: inv.customerGstin, inv: [] };
        b2b.push(existingB2b);
      }
      existingB2b.inv.push(invoiceData);
    } else {
      // It's B2C Small
      b2cs.push({
        sply_ty: inv.gstType === 'IGST' ? 'INTER' : 'INTRA',
        txval: inv.subtotal,
        typ: 'OE',
        rt: inv.items[0]?.taxPercent || 18,
        pos: '27',
        iamt: inv.igst,
        camt: inv.cgst,
        samt: inv.sgst
      });
    }
  });

  return {
    gstin,
    fp,
    gt: 0, // Previous year gross turnover, skipped for simplicity
    b2b,
    b2cs,
    hsn: { data: [] } // Left out for brevity
  };
}
