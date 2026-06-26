import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

if (!uri) {
  console.warn('WARNING: MONGODB_URI environment variable is not defined. MongoDB functionality will fall back to simulated local database operations.');
}

export async function getMongoClient(): Promise<MongoClient> {
  if (!uri) {
    throw new Error('MONGODB_URI is not set');
  }

  if (client) {
    return client;
  }

  if (!clientPromise) {
    client = new MongoClient(uri, {
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    clientPromise = client.connect();
  }

  return clientPromise;
}

export async function getMongoDb() {
  const client = await getMongoClient();
  // Parse DB name from URI or default to "rupeeledger"
  const dbName = uri && uri.includes('?') 
    ? uri.substring(uri.lastIndexOf('/') + 1, uri.indexOf('?'))
    : uri ? uri.substring(uri.lastIndexOf('/') + 1) : 'rupeeledger';
  return client.db(dbName || 'rupeeledger');
}

export function isMongoConfigured(): boolean {
  return !!uri;
}
