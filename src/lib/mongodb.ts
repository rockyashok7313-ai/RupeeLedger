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
  
  // Safely parse DB name from URI or default to "rupeeledger"
  let dbName = 'rupeeledger';
  if (uri) {
    try {
      const parsedUri = new URL(uri);
      // parsedUri.pathname will be '/' or '/dbname'
      if (parsedUri.pathname && parsedUri.pathname.length > 1) {
        dbName = parsedUri.pathname.substring(1); // remove leading slash
      }
    } catch (e) {
      // Fallback manual parsing if URL parsing fails
      const afterSlash = uri.includes('?') 
        ? uri.substring(uri.lastIndexOf('/') + 1, uri.indexOf('?'))
        : uri.substring(uri.lastIndexOf('/') + 1);
        
      if (afterSlash && !afterSlash.includes('.')) {
        dbName = afterSlash;
      }
    }
  }
  
  return client.db(dbName || 'rupeeledger');
}

export function isMongoConfigured(): boolean {
  return !!uri;
}
