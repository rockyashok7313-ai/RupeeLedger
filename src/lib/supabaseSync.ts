import { supabase } from './supabase';
import { 
  Account, Transaction, BusinessProfile, Subscription, SecuritySettings, 
  Client, InventoryItem, Invoice, Expense, RecurringTemplate, Receipt 
} from './types';

// Helper to push array data to a Supabase table
async function syncArrayToSupabase(tableName: string, dataArray: any[], userId: string) {
  if (!dataArray || !Array.isArray(dataArray)) return;
  
  // 1. Delete items not in the current active list
  const activeIds = dataArray.map(item => item.id);
  if (activeIds.length > 0) {
    // Delete anything that belongs to this user but is NOT in the activeIds array
    // Since Supabase doesn't have a simple NOT IN for arrays directly via the JS client easily without RPC, 
    // we can fetch all IDs for the user, find the ones missing, and delete them.
    const { data: existingRecords } = await supabase
      .from(tableName)
      .select('id')
      .eq('user_id', userId);
      
    if (existingRecords) {
      const idsToDelete = existingRecords
        .map(r => r.id)
        .filter(id => !activeIds.includes(id));
        
      if (idsToDelete.length > 0) {
        await supabase.from(tableName).delete().in('id', idsToDelete);
      }
    }
  } else {
    // If the active list is empty, delete all items for this user
    await supabase.from(tableName).delete().eq('user_id', userId);
  }

  // 2. Upsert the current active items
  if (dataArray.length > 0) {
    const recordsToUpsert = dataArray.map(item => {
      const { id, ...rest } = item;
      return { id, user_id: userId, ...rest };
    });
    
    const { error } = await supabase.from(tableName).upsert(recordsToUpsert);
    if (error) {
      console.error(`Supabase sync error for ${tableName}:`, error);
      throw error;
    }
  }
}

export async function pushSyncToSupabase(
  userId: string,
  accounts: Account[],
  transactions: Transaction[],
  businessProfile?: BusinessProfile,
  subscription?: Subscription,
  securitySettings?: SecuritySettings,
  clients?: Client[],
  inventory?: InventoryItem[],
  invoices?: Invoice[],
  expenses?: Expense[],
  recurringTemplates?: RecurringTemplate[],
  receipts?: Receipt[]
) {
  try {
    // 1. Upsert Business Profile
    if (businessProfile) {
      const { error } = await supabase.from('business_profiles').upsert({
        user_id: userId,
        ...businessProfile,
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
    }

    // 2. Upsert Subscription
    if (subscription) {
      const { error } = await supabase.from('subscriptions').upsert({
        user_id: userId,
        ...subscription,
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
    }

    // 3. Upsert Security Settings
    if (securitySettings) {
      const { error } = await supabase.from('security_settings').upsert({
        user_id: userId,
        ...securitySettings,
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
    }

    // 4. Sync Arrays
    await syncArrayToSupabase('accounts', accounts || [], userId);
    await syncArrayToSupabase('transactions', transactions || [], userId);
    
    // Check if extra tables were created (Clients, Inventory, etc.)
    // For now, we wrap these in try-catch so they don't break if the tables don't exist yet
    try {
      if (clients) await syncArrayToSupabase('clients', clients, userId);
      if (inventory) await syncArrayToSupabase('inventory', inventory, userId);
      if (invoices) await syncArrayToSupabase('invoices', invoices, userId);
      if (expenses) await syncArrayToSupabase('expenses', expenses, userId);
      if (recurringTemplates) await syncArrayToSupabase('recurring_templates', recurringTemplates, userId);
      if (receipts) await syncArrayToSupabase('receipts', receipts, userId);
    } catch (e) {
      console.warn("Could not sync extended GST modules to Supabase. Tables might be missing.", e);
    }

    return { success: true };
  } catch (error) {
    console.error('Error pushing to Supabase:', error);
    throw error;
  }
}

export async function pullSyncFromSupabase(userId: string) {
  try {
    const [
      { data: profile },
      { data: sub },
      { data: sec },
      { data: accs },
      { data: txs }
    ] = await Promise.all([
      supabase.from('business_profiles').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('subscriptions').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('security_settings').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('accounts').select('*').eq('user_id', userId),
      supabase.from('transactions').select('*').eq('user_id', userId)
    ]);

    // Handle potentially missing GST modules gracefully
    let clients = [], inventory = [], invoices = [], expenses = [], recurring = [], receipts = [];
    try {
      const resClients = await supabase.from('clients').select('*').eq('user_id', userId);
      if (resClients.data) clients = resClients.data;
      
      const resInv = await supabase.from('inventory').select('*').eq('user_id', userId);
      if (resInv.data) inventory = resInv.data;
      
      const resInvoices = await supabase.from('invoices').select('*').eq('user_id', userId);
      if (resInvoices.data) invoices = resInvoices.data;
      
      const resExp = await supabase.from('expenses').select('*').eq('user_id', userId);
      if (resExp.data) expenses = resExp.data;
      
      const resRec = await supabase.from('recurring_templates').select('*').eq('user_id', userId);
      if (resRec.data) recurring = resRec.data;
      
      const resReceipts = await supabase.from('receipts').select('*').eq('user_id', userId);
      if (resReceipts.data) receipts = resReceipts.data;
    } catch(e) {
      console.log("Extended modules not found in Supabase.");
    }

    const mapDocs = (docs: any[] | null) => (docs || []).map(d => {
      const { user_id, ...rest } = d;
      return rest;
    });

    return {
      exists: !!profile,
      businessProfile: profile ? (({ user_id, updated_at, ...rest }) => rest)(profile) : null,
      subscription: sub ? (({ user_id, updated_at, ...rest }) => rest)(sub) : null,
      securitySettings: sec ? (({ user_id, updated_at, ...rest }) => rest)(sec) : null,
      accounts: mapDocs(accs),
      transactions: mapDocs(txs),
      clients: mapDocs(clients),
      inventory: mapDocs(inventory),
      invoices: mapDocs(invoices),
      expenses: mapDocs(expenses),
      recurringTemplates: mapDocs(recurring),
      receipts: mapDocs(receipts),
      isOfflineFallback: false
    };
  } catch (error) {
    console.error('Error pulling from Supabase:', error);
    throw error;
  }
}
