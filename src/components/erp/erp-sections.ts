export const ERP_SECTIONS = [
  "products",
  "stock",
  "warehouses",
  "customers",
  "sales_orders",
  "sale_invoices",
  "vendors",
  "purchase_orders",
  "purchase_invoices",
  "gstr",
  "accounting",
] as const;

export type ErpSection = (typeof ERP_SECTIONS)[number];

export const ERP_SECTION_LABELS: Record<ErpSection, string> = {
  products: "Products",
  stock: "Stock journal",
  warehouses: "Godowns",
  customers: "Customers",
  sales_orders: "Sales orders",
  sale_invoices: "Sale invoices",
  vendors: "Suppliers",
  purchase_orders: "Purchase orders",
  purchase_invoices: "Purchase bills",
  gstr: "GSTR summary",
  accounting: "Cash book & trial balance",
};

export const ERP_GROUPS: { label: string; sections: ErpSection[] }[] = [
  { label: "Stock", sections: ["products", "stock", "warehouses"] },
  { label: "Sales", sections: ["customers", "sales_orders", "sale_invoices"] },
  { label: "Purchase", sections: ["vendors", "purchase_orders", "purchase_invoices"] },
  { label: "Returns", sections: ["gstr"] },
  // Reads the local ledger rather than the ERP tables, so it works without a
  // cloud account -- see the token gate in ErpHub.
  { label: "Accounts", sections: ["accounting"] },
];
