import { getMongoDb } from '../../src/lib/mongodb.ts';

export interface OtpDoc {
  _id: string; // Identifier: e.g. email or phone
  otp: string;
  expiresAt: Date;
  attempts: number;
  lastSentAt: Date;
}

export async function getOtpCollection() {
  const db = await getMongoDb();
  const coll = db.collection<OtpDoc>('otps');
  // Create TTL index to auto-delete records when expiresAt passes
  await coll.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  return coll;
}

export async function saveOtp(identifier: string, otp: string, expiresAtMs: number): Promise<{ success: boolean; error?: string }> {
  try {
    const coll = await getOtpCollection();
    const normalized = identifier.trim().toLowerCase();
    
    // Cooldown check: limit OTP resending to once per 60 seconds
    const existing = await coll.findOne({ _id: normalized });
    if (existing && existing.lastSentAt) {
      const elapsed = Date.now() - new Date(existing.lastSentAt).getTime();
      if (elapsed < 60000) {
        const remaining = Math.ceil((60000 - elapsed) / 1000);
        return { success: false, error: `Please wait ${remaining} seconds before requesting a new code.` };
      }
    }
    
    const doc: OtpDoc = {
      _id: normalized,
      otp,
      expiresAt: new Date(expiresAtMs),
      attempts: 0,
      lastSentAt: new Date(),
    };
    
    await coll.replaceOne({ _id: normalized }, doc, { upsert: true });
    return { success: true };
  } catch (err) {
    console.error('Error saving OTP to MongoDB:', err);
    return { success: false, error: 'Database connection failed. Please try again.' };
  }
}

export async function verifyOtp(identifier: string, submittedOtp: string): Promise<{ success: boolean; error?: string }> {
  try {
    const coll = await getOtpCollection();
    const normalized = identifier.trim().toLowerCase();
    const record = await coll.findOne({ _id: normalized });
    
    if (!record) {
      return { success: false, error: 'OTP expired or not found. Please request a new one.' };
    }
    
    if (new Date() > new Date(record.expiresAt)) {
      await coll.deleteOne({ _id: normalized });
      return { success: false, error: 'OTP has expired. Please request a new one.' };
    }
    
    // Check too many wrong attempts (lock out after 5 tries)
    if (record.attempts >= 5) {
      await coll.deleteOne({ _id: normalized });
      return { success: false, error: 'Too many incorrect attempts. This OTP has been blocked. Please request a new one.' };
    }
    
    if (submittedOtp.trim() !== record.otp) {
      // Increment attempts
      await coll.updateOne({ _id: normalized }, { $inc: { attempts: 1 } });
      const remainingAttempts = 5 - (record.attempts + 1);
      if (remainingAttempts <= 0) {
        await coll.deleteOne({ _id: normalized });
        return { success: false, error: 'Too many incorrect attempts. This OTP has been blocked. Please request a new one.' };
      }
      return { success: false, error: `Incorrect OTP. You have ${remainingAttempts} attempts remaining.` };
    }
    
    // Successfully verified, delete the record
    await coll.deleteOne({ _id: normalized });
    return { success: true };
  } catch (err) {
    console.error('Error verifying OTP in MongoDB:', err);
    return { success: false, error: 'Database connection failed. Please try again.' };
  }
}
