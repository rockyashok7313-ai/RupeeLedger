import { NextResponse } from '../../../next-response.ts';
import { getMongoDb, isMongoConfigured } from '../../../../src/lib/mongodb.ts';
import { verifyIdToken, extractToken, checkIsAdmin } from '../../../../src/lib/auth-verify.ts';
import { z } from 'zod';

const syncSchema = z.object({
  userId: z.string().trim().min(1, 'userId is required.'),
  action: z.enum(['pull', 'push']),
  accounts: z.array(z.any()).optional(),
  transactions: z.array(z.any()).optional(),
  businessProfile: z.any().optional(),
  subscription: z.any().optional(),
  securitySettings: z.any().optional(),
  clients: z.array(z.any()).optional(),
  inventory: z.array(z.any()).optional(),
  invoices: z.array(z.any()).optional(),
  expenses: z.array(z.any()).optional(),
  recurringTemplates: z.array(z.any()).optional(),
  receipts: z.array(z.any()).optional(),
});

export async function POST(request: Request) {
  try {
    const rawBody = await request.json();
    
    // Zod Schema Validation
    const parsed = syncSchema.safeParse(rawBody);
    if (!parsed.success) {
      const errorMsg = parsed.error.errors.map(e => e.message).join(', ');
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const { 
      userId, 
      accounts, 
      transactions, 
      businessProfile, 
      subscription, 
      securitySettings,
      clients,
      inventory,
      invoices,
      expenses,
      recurringTemplates,
      receipts,
      action 
    } = parsed.data;

    const token = extractToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid token' }, { status: 401 });
    }

    const decodedToken = await verifyIdToken(token);
    if (!decodedToken) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    // Verify that the token owner is the one requested (or it's the admin, or phone matches)
    const isOwner = decodedToken.uid === userId;
    
    const normalizeString = (str: string) => str.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    const normalizePhone = (str: string) => str.replace(/\D/g, '').slice(-10);

    const tokenEmail = decodedToken.email ? normalizeString(decodedToken.email) : '';
    const userEmail = userId.startsWith('e_') ? normalizeString(userId.substring(2)) : normalizeString(userId);
    const isEmailUser = tokenEmail && tokenEmail === userEmail;

    const tokenPhone = decodedToken.phone_number ? normalizePhone(decodedToken.phone_number) : '';
    const userPhone = userId.startsWith('p_') ? normalizePhone(userId.substring(2)) : normalizePhone(userId);
    const isPhoneUser = tokenPhone && tokenPhone === userPhone;

    const isAdmin = checkIsAdmin(decodedToken);

    if (!isOwner && !isPhoneUser && !isEmailUser && !isAdmin) {
      console.error(`Unauthorized sync attempt. Token uid: ${decodedToken.uid}, Target: ${userId}`);
      return NextResponse.json({ error: 'Forbidden: You do not have permission to access this data.' }, { status: 403 });
    }

    // Fallback if MongoDB is not configured
    if (!isMongoConfigured()) {
      console.log('[SYNC] MongoDB is not configured. Falling back to local offline mode.');
      return NextResponse.json({ isOfflineFallback: true });
    }

    const db = await getMongoDb();
const usersCollection = db.collection('users');
    const accountsCollection = db.collection('accounts');
    const transactionsCollection = db.collection('transactions');
    const clientsCollection = db.collection('clients');
    const inventoryCollection = db.collection('inventory');
    const invoicesCollection = db.collection('invoices');
    const expensesCollection = db.collection('expenses');
    const recurringCollection = db.collection('recurringTemplates');
    const receiptsCollection = db.collection('receipts');

    if (action === 'pull') {
      // Fetch user settings profile doc
      const userDoc = await usersCollection.findOne({ _id: userId as any });
      
      // Fetch user's accounts
      const userAccounts = await accountsCollection.find({ userId }).toArray();
      const mappedAccounts = userAccounts.map(a => {
        const { _id, userId, ...rest } = a;
        return { id: _id.toString(), ...rest };
      });

      // Fetch user's transactions
      const userTransactions = await transactionsCollection.find({ userId }).toArray();
      const mappedTransactions = userTransactions.map(t => {
        const { _id, userId, ...rest } = t;
        return { id: _id.toString(), ...rest };
      });

      // Fetch GST Module Data
      const mapDocs = (docs: any[]) => docs.map(d => {
        const { _id, userId, ...rest } = d;
        return { id: _id.toString(), ...rest };
      });

      const userClients = await clientsCollection.find({ userId }).toArray();
      const userInventory = await inventoryCollection.find({ userId }).toArray();
      const userInvoices = await invoicesCollection.find({ userId }).toArray();
      const userExpenses = await expensesCollection.find({ userId }).toArray();
      const userRecurring = await recurringCollection.find({ userId }).toArray();
      const userReceipts = await receiptsCollection.find({ userId }).toArray();

      return NextResponse.json({
        clients: mapDocs(userClients),
        inventory: mapDocs(userInventory),
        invoices: mapDocs(userInvoices),
        expenses: mapDocs(userExpenses),
        recurringTemplates: mapDocs(userRecurring),
        receipts: mapDocs(userReceipts),
        exists: !!userDoc,
        businessProfile: userDoc?.businessProfile || null,
        subscription: userDoc?.subscription || null,
        securitySettings: userDoc?.securitySettings || null,
        accounts: mappedAccounts,
        transactions: mappedTransactions
      });
    }

    if (action === 'push') {
      // 1. Save user profile doc
      await usersCollection.updateOne(
        { _id: userId as any },
        { 
          $set: { 
            businessProfile, 
            subscription, 
            securitySettings, 
            updatedAt: Date.now() 
          } 
        },
        { upsert: true }
      );

      // 2. Refresh/Upsert accounts
      if (Array.isArray(accounts)) {
        // Delete accounts that aren't in the pushed list
        const activeAccountIds = accounts.map(a => a.id);
        await accountsCollection.deleteMany({ 
          userId, 
          _id: { $nin: activeAccountIds as any[] } 
        });

        // Upsert standard accounts list
        for (const acc of accounts) {
          const { id, ...accountData } = acc;
          await accountsCollection.updateOne(
            { _id: id as any, userId },
            { $set: { ...accountData, userId } },
            { upsert: true }
          );
        }
      }

      // 3. Refresh/Upsert transactions
      if (Array.isArray(transactions)) {
        // Delete transactions that aren't in the pushed list
        const activeTxIds = transactions.map(t => t.id);
        await transactionsCollection.deleteMany({ 
          userId, 
          _id: { $nin: activeTxIds as any[] } 
        });

        // Upsert standard transactions list
        for (const tx of transactions) {
          const { id, ...txData } = tx;
          await transactionsCollection.updateOne(
            { _id: id as any, userId },
            { $set: { ...txData, userId } },
            { upsert: true }
          );
        }
      }

      // Helper function to sync arrays
      const syncArray = async (collection: any, dataArray: any[] | undefined) => {
        if (!dataArray || !Array.isArray(dataArray)) return;
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
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (error) {
    console.error('Error in /api/ledger/sync:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

