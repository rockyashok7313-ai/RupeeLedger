const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabaseUrl = 'https://wxgzbfjosxficpeczgvj.supabase.co';
const supabaseKey = 'sb_publishable_Xu8aNJh9hn2xk9Pop5x5mw_4iTy38We';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  const { data, error } = await supabase.from('license_keys').select('*').limit(1);
  if (error) {
    console.error("Table license_keys does not exist or error:", error.message);
  } else {
    console.log("Table license_keys exists!");
  }
}

checkTables();
