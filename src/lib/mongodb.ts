import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI?.trim();

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

if (!uri) {
  console.warn('WARNING: MONGODB_URI environment variable is not defined. MongoDB functionality will fall back to simulated local database operations.');
}

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

export async function getMongoClient(): Promise<MongoClient> {
  if (!uri) {
    throw new Error('MONGODB_URI is not set');
  }

  if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR.
    if (!global._mongoClientPromise) {
      client = new MongoClient(uri, {
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000,
      });
      global._mongoClientPromise = client.connect().catch((err) => {
        global._mongoClientPromise = undefined;
        throw err;
      });
    }
    return global._mongoClientPromise;
  } else {
    // In production, we still cache the promise but we must clear it if it fails
    // or if the topology is closed, to prevent permanent 500 errors in Vercel Edge/Serverless.
    if (!clientPromise) {
      client = new MongoClient(uri, {
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000,
      });
      clientPromise = client.connect().catch((err) => {
        clientPromise = null;
        client = null;
        throw err;
      });
    }
    
    return clientPromise;
  }
}

export async function getMongoDb() {
  const client = await getMongoClient();
  
  // Safely parse DB name from URI or default to "rupeeledgerpro"
  let dbName = 'rupeeledgerpro';
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
  
  return client.db(dbName || 'rupeeledgerpro');
}

export function isMongoConfigured(): boolean {
  return !!uri;
}
