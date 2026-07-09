const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/api/ledger/sync/route.ts');
let code = fs.readFileSync(filePath, 'utf-8');

// 1. Update destructured body
code = code.replace(
  '      transactions, \n      businessProfile,',
  '      transactions, \n      clients,\n      inventory,\n      invoices,\n      expenses,\n      recurringTemplates,\n      receipts,\n      businessProfile,'
);

// 2. Add collections
const collectionsStr = `
    const usersCollection = db.collection('users');
    const accountsCollection = db.collection('accounts');
    const transactionsCollection = db.collection('transactions');
    const clientsCollection = db.collection('clients');
    const inventoryCollection = db.collection('inventory');
    const invoicesCollection = db.collection('invoices');
    const expensesCollection = db.collection('expenses');
    const recurringCollection = db.collection('recurringTemplates');
    const receiptsCollection = db.collection('receipts');
`;
code = code.replace(/    const usersCollection = db\.collection\('users'\);[\s\S]*?const transactionsCollection = db\.collection\('transactions'\);/, collectionsStr.trim());

// 3. Add pull queries
const pullQueryStr = `
      // Fetch user's transactions
      const userTransactions = await transactionsCollection.find({ userId }).toArray();
      const mappedTransactions = userTransactions.map(t => {
        const { _id, userId, ...rest } = t;
        return { id: _id.toString(), ...rest };
      });

      const mapItems = (arr) => arr.map(t => { const { _id, userId, ...rest } = t; return { id: _id.toString(), ...rest }; });

      const mappedClients = mapItems(await clientsCollection.find({ userId }).toArray());
      const mappedInventory = mapItems(await inventoryCollection.find({ userId }).toArray());
      const mappedInvoices = mapItems(await invoicesCollection.find({ userId }).toArray());
      const mappedExpenses = mapItems(await expensesCollection.find({ userId }).toArray());
      const mappedRecurring = mapItems(await recurringCollection.find({ userId }).toArray());
      const mappedReceipts = mapItems(await receiptsCollection.find({ userId }).toArray());
`;
code = code.replace(/      \/\/ Fetch user's transactions[\s\S]*?return \{ id: _id\.toString\(\), \.\.\.rest \};\n      \}\);/, pullQueryStr.trim());

// 4. Add pull return payload
code = code.replace(
  '        transactions: mappedTransactions\n      });',
  '        transactions: mappedTransactions,\n        clients: mappedClients,\n        inventory: mappedInventory,\n        invoices: mappedInvoices,\n        expenses: mappedExpenses,\n        recurringTemplates: mappedRecurring,\n        receipts: mappedReceipts\n      });'
);

// 5. Add push upserts
const pushUpsertsStr = `
      // Helper function to sync arrays
      const syncArray = async (collection, dataArray) => {
        if (!Array.isArray(dataArray)) return;
        const activeIds = dataArray.map(item => item.id);
        await collection.deleteMany({ userId, _id: { $nin: activeIds } });
        for (const item of dataArray) {
          const { id, ...data } = item;
          await collection.updateOne(
            { _id: id, userId },
            { $set: { ...data, userId } },
            { upsert: true }
          );
        }
      };

      await syncArray(clientsCollection, clients);
      await syncArray(inventoryCollection, inventory);
      await syncArray(invoicesCollection, invoices);
      await syncArray(expensesCollection, expenses);
      await syncArray(recurringCollection, recurringTemplates);
      await syncArray(receiptsCollection, receipts);

      return NextResponse.json({ success: true });
`;

code = code.replace('      return NextResponse.json({ success: true });', pushUpsertsStr.trim());

fs.writeFileSync(filePath, code);
console.log('Sync API patched successfully.');
