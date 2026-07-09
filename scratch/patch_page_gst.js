const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/page.tsx');
let code = fs.readFileSync(filePath, 'utf-8');

// 1. Update imports
code = code.replace(
  'import { Account, Transaction, AccountType, TransactionType, BusinessProfile, Subscription, SecuritySettings, UserProfile } from "@/lib/types";',
  'import { Account, Transaction, AccountType, TransactionType, BusinessProfile, Subscription, SecuritySettings, UserProfile, Client, InventoryItem, Invoice, Expense, RecurringTemplate, Receipt } from "@/lib/types";'
);

// 2. Update pushSyncToMongoDB signature
code = code.replace(
  '  transactionsList: Transaction[],',
  '  transactionsList: Transaction[],\n  clientsList: Client[],\n  inventoryList: InventoryItem[],\n  invoicesList: Invoice[],\n  expensesList: Expense[],\n  recurringList: RecurringTemplate[],\n  receiptsList: Receipt[],'
);

// 3. Update pushSyncToMongoDB body
code = code.replace(
  '        transactions: transactionsList,',
  '        transactions: transactionsList,\n        clients: clientsList,\n        inventory: inventoryList,\n        invoices: invoicesList,\n        expenses: expensesList,\n        recurringTemplates: recurringList,\n        receipts: receiptsList,'
);

// 4. Add state variables
const stateVarsStr = `
  const [clients, setClients] = useState<Client[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [recurringTemplates, setRecurringTemplates] = useState<RecurringTemplate[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
`;
code = code.replace('  const [transactions, setTransactions] = useState<Transaction[]>([]);', '  const [transactions, setTransactions] = useState<Transaction[]>([]);' + stateVarsStr);

// 5. Update loadLocalStorageData
const localLoadStr = `
      setTransactions(localTx ? JSON.parse(localTx) : []);
      
      const localClients = localStorage.getItem("rupee_ledger_clients");
      setClients(localClients ? JSON.parse(localClients) : []);

      const localInventory = localStorage.getItem("rupee_ledger_inventory");
      setInventory(localInventory ? JSON.parse(localInventory) : []);

      const localInvoices = localStorage.getItem("rupee_ledger_invoices");
      setInvoices(localInvoices ? JSON.parse(localInvoices) : []);

      const localExpenses = localStorage.getItem("rupee_ledger_expenses");
      setExpenses(localExpenses ? JSON.parse(localExpenses) : []);

      const localRecurring = localStorage.getItem("rupee_ledger_recurring");
      setRecurringTemplates(localRecurring ? JSON.parse(localRecurring) : []);

      const localReceipts = localStorage.getItem("rupee_ledger_receipts");
      setReceipts(localReceipts ? JSON.parse(localReceipts) : []);
`;
code = code.replace('      setTransactions(localTx ? JSON.parse(localTx) : []);', localLoadStr.trim());

// 6. Update online fetch in syncData
const onlineFetchStr = `
            setTransactions(data.transactions || []);
            setClients(data.clients || []);
            setInventory(data.inventory || []);
            setInvoices(data.invoices || []);
            setExpenses(data.expenses || []);
            setRecurringTemplates(data.recurringTemplates || []);
            setReceipts(data.receipts || []);
            localStorage.setItem("rupee_ledger_clients", JSON.stringify(data.clients || []));
            localStorage.setItem("rupee_ledger_inventory", JSON.stringify(data.inventory || []));
            localStorage.setItem("rupee_ledger_invoices", JSON.stringify(data.invoices || []));
            localStorage.setItem("rupee_ledger_expenses", JSON.stringify(data.expenses || []));
            localStorage.setItem("rupee_ledger_recurring", JSON.stringify(data.recurringTemplates || []));
            localStorage.setItem("rupee_ledger_receipts", JSON.stringify(data.receipts || []));
`;
code = code.replace('            setTransactions(data.transactions || []);', onlineFetchStr.trim());

// 7. Update push call in syncData
code = code.replace(
  '          await pushSyncToMongoDB(user.uid, localAcc ? JSON.parse(localAcc) : [], localTx ? JSON.parse(localTx) : [], businessProfile, subscription, securitySettings);',
  '          await pushSyncToMongoDB(user.uid, localAcc ? JSON.parse(localAcc) : [], localTx ? JSON.parse(localTx) : [], clients, inventory, invoices, expenses, recurringTemplates, receipts, businessProfile, subscription, securitySettings);'
);

// 8. Update auto-sync effect
const depArrayStr = '[accounts, transactions, clients, inventory, invoices, expenses, recurringTemplates, receipts, businessProfile, subscription, securitySettings, isLoaded, user]';
code = code.replace(
  '  useEffect(() => {\n    if (isLoaded && user && user.authMethod !== \'guest\') {',
  `  useEffect(() => {
    // Save to local storage whenever they change
    localStorage.setItem("rupee_ledger_clients", JSON.stringify(clients));
    localStorage.setItem("rupee_ledger_inventory", JSON.stringify(inventory));
    localStorage.setItem("rupee_ledger_invoices", JSON.stringify(invoices));
    localStorage.setItem("rupee_ledger_expenses", JSON.stringify(expenses));
    localStorage.setItem("rupee_ledger_recurring", JSON.stringify(recurringTemplates));
    localStorage.setItem("rupee_ledger_receipts", JSON.stringify(receipts));

    if (isLoaded && user && user.authMethod !== 'guest') {`
);
code = code.replace(
  '      pushSyncToMongoDB(user.uid, accounts, transactions, businessProfile, subscription, securitySettings).catch(console.error);',
  '      pushSyncToMongoDB(user.uid, accounts, transactions, clients, inventory, invoices, expenses, recurringTemplates, receipts, businessProfile, subscription, securitySettings).catch(console.error);'
);
code = code.replace(
  '  }, [accounts, transactions, businessProfile, subscription, securitySettings, isLoaded, user]);',
  `  }, ${depArrayStr});`
);

// 9. Update drive backup
code = code.replace(
  '        transactions,\n        businessProfile,',
  '        transactions,\n        clients,\n        inventory,\n        invoices,\n        expenses,\n        recurringTemplates,\n        receipts,\n        businessProfile,'
);

// 10. Pass props to GSTModule
code = code.replace(
  '<GSTModule businessProfile={businessProfile} />',
  `<GSTModule 
                  businessProfile={businessProfile} 
                  clients={clients} setClients={setClients}
                  inventory={inventory} setInventory={setInventory}
                  invoices={invoices} setInvoices={setInvoices}
                  expenses={expenses} setExpenses={setExpenses}
                  recurringTemplates={recurringTemplates} setRecurringTemplates={setRecurringTemplates}
                  receipts={receipts} setReceipts={setReceipts}
                />`
);

fs.writeFileSync(filePath, code);
console.log('page.tsx patched successfully.');
