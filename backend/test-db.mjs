import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require('dotenv').config();

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Falta SUPABASE_URL o SUPABASE_ANON_KEY en backend/.env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase.from('transacciones').select('*').limit(1);
  if (error) {
    console.error('Error fetching transactions:', error);
  } else if (data && data.length > 0) {
    console.log('Transaction columns:', Object.keys(data[0]));
    console.log('Transaction record:', data[0]);
  } else {
    console.log('No transactions found.');
  }
}

test();
