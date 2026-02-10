// Initialize Supabase Client
// The Supabase library is loaded from CDN and available as window.supabase
(function () {
    try {
        // Use window.supabase library from CDN
        var lib = window.supabase;

        if (!lib || !lib.createClient) {
            console.error('Supabase library not found! Primary CDN likely failed.');
            return;
        }

        // Initialize the client
        // Using var for legacy browser compatibility
        var supabaseClient = lib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        // Make it globally accessible in multiple ways to ensure scripts find it
        window.supabase = supabaseClient;
        window.supabaseClient = supabaseClient;

        // Also ensure a simple 'supabase' variable exists in the global scope
        if (typeof window !== 'undefined') {
            window['supabase'] = supabaseClient;
        }

        console.log('Supabase Client initialized successfully.');
    } catch (error) {
        console.error('Failed to initialize Supabase client:', error);
    }
})();
