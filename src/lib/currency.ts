export const currencies = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
];

function numberToWordsIndian(num: number): string {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (num === 0) return 'Zero';

  const format = (n: number): string => {
    let str = '';
    if (n > 9999999) {
      str += format(Math.floor(n / 10000000)) + ' Crore ';
      n %= 10000000;
    }
    if (n > 99999) {
      str += format(Math.floor(n / 100000)) + ' Lakh ';
      n %= 100000;
    }
    if (n > 999) {
      str += format(Math.floor(n / 1000)) + ' Thousand ';
      n %= 1000;
    }
    if (n > 99) {
      str += format(Math.floor(n / 100)) + ' Hundred ';
      n %= 100;
    }
    if (n > 0) {
      if (str !== '') str += 'and ';
      if (n < 20) str += a[n];
      else {
        str += b[Math.floor(n / 10)] + ' ';
        if (n % 10 > 0) str += a[n % 10];
      }
    }
    return str.trim();
  };

  return format(Math.floor(num));
}

function numberToWordsInternational(num: number): string {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (num === 0) return 'Zero';

  const format = (n: number): string => {
    let str = '';
    if (n > 999999999) {
      str += format(Math.floor(n / 1000000000)) + ' Billion ';
      n %= 1000000000;
    }
    if (n > 999999) {
      str += format(Math.floor(n / 1000000)) + ' Million ';
      n %= 1000000;
    }
    if (n > 999) {
      str += format(Math.floor(n / 1000)) + ' Thousand ';
      n %= 1000;
    }
    if (n > 99) {
      str += format(Math.floor(n / 100)) + ' Hundred ';
      n %= 100;
    }
    if (n > 0) {
      if (str !== '') str += 'and ';
      if (n < 20) str += a[n];
      else {
        str += b[Math.floor(n / 10)] + ' ';
        if (n % 10 > 0) str += a[n % 10];
      }
    }
    return str.trim();
  };

  return format(Math.floor(num));
}

export function formatAmountInWords(amount: number, currency: string = 'INR'): string {
  const wholePart = Math.floor(amount);
  const fractionPart = Math.round((amount - wholePart) * 100);
  
  const isIndian = currency === 'INR';
  const convert = isIndian ? numberToWordsIndian : numberToWordsInternational;
  
  let result = convert(wholePart);
  let mainCurrencyName = 'Rupees';
  let fractionCurrencyName = 'Paise';
  
  if (currency === 'USD') { mainCurrencyName = 'Dollars'; fractionCurrencyName = 'Cents'; }
  else if (currency === 'EUR') { mainCurrencyName = 'Euros'; fractionCurrencyName = 'Cents'; }
  else if (currency === 'GBP') { mainCurrencyName = 'Pounds'; fractionCurrencyName = 'Pence'; }
  else if (currency !== 'INR') { mainCurrencyName = currency; fractionCurrencyName = 'Cents'; }

  result += ` ${mainCurrencyName}`;
  
  if (fractionPart > 0) {
    result += ` and ${convert(fractionPart)} ${fractionCurrencyName}`;
  }
  
  return result + ' Only';
}

export function formatCurrency(amount: number, currencyCode: string = 'INR'): string {
  return new Intl.NumberFormat(currencyCode === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency: currencyCode,
  }).format(amount);
}
