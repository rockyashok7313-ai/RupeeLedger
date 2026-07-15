const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Fix 1: res.status and res.json() on stubbed res
code = code.replace(
  /const res = \{ ok: true \};\s*if \(!res\.ok\) \{\s*throw new Error\(`Sync request failed with status \$\{res\.status\}`\);\s*\}\s*const data = await res\.json\(\);\s*return data;/g,
  `return { success: true };`
);

// Fix 2: firebaseUser mocked properties
code = code.replace(
  /photoURL: session\.user\.user_metadata\?\.avatar_url\s*\} : null;/g,
  `photoURL: session.user.user_metadata?.avatar_url,
        phoneNumber: session.user.phone,
        providerData: [{ providerId: session.user.app_metadata?.provider || 'email' }]
      } : null;`
);

// Fix 3: unsubscribe missing
// I replaced `return () => unsubscribe();` with `return () => authListener.unsubscribe();`
// But maybe there is `unsubscribe()` being called outside? Let's check `src/App.tsx(576,7)`.
// Actually, I can just define a dummy unsubscribe at the top of the useEffect if needed.
// Ah, `unsubscribe()` was the name of the return function from Firebase `onAuthStateChanged`.
// By replacing `const unsubscribe = onAuthStateChanged(...)` with `const { data: { subscription: authListener } } = ...`, `unsubscribe` is undefined.
code = code.replace(
  /unsubscribe\(\);/g,
  `authListener.unsubscribe();`
);

fs.writeFileSync('src/App.tsx', code);

// Fix 4: src/lib/supabaseSync.ts `any[] | null` mapDocs
let syncCode = fs.readFileSync('src/lib/supabaseSync.ts', 'utf8');
syncCode = syncCode.replace(
  /const mapDocs = \(docs: any\[\]\) => \(docs \|\| \[\]\)\.map\(d => \{/g,
  `const mapDocs = (docs: any[] | null) => (docs || []).map(d => {`
);
fs.writeFileSync('src/lib/supabaseSync.ts', syncCode);

console.log('TypeScript errors patched.');
