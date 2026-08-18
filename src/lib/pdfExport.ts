export async function fetchReportHTML(type: 'invoice' | 'ledger' | 'voucher' | 'gstr', data: any): Promise<string> {
  const response = await fetch('/api/reports/render', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, format: 'html', data }),
  });
  if (!response.ok) {
    throw new Error(await describeFailure(response, 'report'));
  }
  return await response.text();
}

/**
 * Turn a failed response into something the user can act on. The previous code
 * assumed a JSON body, so a 413 -- which Express answers with an HTML error
 * page -- collapsed into a bare "Failed to fetch report HTML" and hid the cause.
 */
async function describeFailure(response: Response, what: string): Promise<string> {
  const body = await response.text().catch(() => '');
  let detail = '';
  try {
    detail = JSON.parse(body)?.error || '';
  } catch {
    // Not JSON: an HTML error page or a proxy message.
  }

  if (response.status === 413) {
    return 'This account has too many entries to render in one report. Filter by a date range and try again.';
  }
  if (response.status === 401 || response.status === 403) {
    return 'Your session has expired. Sign in again to generate this report.';
  }
  if (detail) return detail;
  return `Could not generate the ${what} (HTTP ${response.status}).`;
}

export async function downloadReportPDF(type: 'invoice' | 'ledger' | 'voucher' | 'gstr', data: any, filename: string) {
  try {
    const response = await fetch('/api/reports/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, format: 'pdf', data }),
    });
    
    if (!response.ok) {
      throw new Error(await describeFailure(response, 'PDF'));
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error: any) {
    console.error('Error downloading PDF:', error);
    alert(`Failed to generate PDF: ${error.message}`);
  }
}
