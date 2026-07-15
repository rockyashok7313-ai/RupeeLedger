const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `const token = await firebaseUser.getIdToken();
          const syncRes = await fetch('/api/ledger/sync', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': \`Bearer \${token}\`
            },
            body: JSON.stringify({ userId: firebaseUser.uid, action: 'pull' })
          });

          let shouldLock = false;
          let fetchedAccounts: Account[] = [];
          let fetchedTxs: Transaction[] = [];

          if (syncRes.ok) {
            const syncData = await syncRes.json();`;

const replacement = `let shouldLock = false;
          let fetchedAccounts: Account[] = [];
          let fetchedTxs: Transaction[] = [];
          let syncData: any = null;
          let fromMongo = false;
          
          try {
              const supabaseData = await pullSyncFromSupabase(firebaseUser.uid);
              if (supabaseData && supabaseData.exists) {
                  syncData = supabaseData;
                  syncData.isOfflineFallback = false;
              }
          } catch (e) {
              console.log("Supabase pull failed, falling back to MongoDB");
          }

          if (!syncData) {
              const token = await firebaseUser.getIdToken();
              const syncRes = await fetch('/api/ledger/sync', {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': \`Bearer \${token}\`
                },
                body: JSON.stringify({ userId: firebaseUser.uid, action: 'pull' })
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
                     firebaseUser.uid, syncData.accounts || [], syncData.transactions || [], syncData.businessProfile,
                     syncData.subscription, syncData.securitySettings, syncData.clients, syncData.inventory,
                     syncData.invoices, syncData.expenses, syncData.recurringTemplates, syncData.receipts
                   );
               } catch (e) {
                   console.log("Failed to auto-migrate to Supabase", e);
               }
            }
`;

code = code.replace(target, replacement);
fs.writeFileSync('src/App.tsx', code);
console.log('Main firebaseUser block patched');
