const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function run() {
  console.log("URI:", process.env.MONGODB_URI);
  if (!process.env.MONGODB_URI) {
    console.error("No URI found in .env.local");
    return;
  }
  
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    console.log("Connected successfully to MongoDB");
    const db = client.db();
    const collections = await db.collections();
    console.log("Collections:", collections.map(c => c.collectionName));
  } catch (error) {
    console.error("Error connecting:", error);
  } finally {
    await client.close();
  }
}
run();
