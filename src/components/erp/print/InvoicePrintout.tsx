"use client";

import React from "react";
import { format } from "date-fns";

export interface PrintInvoiceProps {
  invoice: any;
  copyType: 'Original' | 'Duplicate' | 'Triplicate';
  company?: any;
  party?: any;
  products?: any[];
}

function numberToWords(num: number): string {
  if (num === 0) return 'ZERO';
  const a = ['', 'ONE ', 'TWO ', 'THREE ', 'FOUR ', 'FIVE ', 'SIX ', 'SEVEN ', 'EIGHT ', 'NINE ', 'TEN ', 'ELEVEN ', 'TWELVE ', 'THIRTEEN ', 'FOURTEEN ', 'FIFTEEN ', 'SIXTEEN ', 'SEVENTEEN ', 'EIGHTEEN ', 'NINETEEN '];
  const b = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
  const regex = /^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/;
  const n = ('000000000' + num.toFixed(0)).match(regex);
  if (!n) return '';
  let str = '';
  str += (Number(n[1]) != 0) ? (a[Number(n[1])] || b[n[1][0] as any] + ' ' + a[n[1][1] as any]) + 'CRORE ' : '';
  str += (Number(n[2]) != 0) ? (a[Number(n[2])] || b[n[2][0] as any] + ' ' + a[n[2][1] as any]) + 'LAKH ' : '';
  str += (Number(n[3]) != 0) ? (a[Number(n[3])] || b[n[3][0] as any] + ' ' + a[n[3][1] as any]) + 'THOUSAND ' : '';
  str += (Number(n[4]) != 0) ? (a[Number(n[4])] || b[n[4][0] as any] + ' ' + a[n[4][1] as any]) + 'HUNDRED ' : '';
  str += (Number(n[5]) != 0) ? ((str != '') ? 'AND ' : '') + (a[Number(n[5])] || b[n[5][0] as any] + ' ' + a[n[5][1] as any]) : '';
  return str.trim();
}

