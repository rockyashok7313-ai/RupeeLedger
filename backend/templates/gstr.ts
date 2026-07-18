import { formatINR } from './utils.js';
import { renderLayout } from './layout.js';

export function renderGSTR(data: any): string {
  const { 
    selectedMonth,
    stats,
    businessProfile
  } = data;
  
  if (!stats) return renderLayout({ title: 'GSTR Report', businessProfile, content: '<p>No data provided.</p>' });
  
  const content = `
    <div class="mb-4 flex justify-between items-end border-b border-slate-200 pb-2">
      <div>
        <p class="font-bold text-slate-800 text-lg">GSTR-3B Summary</p>
        <p class="text-xs text-slate-600 font-bold">GSTIN: ${businessProfile.gstin || 'Not Provided'}</p>
      </div>
      <div class="text-right">
        <p class="text-xs text-slate-600 font-bold uppercase tracking-widest">Return Period: ${selectedMonth}</p>
      </div>
    </div>

    <!-- 3.1 Outward Supplies Table -->
    <h3 class="text-sm font-bold text-slate-800 mb-2 mt-6">3.1 Details of Outward Supplies and inward supplies liable to reverse charge</h3>
    <table class="w-full mb-6 border border-slate-300">
      <thead class="bg-slate-100 border-b border-slate-300">
        <tr>
          <th class="py-2 px-2 text-left text-xs font-bold text-slate-700">Nature of Supplies</th>
          <th class="py-2 px-2 text-right text-xs font-bold text-slate-700 w-28">Total Taxable Value</th>
          <th class="py-2 px-2 text-right text-xs font-bold text-slate-700 w-24">Integrated Tax</th>
          <th class="py-2 px-2 text-right text-xs font-bold text-slate-700 w-24">Central Tax</th>
          <th class="py-2 px-2 text-right text-xs font-bold text-slate-700 w-24">State/UT Tax</th>
        </tr>
      </thead>
      <tbody>
        <tr class="border-b border-slate-200">
          <td class="py-2 px-2 text-xs text-slate-700">(a) Outward taxable supplies (other than zero rated, nil rated and exempted)</td>
          <td class="py-2 px-2 text-right text-xs font-bold text-slate-800">${formatINR(stats.sales.taxableAmount)}</td>
          <td class="py-2 px-2 text-right text-xs font-bold text-slate-800">${formatINR(stats.sales.igst)}</td>
          <td class="py-2 px-2 text-right text-xs font-bold text-slate-800">${formatINR(stats.sales.cgst)}</td>
          <td class="py-2 px-2 text-right text-xs font-bold text-slate-800">${formatINR(stats.sales.sgst)}</td>
        </tr>
      </tbody>
    </table>

    <!-- 4. Eligible ITC Table -->
    <h3 class="text-sm font-bold text-slate-800 mb-2 mt-6">4. Eligible ITC</h3>
    <table class="w-full mb-6 border border-slate-300">
      <thead class="bg-slate-100 border-b border-slate-300">
        <tr>
          <th class="py-2 px-2 text-left text-xs font-bold text-slate-700">Details</th>
          <th class="py-2 px-2 text-right text-xs font-bold text-slate-700 w-24">Integrated Tax</th>
          <th class="py-2 px-2 text-right text-xs font-bold text-slate-700 w-24">Central Tax</th>
          <th class="py-2 px-2 text-right text-xs font-bold text-slate-700 w-24">State/UT Tax</th>
        </tr>
      </thead>
      <tbody>
        <tr class="border-b border-slate-200">
          <td class="py-2 px-2 text-xs text-slate-700">(C) Net ITC Available (A - B)</td>
          <td class="py-2 px-2 text-right text-xs font-bold text-green-700">${formatINR(stats.itc.igst)}</td>
          <td class="py-2 px-2 text-right text-xs font-bold text-green-700">${formatINR(stats.itc.cgst)}</td>
          <td class="py-2 px-2 text-right text-xs font-bold text-green-700">${formatINR(stats.itc.sgst)}</td>
        </tr>
      </tbody>
    </table>

    <!-- Net Tax Payable -->
    <div class="mt-8 border-2 border-slate-300 rounded p-4 bg-slate-50">
      <h3 class="text-sm font-bold text-slate-800 mb-4 border-b border-slate-200 pb-2">Net Tax Payable (Cash Ledger)</h3>
      <div class="grid grid-cols-3 gap-4">
        <div>
          <p class="text-xs text-slate-500 uppercase font-bold">IGST Payable</p>
          <p class="text-lg font-extrabold text-red-600 mt-1">${formatINR(stats.payable.igst)}</p>
        </div>
        <div>
          <p class="text-xs text-slate-500 uppercase font-bold">CGST Payable</p>
          <p class="text-lg font-extrabold text-red-600 mt-1">${formatINR(stats.payable.cgst)}</p>
        </div>
        <div>
          <p class="text-xs text-slate-500 uppercase font-bold">SGST Payable</p>
          <p class="text-lg font-extrabold text-red-600 mt-1">${formatINR(stats.payable.sgst)}</p>
        </div>
      </div>
    </div>
  `;

  return renderLayout({ 
    title: 'GSTR-3B SUMMARY', 
    businessProfile, 
    content,
    size: 'A4'
  });
}
