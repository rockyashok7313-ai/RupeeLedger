import { getMongoDb } from '../../src/lib/mongodb.ts';

export interface RateLimitDoc {
  _id: string;
  count: number;
  resetAt: Date;
}

export async function checkRateLimit(
  ip: string, 
  endpoint: string, 
  maxRequests: number, 
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const db = await getMongoDb();
    const collection = db.collection<RateLimitDoc>('rate_limits');
    
    // Create TTL index on resetAt to auto-clean expired limits
    await collection.createIndex({ resetAt: 1 }, { expireAfterSeconds: 0 });
    
    const key = `${ip}:${endpoint}`;
    const now = new Date();
    const record = await collection.findOne({ _id: key });
    
    if (record) {
      if (record.count >= maxRequests) {
        return { allowed: false, remaining: 0 };
      }
      
      await collection.updateOne(
        { _id: key },
        { $inc: { count: 1 } }
      );
      return { allowed: true, remaining: maxRequests - record.count - 1 };
    } else {
      const resetAt = new Date(now.getTime() + windowSeconds * 1000);
      await collection.insertOne({
        _id: key,
        count: 1,
        resetAt
      });
      return { allowed: true, remaining: maxRequests - 1 };
    }
  } catch (err) {
    // Fail-open for local development offline mode (warnings in console)
    console.warn('MongoDB Rate Limit connection warning:', err);
    return { allowed: true, remaining: 1 };
  }
}
