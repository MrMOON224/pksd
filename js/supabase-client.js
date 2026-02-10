// Initialize Supabase Client
// The Supabase library is loaded from CDN and available as window.supabase
const { createClient } = window.supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Make it globally accessible
window.supabase = supabaseClient;
