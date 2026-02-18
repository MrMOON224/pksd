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

        // Initialize the client with simplified options to prevent lock issues
        var supabaseClient = lib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: false,
                // Use implicit flow to avoid PKCE lock issues
                flowType: 'implicit',
                storageKey: 'supabase.auth.token'
            }
        });

        // Make it globally accessible in multiple ways to ensure scripts find it
        window.supabase = supabaseClient;
        window.supabaseClient = supabaseClient;

        // Also ensure a simple 'supabase' variable exists in the global scope
        if (typeof window !== 'undefined') {
            window['supabase'] = supabaseClient;
        }

        console.log('Supabase Client initialized successfully.');

        // Suppress AbortError from Supabase's internal operations
        window.addEventListener('unhandledrejection', function (event) {
            if (event.reason && event.reason.name === 'AbortError') {
                // Silently prevent AbortError from appearing in console
                event.preventDefault();
            }
        });

    } catch (error) {
        console.error('Failed to initialize Supabase client:', error);
        // Don't throw - allow page to continue loading
    }
})();
