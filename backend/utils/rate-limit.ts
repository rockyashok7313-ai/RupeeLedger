import { getSupabaseAdmin, isSupabaseConfigured } from './supabase-admin.ts';

export interface RateLimitRow {
  id: string;
  count: number;
  reset_at: string;
}

const TABLE = 'rate_limits';

export async function checkRateLimit(
  ip: string,
  endpoint: string,
  maxRequests: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number }> {
  // Fail-open when the database is not configured (local/offline development)
  if (!isSupabaseConfigured()) {
    return { allowed: true, remaining: 1 };
  }

  try {
    const supabase = getSupabaseAdmin();
    const key = `${ip}:${endpoint}`;
    const now = new Date();

    const { data: record, error: findError } = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', key)
      .maybeSingle();

    if (findError) throw findError;

    const startNewWindow = async () => {
      const resetAt = new Date(now.getTime() + windowSeconds * 1000);
      const { error } = await supabase
        .from(TABLE)
        .upsert({ id: key, count: 1, reset_at: resetAt.toISOString() }, { onConflict: 'id' });
      if (error) throw error;
      return { allowed: true, remaining: maxRequests - 1 };
    };

    // Postgres has no TTL index, so an elapsed window is reset here on read
    if (!record || now >= new Date(record.reset_at)) {
      return await startNewWindow();
    }

    if (record.count >= maxRequests) {
      return { allowed: false, remaining: 0 };
    }

    const { error: incError } = await supabase
      .from(TABLE)
      .update({ count: record.count + 1 })
      .eq('id', key);

    if (incError) throw incError;

    return { allowed: true, remaining: maxRequests - record.count - 1 };
  } catch (err) {
    // Fail-open for local development offline mode (warnings in console)
    console.warn('Supabase rate limit warning:', err);
    return { allowed: true, remaining: 1 };
  }
}
