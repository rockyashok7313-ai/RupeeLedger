require('dotenv').config();
const { MongoClient } = require('mongodb');
async function run() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  console.log('MongoDB is Connected and Active!');
  const collections = await client.db().listCollections().toArray();
  console.log('Active Collections:', collections.map(c => c.name));
  await client.close();
}
run().catch(console.error);
