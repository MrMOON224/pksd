const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jjjdzpmxyifubbnvktwn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqamR6cG14eWlmdWJibnZrdHduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2MjY5MDYsImV4cCI6MjA4NjIwMjkwNn0.cz1ejFGDNHnSSCLU7n5lg59WZVchqT4JpfHfuXy0Rpg';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function fetchIds() {
    try {
        const { data: suppliers } = await supabase.from('suppliers').select('id').limit(1);
        const { data: warehouses } = await supabase.from('warehouses').select('id').limit(1);
        const { data: products } = await supabase.from('products').select('id, cost').limit(2);

        console.log(JSON.stringify({
            supplier_id: suppliers?.[0]?.id,
            warehouse_id: warehouses?.[0]?.id,
            products: products || []
        }, null, 2));
    } catch (err) {
        console.error(err);
    }
}

fetchIds();
