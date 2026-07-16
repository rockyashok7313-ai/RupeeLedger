import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://wxgzbfjosxficpeczgvj.supabase.co', 'sb_publishable_Xu8aNJh9hn2xk9Pop5x5mw_4iTy38We');

async function run() {
  const { error } = await supabase.from('subscriptions').insert({
    user_id: 'test',
    licenseKey: 'test',
    purchasedAt: 123
  });
  console.log('Error:', error);
}
run();
