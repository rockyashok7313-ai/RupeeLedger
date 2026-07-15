const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add the useEffect for auto backup
const autoBackupEffect = `
  // Daily Auto-Backup to LocalStorage
  useEffect(() => {
    if (!isLoaded || accounts.length === 0) return;
    
    const lastBackup = localStorage.getItem("rupee_ledger_last_auto_backup_date");
    const today = new Date().toDateString();
    
    if (lastBackup !== today) {
      try {
        const backupData = {
          accounts,
          transactions,
          clients,
          inventory,
          invoices,
          expenses,
          recurringTemplates,
          receipts
        };
        localStorage.setItem("rupee_ledger_auto_backup_data", JSON.stringify(backupData));
        localStorage.setItem("rupee_ledger_last_auto_backup_date", today);
        console.log("Daily auto-backup saved to local storage.");
      } catch (e) {
        console.error("Failed to save auto-backup", e);
      }
    }
  }, [accounts, transactions, clients, inventory, invoices, expenses, recurringTemplates, receipts, isLoaded]);
`;

// Insert the useEffect before the Auth Observer useEffect
code = code.replace(
  /  useEffect\(\(\) => \{\n    \/\/ 1\. Setup Auth Observer/,
  autoBackupEffect + "\n  useEffect(() => {\n    // 1. Setup Auth Observer"
);

// 2. Add the Restore function
const restoreFunction = `
  const handleRestoreAutoBackup = () => {
    const backupDataString = localStorage.getItem("rupee_ledger_auto_backup_data");
    if (!backupDataString) {
      toast({ title: "No Auto-Backup Found", description: "There is no recent auto-backup available on this device.", variant: "destructive" });
      return;
    }
    
    try {
      const parsed = JSON.parse(backupDataString);
      if (parsed && Array.isArray(parsed.accounts)) {
        setAccounts(parsed.accounts || []);
        setTransactions(parsed.transactions || []);
        setClients(parsed.clients || []);
        setInventory(parsed.inventory || []);
        setInvoices(parsed.invoices || []);
        setExpenses(parsed.expenses || []);
        setRecurringTemplates(parsed.recurringTemplates || []);
        setReceipts(parsed.receipts || []);
        
        toast({ 
          title: "Auto-Backup Restored", 
          description: \`Successfully restored \${parsed.accounts.length} accounts.\`
        });
        
        // Push the restored data to the cloud
        if (user && user.authMethod !== 'guest') {
           pushSyncToSupabase(
              user.id, parsed.accounts || [], parsed.transactions || [], businessProfile,
              subscription, securitySettings, parsed.clients || [], parsed.inventory || [],
              parsed.invoices || [], parsed.expenses || [], parsed.recurringTemplates || [], parsed.receipts || []
           ).catch(console.error);
        }
      }
    } catch (e) {
      toast({ title: "Restore Failed", description: "The auto-backup data is corrupted.", variant: "destructive" });
    }
  };
`;

// Insert after handleImportData
code = code.replace(
  /    const handleImportData = \(e: React\.ChangeEvent<HTMLInputElement>\) => \{[\s\S]*?    \};\n/,
  match => match + restoreFunction
);

// 3. Add the UI button in Settings
const settingsUI = `                        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-muted/30 rounded-lg border gap-4">
                          <div>
                            <p className="font-semibold text-sm">Daily Auto-Backup</p>
                            <p className="text-xs text-muted-foreground">Restore your data from the most recent automatic daily snapshot.</p>
                          </div>
                          <Button onClick={handleRestoreAutoBackup} size="sm" variant="outline" className="shrink-0 text-amber-600 border-amber-200 hover:bg-amber-50">
                            Restore Auto-Backup
                          </Button>
                        </div>\n\n`;

code = code.replace(
  /                        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-muted\/30 \nrounded-lg border gap-4">\n                          <div>\n                            <p className="font-semibold text-sm">Local Backup<\/p>/,
  settingsUI + `                        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-muted/30 
rounded-lg border gap-4">
                          <div>
                            <p className="font-semibold text-sm">Local Backup</p>`
);

fs.writeFileSync('src/App.tsx', code);
console.log('Auto backup added');
