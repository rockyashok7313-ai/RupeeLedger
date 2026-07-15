const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

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

if (!code.includes('const handleRestoreAutoBackup')) {
  code = code.replace(
    /  const handleImportData = \(e: React\.ChangeEvent<HTMLInputElement>\) => \{/,
    match => restoreFunction + match
  );
}

const settingsUI = `                        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-muted/30 rounded-lg border gap-4">
                          <div>
                            <p className="font-semibold text-sm">Daily Auto-Backup</p>
                            <p className="text-xs text-muted-foreground">Restore your data from the most recent automatic daily snapshot.</p>
                          </div>
                          <Button onClick={handleRestoreAutoBackup} size="sm" variant="outline" className="shrink-0 text-amber-600 border-amber-200 hover:bg-amber-50">
                            Restore Auto-Backup
                          </Button>
                        </div>\n\n`;

if (!code.includes('Restore Auto-Backup')) {
  code = code.replace(
    /<p className="font-semibold text-sm">Local Backup<\/p>/,
    match => settingsUI.trim() + '\n                          <div>\n                            <p className="font-semibold text-sm">Local Backup</p>'
  );
}

fs.writeFileSync('src/App.tsx', code);
console.log('Rest of auto backup added');
