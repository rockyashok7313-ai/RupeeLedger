export interface PrintLayoutOptions {
  title: string;
  businessProfile: any;
  content: string;
  size?: 'A4' | 'A5';
  watermark?: string;
}

export function renderLayout({ title, businessProfile, content, size = 'A4', watermark }: PrintLayoutOptions): string {
  const pageSize = size === 'A5' ? 'A5' : 'A4';
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            sans: ['"Noto Sans"', 'sans-serif'],
          },
          colors: {
            bahi: {
              red: '#991b1b', // Traditional ledger red
              gold: '#d97706', // Traditional gold
            }
          }
        }
      }
    }
  </script>
  <style>
    /* Reset and Base */
    html, body {
      margin: 0;
      padding: 0;
      background: white;
      font-family: 'Noto Sans', sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    @page {
      size: ${pageSize};
      margin: 12mm;
    }

    /* Print specific resets */
    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }

    /* Table printing utilities */
    table {
      width: 100%;
      border-collapse: collapse;
    }
    thead {
      display: table-header-group; /* Repeats header on every page */
    }
    tfoot {
      display: table-row-group;
    }
    tr {
      page-break-inside: avoid; /* Prevents rows from splitting across pages */
    }

    /* Watermark */
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 8rem;
      font-weight: 800;
      color: rgba(200, 200, 200, 0.15);
      z-index: -1;
      pointer-events: none;
      white-space: nowrap;
    }
  </style>
</head>
<body class="text-slate-900 bg-white">
  ${watermark ? `<div class="watermark">${watermark}</div>` : ''}
  
  <div class="print-container w-full mx-auto text-[10px]">
    <!-- Standard Header Block -->
    <div class="header-block border-b-2 border-bahi-red pb-4 mb-6 flex justify-between items-start">
      <div>
        <h1 class="text-2xl font-bold text-bahi-red uppercase tracking-wide">
          ${businessProfile.companyName || "RupeeLedger Pro"}
        </h1>
        <div class="text-slate-600 mt-1 space-y-0.5">
          ${businessProfile.address ? `<p>${businessProfile.address}</p>` : ''}
          ${businessProfile.phone ? `<p>Phone: ${businessProfile.phone}</p>` : ''}
          ${businessProfile.email ? `<p>Email: ${businessProfile.email}</p>` : ''}
          ${businessProfile.gstin ? `<p class="font-semibold text-slate-800 mt-1">GSTIN: ${businessProfile.gstin}</p>` : ''}
        </div>
      </div>
      <div class="text-right">
        <h2 class="text-xl font-bold text-slate-800">${title}</h2>
      </div>
    </div>

    <!-- Main Content Injection -->
    <main>
      ${content}
    </main>
  </div>
</body>
</html>
  `;
}
