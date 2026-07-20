import { z } from "zod";
import { renderInvoice } from '../../../templates/invoice.js';
import { renderLedger } from '../../../templates/ledger.js';
import { renderVoucher } from '../../../templates/voucher.js';
import { renderGSTR } from '../../../templates/gstr.js';


const RenderRequestSchema = z.object({
  type: z.enum(['invoice', 'ledger', 'voucher', 'gstr']),
  format: z.enum(['html', 'pdf']).default('html'),
  data: z.any()
});

export async function POST(req: Request) {
  let browser: any = null;

  try {
    const body = await req.json();
    const result = RenderRequestSchema.safeParse(body);
    
    if (!result.success) {
      return new Response(JSON.stringify({ error: 'Invalid request', details: result.error.errors }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { type, format, data } = result.data;
    let htmlContent = '';

    console.log(`[PDF] Generating HTML for type: ${type}`);
    switch (type) {
      case 'invoice':
        htmlContent = renderInvoice(data);
        break;
      case 'ledger':
        htmlContent = renderLedger(data);
        break;
      case 'voucher':
        htmlContent = renderVoucher(data);
        break;
      case 'gstr':
        htmlContent = renderGSTR(data);
        break;
    }

    if (format === 'html') {
      return new Response(htmlContent, {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    if (format === 'pdf') {
      return new Response(JSON.stringify({ error: 'Server-side PDF generation is disabled. Please use native print functionality.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error: any) {
    console.error(`[PDF] ERROR:`, error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  } finally {
    if (browser) {
      console.log(`[PDF] Closing browser`);
      try {
        await browser.close();
        console.log(`[PDF] Browser closed successfully`);
      } catch (closeError) {
        console.error(`[PDF] Error closing browser:`, closeError);
      }
    }
  }
}
