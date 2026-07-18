import { z } from "zod";
import { renderInvoice } from '../../../templates/invoice.js';
import { renderLedger } from '../../../templates/ledger.js';
import { renderVoucher } from '../../../templates/voucher.js';
import { renderGSTR } from '../../../templates/gstr.js';
import puppeteerCore from 'puppeteer-core';

// Workaround for sparticuz/chromium missing type definitions in some environments
const getChromium = async () => {
  const chromium = (await import('@sparticuz/chromium')).default as any;
  return chromium;
};

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
      const chromium = await getChromium();
      const isVercel = !!process.env.VERCEL;
      
      console.log(`[PDF] Determining executable path (isVercel: ${isVercel})`);
      const executablePath = isVercel 
        ? await chromium.executablePath()
        : process.env.CHROME_EXECUTABLE_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

      console.log(`[PDF] Launching browser at: ${executablePath}`);
      browser = await puppeteerCore.launch({
        args: isVercel ? chromium.args : ['--no-sandbox', '--disable-setuid-sandbox'],
        executablePath,
        headless: true,
      });
      
      console.log(`[PDF] Opening new page`);
      const page = await browser.newPage();
      
      // Increase timeout to 60 seconds
      page.setDefaultNavigationTimeout(60000);
      page.setDefaultTimeout(60000);

      console.log(`[PDF] Loading HTML content into page`);
      await page.setContent(htmlContent, { waitUntil: 'networkidle0', timeout: 60000 });
      
      console.log(`[PDF] Waiting for fonts to be ready`);
      await page.evaluateHandle('document.fonts.ready');
      
      const isA5 = type === 'voucher';
      
      console.log(`[PDF] Creating PDF buffer (Format: ${isA5 ? 'A5' : 'A4'})`);
      const pdfBuffer = await page.pdf({
        format: isA5 ? 'A5' : 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
        displayHeaderFooter: false,
        timeout: 60000
      });
      
      console.log(`[PDF] Successfully created PDF buffer of size: ${pdfBuffer.length} bytes`);

      return new Response(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${type}_report.pdf"`
        }
      });
    }

  } catch (error: any) {
    console.error(`[PDF] ERROR:`, error);
    
    // Check if it's an executablePath error to provide helpful hints
    let errorMessage = error.message;
    if (errorMessage.includes('executablePath') || errorMessage.includes('browser is not installed')) {
      errorMessage = `${errorMessage}. If running locally, please set CHROME_EXECUTABLE_PATH to your local Google Chrome installation path.`;
    }

    return new Response(JSON.stringify({ 
      success: false,
      message: 'PDF generation failed',
      error: errorMessage,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }), {
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
