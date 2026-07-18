export function formatINR(amount: number): string {
  const isNegative = amount < 0;
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Math.abs(amount));
  return `${isNegative ? '-' : ''}₹${formatted}`;
}

export function numberToIndianWords(num: number): string {
  if (num === 0) return 'Zero Rupees';
  
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  function convert(n: number): string {
    if (n < 20) return a[n];
    const digit = n % 10;
    return b[Math.floor(n / 10)] + (digit ? '-' + a[digit] : ' ');
  }
  
  let str = '';
  const numStr = Math.floor(num).toString();
  
  if (numStr.length > 9) return 'Amount too large';
  
  // Pad string with zeros to make parsing easier (Crores, Lakhs, Thousands, Hundreds, Tens/Ones)
  const padded = ('000000000' + numStr).slice(-9);
  
  const crores = parseInt(padded.slice(0, 2), 10);
  const lakhs = parseInt(padded.slice(2, 4), 10);
  const thousands = parseInt(padded.slice(4, 6), 10);
  const hundreds = parseInt(padded.slice(6, 7), 10);
  const tensAndOnes = parseInt(padded.slice(7, 9), 10);
  
  if (crores) str += convert(crores) + 'Crore ';
  if (lakhs) str += convert(lakhs) + 'Lakh ';
  if (thousands) str += convert(thousands) + 'Thousand ';
  if (hundreds) str += convert(hundreds) + 'Hundred ';
  
  if (tensAndOnes) {
    if (str) str += 'and ';
    str += convert(tensAndOnes);
  }
  
  return str.trim() + ' Rupees Only';
}
