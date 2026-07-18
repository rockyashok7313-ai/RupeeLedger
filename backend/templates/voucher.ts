import { formatINR, numberToIndianWords } from './utils.js';
import { renderLayout } from './layout.js';

export function renderVoucher(data: any): string {
  const { transaction, account, businessProfile } = data;
  
  if (!transaction || !account) return renderLayout({ title: 'Voucher', businessProfile, content: '<p>No data provided.</p>', size: 'A5' });

  const isCredit = transaction.type === 'Credit';
  const voucherType = isCredit ? 'RECEIPT VOUCHER' : 'PAYMENT VOUCHER';
  const colorClass = isCredit ? 'text-green-700' : 'text-red-600';

  const content = `
    <div class="flex flex-col h-full justify-between pb-8">
      <!-- Main Content Area -->
      <div class="flex-grow flex flex-col justify-center gap-6 mt-4">
        
        <div class="text-center mb-4">
          <h2 class="text-xl font-bold uppercase tracking-widest ${colorClass}">${voucherType}</h2>
          <p class="text-slate-500 text-xs mt-1 font-semibold">Date: ${new Date(transaction.date).toLocaleDateString('en-IN')}</p>
        </div>

        <div class="border-2 border-slate-200 rounded-lg p-6 bg-slate-50 shadow-sm relative">
          <!-- Decorative corners -->
          <div class="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-slate-400 -mt-0.5 -ml-0.5"></div>
          <div class="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-slate-400 -mt-0.5 -mr-0.5"></div>
          <div class="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-slate-400 -mb-0.5 -ml-0.5"></div>
          <div class="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-slate-400 -mb-0.5 -mr-0.5"></div>

          <div class="grid grid-cols-12 gap-y-4 text-sm items-center">
            
            <div class="col-span-4 text-slate-500 font-bold uppercase text-xs">Account</div>
            <div class="col-span-8 font-extrabold text-slate-900 text-base">${account.name}</div>
            
            <div class="col-span-4 text-slate-500 font-bold uppercase text-xs">Amount</div>
            <div class="col-span-8 font-extrabold ${colorClass} text-2xl tracking-tight">
              ${formatINR(transaction.amount)}
            </div>
            
            <div class="col-span-4 text-slate-500 font-bold uppercase text-xs">In Words</div>
            <div class="col-span-8 font-bold text-slate-700 italic border-b border-dashed border-slate-300 pb-1">
              ${numberToIndianWords(transaction.amount)}
            </div>

            <div class="col-span-4 text-slate-500 font-bold uppercase text-xs mt-2">Narration</div>
            <div class="col-span-8 font-bold text-slate-800 mt-2 bg-white p-2 border border-slate-200 rounded">
              ${transaction.description || 'N/A'}
            </div>
            
          </div>
        </div>

      </div>

      <!-- Signatures Footer -->
      <div class="mt-16 pt-8 flex justify-between items-end border-t border-slate-200">
        <div class="w-1/3 text-center">
          <div class="border-b border-slate-400 w-full mb-2"></div>
          <p class="text-xs font-bold text-slate-600">Receiver's Signature</p>
        </div>
        <div class="w-1/3 text-center">
          <div class="border-b border-slate-400 w-full mb-2"></div>
          <p class="text-xs font-bold text-slate-600">Authorized Signatory</p>
          <p class="text-[10px] text-slate-400 mt-1">For ${businessProfile.companyName}</p>
        </div>
      </div>
    </div>
  `;

  return renderLayout({ 
    title: 'VOUCHER', 
    businessProfile, 
    content,
    size: 'A5'
  });
}
