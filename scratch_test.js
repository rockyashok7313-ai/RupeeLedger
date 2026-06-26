const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://rockyashok7313_db_user:pSbbADBoxxvjXuen@rupeeledgerpro.5ru0tkx.mongodb.net";

async function run() {
  console.log("Connecting...");
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000 // fail fast
  });
  try {
    await client.connect();
    console.log("Connected successfully!");
  } catch (err) {
    console.error("Connection failed:", err.message);
  } finally {
    await client.close();
  }
}

run();
