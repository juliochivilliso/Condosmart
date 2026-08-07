import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ofjsodxsdbkiugonnmkh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_NxGCb5HAXwmFzW0lkfKBqQ_8H7X9-y0';

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
