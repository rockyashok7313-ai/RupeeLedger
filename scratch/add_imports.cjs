const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes('import { pushSyncToSupabase')) {
  code = code.replace(
    /import \{ auth \} from "@\/lib\/firebase";/,
    `import { auth } from "@/lib/firebase";\nimport { pushSyncToSupabase, pullSyncFromSupabase } from "@/lib/supabaseSync";`
  );
  fs.writeFileSync('src/App.tsx', code);
  console.log('Added imports');
} else {
  console.log('Imports already exist');
}
