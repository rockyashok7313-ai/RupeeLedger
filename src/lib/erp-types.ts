// ERP System Types - Phase 1

export type DocumentStatus = 'Draft' | 'Issued' | 'Received' | 'Closed' | 'Cancelled';
export type PaymentStatus = 'Pending' | 'Partial' | 'Paid';

// 1. MASTER TABLES
export interface CompanyMaster {
  company_id: string;
  company_name: string;
  address: string;
  state: string;
  gst_number: string;
  pan_number: string;
  cin_number?: string;
  contact_email: string;
  contact_phone: string;
  bank_details?: string;
  created_date: number;
  updated_date: number;
}

export interface VendorMaster {
  vendor_id: string;
  vendor_name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gst_number: string;
  pan_number: string;
  contact_person: string;
  email: string;
  phone: string;
  bank_account: string;
  bank_ifsc: string;
  payment_terms: string;
  created_date: number;
  updated_date: number;
}

export interface CustomerMaster {
  customer_id: string;
  customer_name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gst_number: string;
  pan_number: string;
  contact_person: string;
  email: string;
  phone: string;
  credit_limit: number;
  payment_terms: string;
  created_date: number;
  updated_date: number;
}

export interface ProductMaster {
  product_id: string;
  product_name: string;
  hsn_code: string;
  sac_code?: string;
  description: string;
  unit_of_measure: string;
  hsn_gst_rate: number;
  purchase_price: number;
  selling_price: number;
  reorder_level: number;
  created_date: number;
  updated_date: number;
}

export interface WarehouseMaster {
  warehouse_id: string;
  warehouse_name: string;
  address: string;
  warehouse_type: 'main' | 'branch' | 'site';
  created_date: number;
  updated_date: number;
}

export interface BankMaster {
  bank_id: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  account_holder: string;
  account_type: 'Savings' | 'Current';
  opening_balance: number;
  created_date: number;
  updated_date: number;
}

// 2. TRANSACTION TABLES - PURCHASES
export interface PurchaseOrderLine {
  line_no: number;
  product_id: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_amount: number;
}

export interface PurchaseOrder {
  po_id: string;
  po_date: number;
  vendor_id: string;
  delivery_date: number;
  delivery_address: string;
  po_status: DocumentStatus;
  notes: string;
  lines: PurchaseOrderLine[];
  po_total_before_tax: number;
  po_cgst_total: number;
  po_sgst_total: number;
  po_igst_total: number;
  po_grand_total: number;
  created_date: number;
  created_by: string;
  updated_date: number;
}

export interface PurchaseInvoiceLine extends PurchaseOrderLine {
  discount_percent: number;
  discount_amount: number;
  hsn_code: string;
}

export interface PurchaseInvoice {
  purchase_inv_id: string;
  purchase_inv_date: number;
  vendor_id: string;
  po_id?: string;
  invoice_number: string;
  invoice_date: number;
  delivery_date: number;
  warehouse_id: string;
  payment_status: PaymentStatus;
  lines: PurchaseInvoiceLine[];
  gross_amount: number;
  discount_amount: number;
  cgst_total: number;
  sgst_total: number;
  igst_total: number;
  net_tax_amount: number;
  net_invoice_amount: number;
  received_quantity: number;
  rejected_quantity: number;
  pending_quantity: number;
  remarks: string;
  created_date: number;
  created_by: string;
}

// 3. INVENTORY & STOCK
export interface Stock {
  stock_id: string;
  product_id: string;
  warehouse_id: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_available: number;
  last_received_date: number;
  last_issued_date: number;
  reorder_point: number;
  reorder_quantity: number;
  updated_date: number;
}

export interface StockMovement {
  stock_movement_id: string;
  product_id: string;
  warehouse_id: string;
  movement_type: 'Purchase' | 'Sale' | 'Adjustment' | 'Maintenance' | 'Damage' | 'Returns';
  reference_id: string;
  quantity_in: number;
  quantity_out: number;
  balance_quantity: number;
  unit_cost: number;
  movement_date: number;
  created_by: string;
  notes: string;
}

// 4. TRANSACTION TABLES - SALES
export interface SalesOrderLine {
  line_no: number;
  product_id: string;
  quantity_ordered: number;
  quantity_shipped: number;
  quantity_pending: number;
  unit_price: number;
  discount_percent: number;
  tax_rate: number;
  total_amount: number;
}

export interface SalesOrder {
  so_id: string;
  so_date: number;
  customer_id: string;
  delivery_date: number;
  delivery_address: string;
  so_status: DocumentStatus;
  lines: SalesOrderLine[];
  so_total_before_tax: number;
  so_cgst_total: number;
  so_sgst_total: number;
  so_igst_total: number;
  so_grand_total: number;
  notes: string;
  created_date: number;
  created_by: string;
}

export interface SaleInvoiceLine extends SalesOrderLine {
  hsn_code: string;
  discount_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
}

export interface SaleInvoice {
  sale_inv_id: string;
  sale_inv_date: number;
  customer_id: string;
  so_id?: string;
  bill_number: string;
  delivery_date: number;
  payment_status: PaymentStatus;
  payment_terms: string;
  lines: SaleInvoiceLine[];
  gross_amount: number;
  discount_total: number;
  cgst_total: number;
  sgst_total: number;
  igst_total: number;
  net_tax_amount: number;
  net_invoice_amount: number;
  amount_paid: number;
  amount_due: number;
  notes: string;
  created_date: number;
  created_by: string;
}

// 5. ACCOUNTING ENTRIES
export interface BankEntry {
  bank_entry_id: string;
  bank_id: string;
  entry_date: number;
  entry_type: 'Deposit' | 'Withdrawal';
  amount: number;
  description: string;
  reference_id: string;
  balance_before: number;
  balance_after: number;
  created_date: number;
  created_by: string;
}

export interface PaymentEntry {
  payment_id: string;
  payment_date: number;
  payment_type: 'Cheque' | 'NEFT' | 'RTGS' | 'Cash' | 'Card';
  bank_id?: string;
  vendor_id: string;
  reference_no: string;
  amount: number;
  currency: string;
  payment_status: 'Draft' | 'Submitted' | 'Cleared';
  notes: string;
  created_date: number;
}

export interface ReceiptEntry {
  receipt_id: string;
  receipt_date: number;
  receipt_type: 'Cheque' | 'NEFT' | 'RTGS' | 'Cash' | 'Card';
  bank_id?: string;
  customer_id: string;
  reference_no: string;
  amount: number;
  currency: string;
  receipt_status: 'Draft' | 'Submitted' | 'Cleared';
  notes: string;
  created_date: number;
}
