const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jjjdzpmxyifubbnvktwn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqamR6cG14eWlmdWJibnZrdHduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2MjY5MDYsImV4cCI6MjA4NjIwMjkwNn0.cz1ejFGDNHnSSCLU7n5lg59WZVchqT4JpfHfuXy0Rpg';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function insertSale() {
    const { data, error } = await supabase
        .from('transactions')
        .insert([
            { total: 1500, payment_method: 'KPay', status: 'completed' }
        ]);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Success:', data);
    }
}

insertSale();
