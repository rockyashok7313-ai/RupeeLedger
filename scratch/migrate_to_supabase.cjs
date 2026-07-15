const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Replace imports
code = code.replace(
  /import\s+\{\s+auth\s+\}\s+from\s+["']@\/lib\/firebase["'];/,
  `import { supabase } from "@/lib/supabase";\nimport { pushSyncToSupabase, pullSyncFromSupabase } from "@/lib/supabaseSync";`
);

code = code.replace(
  /import\s+\{([^}]+)\}\s+from\s+["']firebase\/auth["'];/,
  `// Migrated to Supabase Auth`
);

// 2. Replace auth state listener
// Old: const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
// New: const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange(async (event, session) => { const firebaseUser = session?.user; 
code = code.replace(
  /const unsubscribe = onAuthStateChanged\(auth, async \(([^)]+)\) => \{/g,
  `const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const $1 = session?.user ? { 
        uid: session.user.id, 
        email: session.user.email, 
        displayName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
        photoURL: session.user.user_metadata?.avatar_url
      } : null;`
);

// We need to find `return () => unsubscribe();` and replace it
code = code.replace(
  /return \(\) => unsubscribe\(\);/g,
  `return () => authListener.unsubscribe();`
);

// 3. Replace Google Login
// Old: const provider = new GoogleAuthProvider(); await signInWithPopup(auth, provider);
code = code.replace(
  /const provider = new GoogleAuthProvider\(\);\s+await signInWithPopup\(auth, provider\);/g,
  `const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' }); if (error) throw error;`
);

// 4. Replace Email Login
code = code.replace(
  /await signInWithEmailAndPassword\(auth, emailInput, passwordInput\);/g,
  `const { error } = await supabase.auth.signInWithPassword({ email: emailInput, password: passwordInput }); if (error) throw error;`
);

// 5. Replace Email Signup
code = code.replace(
  /await createUserWithEmailAndPassword\(auth, emailInput, passwordInput\);/g,
  `const { error } = await supabase.auth.signUp({ email: emailInput, password: passwordInput }); if (error) throw error;`
);

// 6. Replace Sign Out
code = code.replace(
  /await signOut\(auth\);/g,
  `await supabase.auth.signOut();`
);

// 7. Fix getIdToken which doesn't exist on our fake firebaseUser anymore
// Old: const token = await firebaseUser.getIdToken();
code = code.replace(
  /const token = await firebaseUser\.getIdToken\(\);/g,
  `const token = session?.access_token || "";`
);
code = code.replace(
  /const token = await auth\.currentUser\?\.getIdToken\(\);/g,
  `const { data: { session } } = await supabase.auth.getSession(); const token = session?.access_token;`
);

// 8. Replace pushSyncToMongoDB
// We change the fetch inside pushSyncToMongoDB to pushSyncToSupabase
const pushRegex = /const res = await fetch\('\/api\/ledger\/sync', \{\s*method: 'POST',\s*headers: \{\s*'Content-Type': 'application\/json',\s*\.\.\.\(token \? \{ 'Authorization': `Bearer \$\{token\}` \} : \{\}\)\s*\},\s*body: JSON\.stringify\(\{\s*userId,\s*accounts:\s*accountsList,\s*transactions:\s*transactionsList,\s*businessProfile,\s*subscription,\s*securitySettings,\s*clients,\s*inventory,\s*invoices,\s*expenses,\s*recurringTemplates,\s*receipts,\s*action: 'push'\s*\}\)\s*\}\);/g;

code = code.replace(pushRegex, `
      await pushSyncToSupabase(userId, accountsList, transactionsList, businessProfile, subscription, securitySettings, clients, inventory, invoices, expenses, recurringTemplates, receipts);
      const res = { ok: true };
`);

// 9. Replace pullSyncFromMongoDB
const pullRegex = /const syncRes = await fetch\('\/api\/ledger\/sync', \{\s*method: 'POST',\s*headers: \{\s*'Content-Type': 'application\/json'\s*(?:,\s*'Authorization': `Bearer \$\{token\}`\s*)?\},\s*body: JSON\.stringify\(\{\s*userId:\s*([^,]+),\s*action: 'pull'\s*\}\)\s*\}\);\s*const syncData = await syncRes\.json\(\);/g;

code = code.replace(pullRegex, `
          const syncData = await pullSyncFromSupabase($1);
`);

// 10. Replace Phone/WhatsApp Sync Pulls (which lack token header in older code)
const pullRegex2 = /const syncRes = await fetch\('\/api\/ledger\/sync', \{\s*method: 'POST',\s*headers: \{\s*'Content-Type': 'application\/json'\s*\},\s*body: JSON\.stringify\(\{\s*userId:\s*([^,]+),\s*action: 'pull'\s*\}\)\s*\}\);\s*const syncData = await syncRes\.json\(\);/g;

code = code.replace(pullRegex2, `
          const syncData = await pullSyncFromSupabase($1);
`);

fs.writeFileSync('src/App.tsx', code);
console.log('App.tsx patched for Supabase successfully.');
