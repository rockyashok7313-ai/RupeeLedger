import { NextResponse } from 'next/server';
import { getMongoDb, isMongoConfigured } from '@/lib/mongodb';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      userId, 
      accounts, 
      transactions, 
      businessProfile, 
      subscription, 
      securitySettings, 
      action 
    } = body;

    if (!userId || !action) {
      return NextResponse.json({ error: 'Missing userId or action.' }, { status: 400 });
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

      return NextResponse.json({
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

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (error) {
    console.error('Error in /api/ledger/sync:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
