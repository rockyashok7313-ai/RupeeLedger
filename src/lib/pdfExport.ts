export async function fetchReportHTML(type: 'invoice' | 'ledger' | 'voucher' | 'gstr', data: any): Promise<string> {
  const response = await fetch('/api/reports/render', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, format: 'html', data }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch report HTML');
  }
  return await response.text();
}

export async function downloadReportPDF(type: 'invoice' | 'ledger' | 'voucher' | 'gstr', data: any, filename: string) {
  try {
    const response = await fetch('/api/reports/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, format: 'pdf', data }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate PDF');
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
  } catch (error) {
    console.error('Error downloading PDF:', error);
    alert('Failed to generate PDF. Please check server logs.');
  }
}
