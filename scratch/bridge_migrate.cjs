const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Normalize line endings
code = code.replace(/\r\n/g, '\n');

const pullRegex = /const syncRes = await fetch\('\/api\/ledger\/sync', \{\s*method: 'POST',\s*headers: \{\s*'Content-Type': 'application\/json'\s*\}\,\s*body: JSON\.stringify\(\{\s*userId:\s*([a-zA-Z0-9_]+),\s*action:\s*'pull'\s*\}\)\s*\}\);\s*let shouldLock = false;\s*let fetchedAccounts:\s*Account\[\] = \[\];\s*let fetchedTxs:\s*Transaction\[\] = \[\];\s*if \(syncRes\.ok\) \{\s*const syncData = await syncRes\.json\(\);/g;

code = code.replace(pullRegex, `let shouldLock = false;
        let fetchedAccounts: Account[] = [];
        let fetchedTxs: Transaction[] = [];
        let syncData: any = null;
        let fromMongo = false;
        
        try {
            const supabaseData = await pullSyncFromSupabase($1);
            if (supabaseData && supabaseData.exists) {
                syncData = supabaseData;
                syncData.isOfflineFallback = false;
            }
        } catch (e) {
            console.log("Supabase pull failed, falling back to MongoDB");
        }

        if (!syncData) {
            const syncRes = await fetch('/api/ledger/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: $1, action: 'pull' })
            });
            if (syncRes.ok) {
              syncData = await syncRes.json();
              fromMongo = true;
            }
        }
        
        if (syncData) {
            if (fromMongo && syncData.exists) {
               try {
                   await pushSyncToSupabase(
                     $1, syncData.accounts || [], syncData.transactions || [], syncData.businessProfile,
                     syncData.subscription, syncData.securitySettings, syncData.clients, syncData.inventory,
                     syncData.invoices, syncData.expenses, syncData.recurringTemplates, syncData.receipts
                   );
               } catch (e) {
                   console.log("Failed to auto-migrate to Supabase", e);
               }
            }
`);

fs.writeFileSync('src/App.tsx', code);
console.log('Bridge patch applied');
