const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabaseUrl = 'https://wxgzbfjosxficpeczgvj.supabase.co';
const supabaseKey = 'sb_publishable_Xu8aNJh9hn2xk9Pop5x5mw_4iTy38We';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  const { data, error } = await supabase.from('business_profiles').select('*').limit(1);
  if (error) {
    console.error("Error:", error.message);
  } else {
    console.log("Business Profiles row:", data[0]);
  }
}

checkColumns();
