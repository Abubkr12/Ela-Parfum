const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fixRLS() {
  const { error } = await supabase.rpc('exec_sql', {
    sql: 'DROP POLICY IF EXISTS "Enable read access for all users" ON product_stocks; CREATE POLICY "Enable read access for all users" ON product_stocks FOR SELECT USING (true);'
  });
  console.log('Error:', error);
}
fixRLS();
