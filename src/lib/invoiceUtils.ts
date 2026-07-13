export function generateInvoiceNumber(
  sequenceNumber: number,
  prefix: string = 'INV',
  financialYear: string = '',
  padding: number = 4
): string {
  const paddedNumber = String(sequenceNumber).padStart(padding, '0');
  
  const parts = [];
  if (prefix) parts.push(prefix);
  if (financialYear) parts.push(financialYear);
  parts.push(paddedNumber);
  
  return parts.join('-');
}

export function getCurrentFinancialYear(): string {
  const today = new Date();
  const month = today.getMonth(); // 0-indexed (0 = Jan, 3 = Apr)
  const year = today.getFullYear();
  
  // In India, financial year starts April 1st
  if (month >= 3) {
    return `${year}-${String(year + 1).slice(2)}`;
  } else {
    return `${year - 1}-${String(year).slice(2)}`;
  }
}

export const UQC_LIST = [
  'BGS-BAGS', 'BAL-BALE', 'BTL-BOTTLES', 'BOX-BOXES', 'BKL-BUCKLES', 
  'BUN-BUNCHES', 'BDL-BUNDLES', 'CAN-CANS', 'CBM-CUBIC METERS', 
  'CCM-CUBIC CENTIMETERS', 'CMS-CENTIMETERS', 'CTN-CARTONS', 'DOZ-DOZENS',
  'DRM-DRUMS', 'GGK-GREAT GROSS', 'GMS-GRAMS', 'GRS-GROSS', 'GYD-GROSS YARDS',
  'KGS-KILOGRAMS', 'KLR-KILOLITRE', 'KME-KILOMETRE', 'MLT-MILLILITRE',
  'MTR-METERS', 'NOS-NUMBERS', 'PAC-PACKS', 'PCS-PIECES', 'PRS-PAIRS',
  'QTL-QUINTAL', 'ROL-ROLLS', 'SET-SETS', 'SQF-SQUARE FEET', 
  'SQM-SQUARE METERS', 'SQY-SQUARE YARDS', 'TBS-TABLETS', 'TGM-TEN GROSS',
  'THD-THOUSANDS', 'TON-TONNES', 'TUB-TUBES', 'UGS-US GALLONS', 
  'YDS-YARDS', 'OTH-OTHERS'
];