export const InvoicePrintout = React.forwardRef<HTMLDivElement, PrintInvoiceProps>(
  ({ invoice, copyType, company, party, products }, ref) => {
    
    if (!invoice) return null;

    const isSale = invoice.sale_inv_id || invoice.so_id;
    const title = isSale ? "TAX INVOICE" : "PURCHASE INVOICE";
    const idField = isSale ? (invoice.sale_inv_id ? 'sale_inv_id' : 'so_id') : (invoice.purchase_inv_id ? 'purchase_inv_id' : 'po_id');
    const partyName = party ? (party.customer_name || party.vendor_name) : "Cash";
    
    const lines = invoice.lines || [];
    const CHUNK_SIZE = 13;
    const chunks = [];
    if (lines.length === 0) {
      chunks.push([]);
    } else {
      for(let i = 0; i < lines.length; i += CHUNK_SIZE) {
        chunks.push(lines.slice(i, i + CHUNK_SIZE));
      }
    }

    const totalQty = lines.reduce((sum: number, l: any) => sum + Number(l.quantity || 0), 0);
    const totalTaxable = Number(invoice.total_before_tax || 0);
    const totalCGST = Number(invoice.cgst_total || 0);
    const totalSGST = Number(invoice.sgst_total || 0);
    const grandTotal = Number(invoice.grand_total || 0);
    
    const bColor = "border-[#0055A5]";
    const tColor = "text-[#0055A5]";

    return (
      <div ref={ref}>
        {chunks.map((chunk, pageIndex) => {
          const isLastPage = pageIndex === chunks.length - 1;
          return (
            <div key={pageIndex} className="print-container bg-white text-black mx-auto w-[210mm] min-h-[297mm] relative font-sans" style={{ pageBreakAfter: isLastPage ? 'auto' : 'always', fontFamily: 'Arial, sans-serif' }}>
              
              <div className="flex justify-between items-start mb-2 pt-4 px-4">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-full border-2 border-red-500 text-red-500 flex items-center justify-center font-bold text-3xl overflow-hidden mt-1 bg-white">
                    {company?.company_name?.[0] || 'S'}
                  </div>
                  <div>
                    <h1 className="text-2xl font-black uppercase mb-1 leading-none">{company?.company_name || 'SENTHIL FURNITURES'}</h1>
                    <div className="text-xs leading-tight mt-2 whitespace-pre-wrap">
                      {company?.address || '10/36A1, MAIN ROAD,\nSOMANUR,\nCOIMBATORE., Tamil Nadu - 641668'}
                    </div>
                  </div>
                </div>
                <div className="text-right text-[11px] mt-1">
                  <p><span className="font-bold">Name :</span> {company?.contact_name || 'SENTHIL KUMAR'}</p>
                  <p><span className="font-bold">Phone :</span> {company?.phone || '9842935119'}</p>
                  <p><span className="font-bold">Email :</span> {company?.email || 'skexportfab@gmail.com'}</p>
                </div>
              </div>

              <div className={`border-2 ${bColor} mx-4 flex flex-col`} style={{ minHeight: '260mm' }}>
                <div className={`flex border-b-2 ${bColor}`}>
                  <div className="px-2 py-1 w-[40%] flex items-center font-bold text-sm">
                    GSTIN : {company?.gst_number || '33ACWFS9745A1ZP'}
                  </div>
                  <div className={`w-[20%] flex items-center justify-center font-bold text-xl ${tColor}`}>
                    {title}
                  </div>
                  <div className="px-2 py-1 w-[40%] flex items-center justify-end font-bold text-xs uppercase">
                    {copyType} FOR RECIPIENT
                  </div>
                </div>

                <div className={`flex border-b-2 ${bColor}`}>
                  <div className={`w-[45%] border-r-2 ${bColor} flex flex-col`}>
                    <div className={`text-center font-bold text-xs p-1 border-b ${bColor}`}>
                      Customer Detail
                    </div>
                    <div className="p-2 grid grid-cols-[80px_1fr] gap-1 text-[11px] leading-tight flex-1">
                      <div className="font-bold">Name</div>
                      <div className="uppercase">{partyName}</div>
                      <div className="font-bold">Address</div>
                      <div className="uppercase">{party?.address || '-'}</div>
                      <div className="font-bold">Phone</div>
                      <div>{party?.phone || '-'}</div>
                      <div className="font-bold">GSTIN</div>
                      <div>{party?.gst_number || '-'}</div>
                      <div className="font-bold">Place of Supply</div>
                      <div>{party?.state || '-'}</div>
                    </div>
                  </div>
                  
                  <div className="w-[55%] flex text-[11px]">
                    <div className={`w-1/2 p-2 border-r-2 ${bColor}`}>
                      <div className="flex justify-between mb-1">
                        <span>Invoice No.</span>
                        <span className="font-bold text-sm">{invoice[idField]}</span>
                      </div>
                      <div className="flex justify-between mb-1 mt-4">
                        <span>Supply Type</span>
                        <span className="font-bold">{invoice.supply_type || '-'}</span>
                      </div>
                      <div className="flex justify-between mb-1">
                        <span>Tax Type</span>
                        <span className="font-bold">{invoice.tax_type === 'intra' ? 'Intra-State' : invoice.tax_type === 'inter' ? 'Inter-State' : '-'}</span>
                      </div>
                    </div>
                    <div className="w-1/2 p-2">
                      <div className="flex justify-between mb-1">
                        <span>Invoice Date</span>
                        <span>{format(new Date(invoice.date || Date.now()), 'dd-MMM-yyyy')}</span>
                      </div>
                      <div className="flex justify-between mb-1 mt-4">
                        <span>Transporter ID</span>
                        <span className="font-bold">{invoice.transporter_id || '-'}</span>
                      </div>
                      <div className="flex justify-between mb-1">
                        <span>Vehicle No</span>
                        <span className="font-bold uppercase">{invoice.vehicle_no || '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 flex flex-col">
                  <table className="w-full border-collapse text-[10px] h-full" style={{ tableLayout: 'fixed' }}>
                    <thead>
                      <tr className={`border-b-2 ${bColor} text-center font-bold ${tColor}`}>
                        <th className={`border-r-2 ${bColor} p-1 w-[35px]`} rowSpan={2}>Sr.<br/>No.</th>
                        <th className={`border-r-2 ${bColor} p-1`} rowSpan={2}>Name of Product / Service</th>
                        <th className={`border-r-2 ${bColor} p-1 w-[70px]`} rowSpan={2}>HSN / SAC</th>
                        <th className={`border-r-2 ${bColor} p-1 w-[45px]`} rowSpan={2}>Qty</th>
                        <th className={`border-r-2 ${bColor} p-1 w-[60px]`} rowSpan={2}>Rate</th>
                        <th className={`border-r-2 ${bColor} p-1 w-[70px]`} rowSpan={2}>Taxable Value</th>
                        <th className={`border-r-2 ${bColor} p-0`} colSpan={2}>CGST</th>
                        <th className={`border-r-2 ${bColor} p-0`} colSpan={2}>SGST</th>
                        <th className={`p-1 w-[70px]`} rowSpan={2}>Total</th>
                      </tr>
                      <tr className={`border-b-2 ${bColor} text-center font-bold ${tColor}`}>
                        <th className={`border-r-2 border-t-2 ${bColor} p-1 w-[35px]`}>%</th>
                        <th className={`border-r-2 border-t-2 ${bColor} p-1 w-[55px]`}>Amount</th>
                        <th className={`border-r-2 border-t-2 ${bColor} p-1 w-[35px]`}>%</th>
                        <th className={`border-r-2 border-t-2 ${bColor} p-1 w-[55px]`}>Amount</th>
                      </tr>
                    </thead>
                    <tbody className="align-top">
                      {chunk.map((line: any, idx: number) => {
                        const prod = products?.find(p => p.product_id === line.product_id);
                        const pName = prod?.product_name || line.product_id;
                        const hsn = prod?.hsn_code || '';
                        const absoluteIdx = (pageIndex * CHUNK_SIZE) + idx + 1;
                        
                        return (
                          <tr key={idx} className="border-0">
                            <td className={`border-r-2 ${bColor} p-1 text-center`}>{absoluteIdx}</td>
                            <td className={`border-r-2 ${bColor} p-1 font-bold uppercase`}>{pName}</td>
                            <td className={`border-r-2 ${bColor} p-1 text-center`}>{hsn}</td>
                            <td className={`border-r-2 ${bColor} p-1 text-center`}>{Number(line.quantity).toFixed(2)}</td>
                            <td className={`border-r-2 ${bColor} p-1 text-right`}>{Number(line.unit_price).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                            <td className={`border-r-2 ${bColor} p-1 text-right`}>{(Number(line.quantity) * Number(line.unit_price)).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                            <td className={`border-r-2 ${bColor} p-1 text-center`}>{line.tax_rate ? (line.tax_rate / 2).toFixed(2) : '-'}</td>
                            <td className={`border-r-2 ${bColor} p-1 text-right`}>{Number(line.cgst_amount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                            <td className={`border-r-2 ${bColor} p-1 text-center`}>{line.tax_rate ? (line.tax_rate / 2).toFixed(2) : '-'}</td>
                            <td className={`border-r-2 ${bColor} p-1 text-right`}>{Number(line.sgst_amount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                            <td className="p-1 text-right">{Number(line.total_amount || (Number(line.quantity) * Number(line.unit_price))).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                          </tr>
                        )
                      })}
                      {Array.from({ length: Math.max(0, CHUNK_SIZE - chunk.length) }).map((_, idx) => (
                        <tr key={`empty-${idx}`} className="border-0 h-8">
                          <td className={`border-r-2 ${bColor}`}></td>
                          <td className={`border-r-2 ${bColor}`}></td>
                          <td className={`border-r-2 ${bColor}`}></td>
                          <td className={`border-r-2 ${bColor}`}></td>
                          <td className={`border-r-2 ${bColor}`}></td>
                          <td className={`border-r-2 ${bColor}`}></td>
                          <td className={`border-r-2 ${bColor}`}></td>
                          <td className={`border-r-2 ${bColor}`}></td>
                          <td className={`border-r-2 ${bColor}`}></td>
                          <td className={`border-r-2 ${bColor}`}></td>
                          <td></td>
                        </tr>
                      ))}
                      {/* Flex filler to push footer down */}
                      <tr className="h-full"><td colSpan={11} className="border-0"></td></tr>
                    </tbody>
                  </table>
                </div>

                {isLastPage && (
                  <div className="mt-auto">
                    <div className={`border-t-2 border-b-2 ${bColor} font-bold text-[11px] flex w-full`}>
                      <div className={`w-[420px] border-r-2 ${bColor} p-1 text-right`}>Total</div>
                      <div className={`w-[45px] border-r-2 ${bColor} p-1 text-center`}>{totalQty.toFixed(2)}</div>
                      <div className={`w-[60px] border-r-2 ${bColor}`}></div>
                      <div className={`w-[70px] border-r-2 ${bColor} p-1 text-right`}>{totalTaxable.toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
                      <div className={`w-[35px] border-r-2 ${bColor}`}></div>
                      <div className={`w-[55px] border-r-2 ${bColor} p-1 text-right`}>{totalCGST.toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
                      <div className={`w-[35px] border-r-2 ${bColor}`}></div>
                      <div className={`w-[55px] border-r-2 ${bColor} p-1 text-right`}>{totalSGST.toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
                      <div className="flex-1 p-1 text-right">{grandTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
                    </div>
                    
                    <div className="flex w-full">
                      <div className={`w-[60%] border-r-2 ${bColor} flex flex-col text-[11px]`}>
                        <div className={`border-b-2 ${bColor} flex min-h-[30px]`}>
                          <div className={`w-1/3 p-1 font-bold text-center border-r-2 ${bColor} flex items-center justify-center`}>Total in words</div>
                          <div className="w-2/3 p-1 uppercase font-bold flex items-center">{numberToWords(grandTotal)} RUPEES ONLY</div>
                        </div>
                        
                        <div className={`border-b-2 ${bColor} p-1 text-center font-bold`}>
                          Bank Details
                        </div>
                        <div className={`p-1.5 grid grid-cols-[100px_1fr] gap-1 border-b-2 ${bColor}`}>
                          <div>Name</div><div className="uppercase font-bold">{company?.bankName || 'INDIAN OVERSEAS BANK'}</div>
                          <div>Branch</div><div className="uppercase font-bold">{company?.branch || 'SOMANUR'}</div>
                          <div>Acc. Number</div><div className="uppercase font-bold">{company?.accountNumber || '271302000000205'}</div>
                          <div>IFSC</div><div className="uppercase font-bold">{company?.ifscCode || 'IOBA0002713'}</div>
                        </div>
                        <div className={`p-1 text-center font-bold border-b-2 ${bColor}`}>
                          Terms and Conditions
                        </div>
                        <div className="p-1.5 text-[9px] leading-tight flex-1">
                          <p>Subject to our home Jurisdiction.</p>
                          <p>Our Responsibility Ceases as soon as goods leaves our Premises.</p>
                          <p>Goods once sold will not taken back.</p>
                          <p>Delivery Ex-Premises.</p>
                        </div>
                      </div>
                      
                      <div className={`w-[40%] flex flex-col text-[11px]`}>
                        <div className={`flex border-b-2 ${bColor}`}>
                          <div className={`w-2/3 p-1 font-bold border-r-2 ${bColor}`}>Taxable Amount</div>
                          <div className="w-1/3 p-1 text-right font-bold">{totalTaxable.toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
                        </div>
                        <div className={`flex border-b-2 ${bColor}`}>
                          <div className={`w-2/3 p-1 font-bold border-r-2 ${bColor}`}>Add : CGST</div>
                          <div className="w-1/3 p-1 text-right font-bold">{totalCGST.toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
                        </div>
                        <div className={`flex border-b-2 ${bColor}`}>
                          <div className={`w-2/3 p-1 font-bold border-r-2 ${bColor}`}>Add : SGST</div>
                          <div className="w-1/3 p-1 text-right font-bold">{totalSGST.toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
                        </div>
                        <div className={`flex border-b-2 ${bColor}`}>
                          <div className={`w-2/3 p-1 font-bold border-r-2 ${bColor}`}>Total Tax</div>
                          <div className="w-1/3 p-1 text-right font-bold">{(totalCGST + totalSGST).toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
                        </div>
                        <div className={`flex border-b-2 ${bColor}`}>
                          <div className={`w-2/3 p-1 font-bold border-r-2 ${bColor}`}>Total Amount After Tax</div>
                          <div className="w-1/3 p-1 text-right font-bold text-sm">₹{grandTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
                        </div>
                        <div className={`p-0.5 pr-2 text-right font-bold text-[9px] border-b-2 ${bColor}`}>(E & O.E.)</div>
                        
                        <div className="p-2 text-center flex flex-col flex-1 relative">
                          <p className="text-[8px] font-bold">Certified that the particulars given above are true and correct.</p>
                          <p className="font-bold mt-1 text-[11px]">For {company?.company_name || 'SENTHIL FURNITURES'}</p>
                          
                          <div className="absolute bottom-0 left-0 right-0">
                            <div className={`border-t ${bColor} mx-8 mb-1 font-bold text-[9px] pt-0.5`}>
                              Authorised Signatory
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }
);
InvoicePrintout.displayName = "InvoicePrintout";
