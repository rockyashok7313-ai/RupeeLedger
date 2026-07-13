const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Fix 1: handleTransactionEditSubmit
const editRegex = /recalculateData\(accounts, updatedTransactions\);\s*setEditingTransaction\(null\);\s*toast\(\{\s*title:\s*"Transaction updated"\s*\}\);/g;

const editReplacement = `recalculateData(accounts, updatedTransactions);
      setTimeout(() => setEditingTransaction(null), 100);
      toast({ title: "Transaction updated" });`;

if (editRegex.test(code)) {
    code = code.replace(editRegex, editReplacement);
    console.log("Patched setEditingTransaction");
} else {
    console.log("Could not find setEditingTransaction pattern");
}

// Fix 2: deleteTransaction
const deleteRegex = /recalculateData\(accounts, updatedTransactions\);\s*setTransactionToDelete\(null\);\s*toast\(\{\s*title:\s*"Transaction deleted"\s*\}\);/g;

const deleteReplacement = `recalculateData(accounts, updatedTransactions);
      setTimeout(() => setTransactionToDelete(null), 100);
      toast({ title: "Transaction deleted" });`;

if (deleteRegex.test(code)) {
    code = code.replace(deleteRegex, deleteReplacement);
    console.log("Patched setTransactionToDelete");
} else {
    console.log("Could not find setTransactionToDelete pattern");
}

// Fix 3: Also fix account edit/delete just in case!
const editAccRegex = /recalculateData\(updatedAccounts, transactions\);\s*setEditingAccount\(null\);\s*toast\(\{\s*title:\s*"Account updated"\s*\}\);/g;
const editAccReplacement = `recalculateData(updatedAccounts, transactions);
        setTimeout(() => setEditingAccount(null), 100);
        toast({ title: "Account updated" });`;
if(editAccRegex.test(code)) {
    code = code.replace(editAccRegex, editAccReplacement);
    console.log("Patched setEditingAccount");
}

const deleteAccRegex = /if \(selectedAccountId === accountToDelete\) setSelectedAccountId\(null\);\s*setAccountToDelete\(null\);\s*toast\(\{\s*title:\s*"Account deleted"\s*\}\);/g;
const deleteAccReplacement = `if (selectedAccountId === accountToDelete) setSelectedAccountId(null);
      setTimeout(() => setAccountToDelete(null), 100);
      toast({ title: "Account deleted" });`;
if (deleteAccRegex.test(code)) {
    code = code.replace(deleteAccRegex, deleteAccReplacement);
    console.log("Patched setAccountToDelete");
}

fs.writeFileSync('src/App.tsx', code);
