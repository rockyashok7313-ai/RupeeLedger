import { useEffect, useState } from "react";
import { CloudOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { MasterDataModule, type MasterField } from "./MasterDataModule";
import { TransactionModule } from "./TransactionModule";
import { StockJournal } from "./StockJournal";
import { GSTRReports } from "./GSTRReports";
import { ERP_GROUPS, ERP_SECTION_LABELS, type ErpSection } from "./erp-sections";

const STATE_FIELD: MasterField = { key: "state", label: "State", type: "text" };

const MASTER_CONFIG: Record<
  "products" | "warehouses" | "customers" | "vendors",
  { title: string; idField: string; fields: MasterField[] }
> = {
  products: {
    title: "Products",
    idField: "product_id",
    fields: [
      { key: "product_name", label: "Product name", type: "text", required: true },
      { key: "hsn_code", label: "HSN code", type: "text" },
      { key: "selling_price", label: "Selling price (₹)", type: "number" },
      { key: "hsn_gst_rate", label: "GST rate (%)", type: "number" },
      { key: "purchase_price", label: "Purchase price (₹)", type: "number" },
      {
        key: "unit_of_measure",
        label: "Unit",
        type: "select",
        options: ["NOS", "MTR", "KGS", "PCS", "BOX", "ROL", "SET"].map((u) => ({ label: u, value: u })),
      },
      { key: "reorder_level", label: "Reorder level", type: "number" },
      { key: "description", label: "Description", type: "text" },
    ],
  },
  warehouses: {
    title: "Godowns",
    idField: "warehouse_id",
    fields: [
      { key: "warehouse_name", label: "Godown name", type: "text", required: true },
      { key: "address", label: "Address", type: "text" },
      {
        key: "warehouse_type",
        label: "Type",
        type: "select",
        options: ["Main", "Branch", "Job work", "Transit"].map((t) => ({ label: t, value: t })),
      },
    ],
  },
  customers: {
    title: "Customers",
    idField: "customer_id",
    fields: [
      { key: "customer_name", label: "Customer name", type: "text", required: true },
      { key: "gst_number", label: "GSTIN", type: "text" },
      { key: "phone", label: "Phone", type: "text" },
      { key: "city", label: "City", type: "text" },
      STATE_FIELD,
      { key: "address", label: "Address", type: "text" },
      { key: "pincode", label: "Pincode", type: "text" },
      { key: "contact_person", label: "Contact person", type: "text" },
      { key: "email", label: "Email", type: "email" },
      { key: "credit_limit", label: "Credit limit (₹)", type: "number" },
      { key: "payment_terms", label: "Payment terms", type: "text" },
    ],
  },
  vendors: {
    title: "Suppliers",
    idField: "vendor_id",
    fields: [
      { key: "vendor_name", label: "Supplier name", type: "text", required: true },
      { key: "gst_number", label: "GSTIN", type: "text" },
      { key: "phone", label: "Phone", type: "text" },
      { key: "city", label: "City", type: "text" },
      STATE_FIELD,
      { key: "address", label: "Address", type: "text" },
      { key: "pincode", label: "Pincode", type: "text" },
      { key: "contact_person", label: "Contact person", type: "text" },
      { key: "email", label: "Email", type: "email" },
      { key: "bank_account", label: "Bank account", type: "text" },
      { key: "bank_ifsc", label: "IFSC", type: "text" },
      { key: "payment_terms", label: "Payment terms", type: "text" },
    ],
  },
};

interface ErpHubProps {
  getToken: () => Promise<string | null>;
  section: ErpSection;
  onSectionChange: (s: ErpSection) => void;
}

/**
 * Stock, sales and purchase in one place. These modules were already built
 * against /api/erp/* but nothing in the app linked to them.
 */
export function ErpHub({ getToken, section, onSectionChange }: ErpHubProps) {
  const [token, setToken] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    getToken().then((t) => alive && setToken(t));
    return () => {
      alive = false;
    };
  }, [getToken]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-headline font-semibold text-foreground">Stock &amp; orders</h2>
        <p className="text-muted-foreground mt-1">
          Products, godowns, customers and suppliers, with the orders and bills that move stock.
        </p>
      </div>

      <nav aria-label="Stock and orders sections" className="flex flex-wrap gap-x-6 gap-y-3">
        {ERP_GROUPS.map((group) => (
          <div key={group.label} className="shrink-0">
            <p className="text-xs font-medium text-muted-foreground mb-1.5 px-1">{group.label}</p>
            <div className="flex flex-wrap gap-1 rounded-xl bg-surface-2 p-1">
              {group.sections.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onSectionChange(s)}
                  aria-current={section === s ? "page" : undefined}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm whitespace-nowrap transition-colors duration-fast",
                    section === s
                      ? "bg-card text-foreground font-semibold elev-2"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {ERP_SECTION_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {token === undefined ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground gap-3" role="status">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Checking your session…</span>
        </div>
      ) : token === null ? (
        <div className="rounded-2xl border border-dashed p-10 text-center max-w-lg mx-auto">
          <CloudOff className="h-8 w-8 mx-auto text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">Stock and orders need a cloud account</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            These records are stored on the server so every branch sees the same stock. Sign out and sign in with
            phone, WhatsApp or email to use them. Your ledger keeps working offline either way.
          </p>
        </div>
      ) : (
        <SectionBody section={section} token={token} />
      )}
    </div>
  );
}

function SectionBody({ section, token }: { section: ErpSection; token: string }) {
  switch (section) {
    case "products":
    case "warehouses":
    case "customers":
    case "vendors": {
      const cfg = MASTER_CONFIG[section];
      return <MasterDataModule key={section} type={section} token={token} {...cfg} />;
    }
    case "stock":
      return <StockJournal token={token} />;
    case "gstr":
      return <GSTRReports token={token} />;
    case "sales_orders":
    case "sale_invoices":
    case "purchase_orders":
    case "purchase_invoices":
      return <TransactionModule key={section} type={section} title={ERP_SECTION_LABELS[section]} token={token} />;
  }
}
