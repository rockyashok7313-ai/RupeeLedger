const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const pullRegex = /const syncRes = await fetch\('\/api\/ledger\/sync', \{\s*method: 'POST',\s*headers: \{\s*'Content-Type': 'application\/json'\s*\}\,\s*body: JSON\.stringify\(\{\s*userId:\s*([a-zA-Z0-9_]+),\s*action:\s*'pull'\s*\}\)\s*\}\);\s*let shouldLock = false;\s*let fetchedAccounts: Account\[\] = \[\];\s*let fetchedTxs: Transaction\[\] = \[\];\s*if \(syncRes\.ok\) \{\s*const syncData = await syncRes\.json\(\);/g;

code = code.replace(pullRegex, `let shouldLock = false;
        let fetchedAccounts: Account[] = [];
        let fetchedTxs: Transaction[] = [];
        const syncData = await pullSyncFromSupabase($1);
        if (syncData) {`);

fs.writeFileSync('src/App.tsx', code);
console.log('Regex replacements done');
