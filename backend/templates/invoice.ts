import { formatINR, numberToIndianWords } from './utils.js';
import { renderLayout } from './layout.js';

export function renderInvoice(data: any): string {
  const { invoice, businessProfile } = data;
  
  if (!invoice) return renderLayout({ title: 'Invoice', businessProfile, content: '<p>No invoice data provided.</p>' });
  
  const isIgst = !!invoice.isIgst;

  let itemsHtml = '';
  invoice.items.forEach((item: any, index: number) => {
    itemsHtml += `
      <tr class="border-b border-slate-200 hover:bg-slate-50 text-sm">
        <td class="py-3 px-2 text-center text-slate-500">${index + 1}</td>
        <td class="py-3 px-2">
          <p class="font-bold text-slate-800">${item.description}</p>
          ${item.hsn ? `<p class="text-xs text-slate-500">HSN/SAC: ${item.hsn}</p>` : ''}
        </td>
        <td class="py-3 px-2 text-right">${item.quantity}</td>
        <td class="py-3 px-2 text-right">${formatINR(item.rate)}</td>
        <td class="py-3 px-2 text-right text-slate-500">${item.taxPercent}%</td>
        <td class="py-3 px-2 text-right font-bold text-slate-800">${formatINR(item.total)}</td>
      </tr>
    `;
  });

  const content = `
    <div class="mb-6 flex justify-between items-start text-sm">
      <div class="w-1/2 pr-4 border-r border-slate-200">
        <p class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Billed To:</p>
        <p class="font-bold text-lg text-slate-800">${invoice.clientName}</p>
        ${invoice.clientAddress ? `<p class="text-slate-600 mt-1 whitespace-pre-line">${invoice.clientAddress}</p>` : ''}
        ${invoice.clientGstin ? `<p class="font-semibold text-slate-700 mt-2">GSTIN: ${invoice.clientGstin}</p>` : ''}
      </div>
      <div class="w-1/2 pl-6">
        <table class="w-full text-right text-sm">
          <tbody>
            <tr>
              <td class="py-1 text-slate-500">Invoice No:</td>
              <td class="py-1 font-bold text-slate-800">${invoice.invoiceNumber || invoice.id}</td>
            </tr>
            <tr>
              <td class="py-1 text-slate-500">Date:</td>
              <td class="py-1 font-bold text-slate-800">${new Date(invoice.date).toLocaleDateString('en-IN')}</td>
            </tr>
            ${invoice.dueDate ? `
            <tr>
              <td class="py-1 text-slate-500">Due Date:</td>
              <td class="py-1 font-bold text-slate-800">${new Date(invoice.dueDate).toLocaleDateString('en-IN')}</td>
            </tr>` : ''}
            ${invoice.placeOfSupply ? `
            <tr>
              <td class="py-1 text-slate-500">Place of Supply:</td>
              <td class="py-1 font-bold text-slate-800">${invoice.placeOfSupply}</td>
            </tr>` : ''}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Items Table -->
    <table class="w-full mb-6 border border-slate-200">
      <thead class="bg-slate-100 border-b border-slate-300">
        <tr>
          <th class="py-2 px-2 text-center text-xs font-bold text-slate-700 w-12">#</th>
          <th class="py-2 px-2 text-left text-xs font-bold text-slate-700">Item Description</th>
          <th class="py-2 px-2 text-right text-xs font-bold text-slate-700 w-20">Qty</th>
          <th class="py-2 px-2 text-right text-xs font-bold text-slate-700 w-28">Rate</th>
          <th class="py-2 px-2 text-right text-xs font-bold text-slate-700 w-20">GST</th>
          <th class="py-2 px-2 text-right text-xs font-bold text-slate-700 w-32">Total Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <!-- Totals and Payment Section -->
    <div class="flex justify-between items-start mt-6">
      <div class="w-1/2 pr-6">
        <div class="mb-4">
          <p class="text-xs text-slate-500 font-bold uppercase mb-1">Amount in Words:</p>
          <p class="font-bold text-sm text-slate-800 italic">${numberToIndianWords(invoice.total)}</p>
        </div>
        
        <div class="mt-6 border border-slate-200 p-4 rounded-md bg-slate-50 text-sm">
          <p class="text-xs text-slate-500 font-bold uppercase border-b border-slate-200 pb-2 mb-2">Bank Details</p>
          ${businessProfile.bankName ? `
          <div class="grid grid-cols-3 gap-y-1 mt-2">
            <span class="text-slate-500">Bank:</span> <span class="col-span-2 font-bold text-slate-800">${businessProfile.bankName}</span>
            <span class="text-slate-500">A/C Name:</span> <span class="col-span-2 font-bold text-slate-800">${businessProfile.bankAccountName || businessProfile.companyName}</span>
            <span class="text-slate-500">A/C No:</span> <span class="col-span-2 font-bold text-slate-800">${businessProfile.bankAccountNumber}</span>
            <span class="text-slate-500">IFSC:</span> <span class="col-span-2 font-bold text-slate-800">${businessProfile.bankIfsc}</span>
          </div>` : '<p class="text-slate-400 italic">No bank details provided.</p>'}
        </div>
      </div>
      
      <div class="w-2/5 border border-slate-300 rounded-md overflow-hidden text-sm">
        <table class="w-full">
          <tbody>
            <tr class="border-b border-slate-200">
              <td class="py-2 px-4 text-slate-600">Taxable Amount</td>
              <td class="py-2 px-4 text-right font-bold text-slate-800">${formatINR(invoice.subtotal)}</td>
            </tr>
            ${isIgst ? `
            <tr class="border-b border-slate-200 bg-slate-50/50">
              <td class="py-2 px-4 text-slate-600">IGST</td>
              <td class="py-2 px-4 text-right font-bold text-slate-800">${formatINR(invoice.igst)}</td>
            </tr>
            ` : `
            <tr class="border-b border-slate-200 bg-slate-50/50">
              <td class="py-2 px-4 text-slate-600">CGST</td>
              <td class="py-2 px-4 text-right font-bold text-slate-800">${formatINR(invoice.cgst)}</td>
            </tr>
            <tr class="border-b border-slate-200 bg-slate-50/50">
              <td class="py-2 px-4 text-slate-600">SGST</td>
              <td class="py-2 px-4 text-right font-bold text-slate-800">${formatINR(invoice.sgst)}</td>
            </tr>
            `}
            <tr class="bg-bahi-red text-white">
              <td class="py-3 px-4 font-bold uppercase tracking-wide">Total Amount</td>
              <td class="py-3 px-4 text-right font-bold text-lg">${formatINR(invoice.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Signatory -->
    <div class="mt-16 flex justify-end">
      <div class="text-center w-64">
        <div class="border-b-2 border-slate-400 w-full mb-2"></div>
        <p class="font-bold text-slate-800 text-sm">For ${businessProfile.companyName}</p>
        <p class="text-xs text-slate-500">Authorized Signatory</p>
      </div>
    </div>
  `;

  return renderLayout({ 
    title: 'TAX INVOICE', 
    businessProfile, 
    content,
    size: 'A4',
    watermark: invoice.status === 'draft' ? 'DRAFT' : '' 
  });
}
