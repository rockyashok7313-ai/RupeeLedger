import { z } from "zod";
import puppeteer from 'puppeteer';
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
      // Launch Puppeteer
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });
      
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'load' }); // Wait for fonts to load
      await page.evaluateHandle('document.fonts.ready');
      
      const isA5 = type === 'voucher';
      
      const pdfBuffer = await page.pdf({
        format: isA5 ? 'A5' : 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
        displayHeaderFooter: false // Relying on our internal template layout instead of Puppeteer's native header/footer
      });
      
      await browser.close();

      return new Response(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${type}_report.pdf"`
        }
      });
    }

  } catch (error: any) {
    console.error('PDF Render Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
