const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

// Fix 1: handleTransactionEditSubmit
const editTarget = `      recalculateData(accounts, updatedTransactions);
      setEditingTransaction(null);
      toast({ title: "Transaction updated" });`;

const editReplacement = `      recalculateData(accounts, updatedTransactions);
      setTimeout(() => setEditingTransaction(null), 50);
      toast({ title: "Transaction updated" });`;

if (code.includes(editTarget)) {
    code = code.replace(editTarget, editReplacement);
    console.log("Patched setEditingTransaction(null)");
} else {
    console.log("Could not find editTarget");
}

// Fix 2: deleteTransaction
const deleteTarget = `      recalculateData(accounts, updatedTransactions);
      setTransactionToDelete(null);
      toast({ title: "Transaction deleted" });`;

const deleteReplacement = `      recalculateData(accounts, updatedTransactions);
      setTimeout(() => setTransactionToDelete(null), 50);
      toast({ title: "Transaction deleted" });`;

if (code.includes(deleteTarget)) {
    code = code.replace(deleteTarget, deleteReplacement);
    console.log("Patched setTransactionToDelete(null)");
} else {
    console.log("Could not find deleteTarget");
}

fs.writeFileSync('src/App.tsx', code);
