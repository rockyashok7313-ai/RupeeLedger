import { getSupabaseAdmin, isSupabaseConfigured } from './supabase-admin.ts';

export interface OtpRow {
  identifier: string; // e.g. email or phone, normalized
  otp: string;
  expires_at: string;
  attempts: number;
  last_sent_at: string;
}

const TABLE = 'otps';
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60000;

const normalize = (identifier: string) => identifier.trim().toLowerCase();

export async function saveOtp(identifier: string, otp: string, expiresAtMs: number): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Database connection failed. Please try again.' };
  }

  try {
    const supabase = getSupabaseAdmin();
    const normalized = normalize(identifier);

    // Cooldown check: limit OTP resending to once per 60 seconds
    const { data: existing } = await supabase
      .from(TABLE)
      .select('last_sent_at')
      .eq('identifier', normalized)
      .maybeSingle();

    if (existing?.last_sent_at) {
      const elapsed = Date.now() - new Date(existing.last_sent_at).getTime();
      if (elapsed < RESEND_COOLDOWN_MS) {
        const remaining = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
        return { success: false, error: `Please wait ${remaining} seconds before requesting a new code.` };
      }
    }

    const { error } = await supabase
      .from(TABLE)
      .upsert({
        identifier: normalized,
        otp,
        expires_at: new Date(expiresAtMs).toISOString(),
        attempts: 0,
        last_sent_at: new Date().toISOString()
      }, { onConflict: 'identifier' });

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('Error saving OTP to Supabase:', err);
    return { success: false, error: 'Database connection failed. Please try again.' };
  }
}

export async function verifyOtp(identifier: string, submittedOtp: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Database connection failed. Please try again.' };
  }

  try {
    const supabase = getSupabaseAdmin();
    const normalized = normalize(identifier);

    const { data: record, error: findError } = await supabase
      .from(TABLE)
      .select('*')
      .eq('identifier', normalized)
      .maybeSingle();

    if (findError) throw findError;

    if (!record) {
      return { success: false, error: 'OTP expired or not found. Please request a new one.' };
    }

    const deleteRecord = () => supabase.from(TABLE).delete().eq('identifier', normalized);

    // Postgres has no TTL index, so expiry is enforced here on read
    if (new Date() > new Date(record.expires_at)) {
      await deleteRecord();
      return { success: false, error: 'OTP has expired. Please request a new one.' };
    }

    // Check too many wrong attempts (lock out after 5 tries)
    if (record.attempts >= MAX_ATTEMPTS) {
      await deleteRecord();
      return { success: false, error: 'Too many incorrect attempts. This OTP has been blocked. Please request a new one.' };
    }

    if (submittedOtp.trim() !== record.otp) {
      const newAttempts = record.attempts + 1;
      const remainingAttempts = MAX_ATTEMPTS - newAttempts;

      if (remainingAttempts <= 0) {
        await deleteRecord();
        return { success: false, error: 'Too many incorrect attempts. This OTP has been blocked. Please request a new one.' };
      }

      await supabase.from(TABLE).update({ attempts: newAttempts }).eq('identifier', normalized);
      return { success: false, error: `Incorrect OTP. You have ${remainingAttempts} attempts remaining.` };
    }

    // Successfully verified, delete the record
    await deleteRecord();
    return { success: true };
  } catch (err) {
    console.error('Error verifying OTP in Supabase:', err);
    return { success: false, error: 'Database connection failed. Please try again.' };
  }
}
