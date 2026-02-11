// Supabase Configuration
// Using var for legacy browser compatibility
var SUPABASE_URL = 'https://jjjdzpmxyifubbnvktwn.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqamR6cG14eWlmdWJibnZrdHduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2MjY5MDYsImV4cCI6MjA4NjIwMjkwNn0.cz1ejFGDNHnSSCLU7n5lg59WZVchqT4JpfHfuXy0Rpg';

// App Configuration
var APP_CONFIG = {
    name: 'POS System',
    roles: {
        ADMIN: 'admin',
        CASHIER: 'cashier',
        MANAGER: 'manager'
    },
    routes: {
        admin: 'admin-dashboard.html',
        cashier: 'cashier-pos.html',
        manager: 'manager-dashboard.html'
    }
};
