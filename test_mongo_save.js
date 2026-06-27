const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://rockyashok7313_db_user:sGIvR9GN48V6LeD8@rupeeledgerpro.5ru0tkx.mongodb.net";

const generateKeyString = (duration) => {
  const prefix = duration === 'annual' ? 'YEAR' : 'MONTH';
  const seg = () => Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RL-${prefix}-${seg()}-${seg()}-${seg()}`;
};

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('rupeeledger');
    
    const payId = 'pay_' + Date.now();
    const duration = 'annual';
    const userId = 'test_user_id';
    
    console.log("Checking for existing key with payId:", payId);
    const existingKey = await db.collection('keys').findOne({ paymentId: payId });
    if (existingKey) {
      console.log(`Key already exists for payment ${payId}:`, existingKey._id);
      return;
    }

    const newKeyStr = generateKeyString(duration);
    console.log("Generated new key:", newKeyStr);
    
    console.log("Saving to MongoDB...");
    const result = await db.collection('keys').updateOne(
      { _id: newKeyStr },
      {
        $set: {
          createdAt: Date.now(),
          durationDays: 365,
          createdBy: userId,
          status: 'unused',
          paymentId: payId
        }
      },
      { upsert: true }
    );
    
    console.log("Update result:", result);
    
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
}

run();
