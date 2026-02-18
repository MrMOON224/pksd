// Authentication Module
// Supabase client is already initialized globally in supabase-client.js

// Ensure supabase is defined globally for this script
if (typeof supabase === 'undefined') {
    if (window.supabase) {
        var supabase = window.supabase;
    } else if (window.supabaseClient) {
        var supabase = window.supabaseClient;
    }
}

// Login function
async function login(email, password) {
    try {
        // Double-check supabase instance before calling
        var client = supabase || window.supabase || window.supabaseClient;
        if (!client) throw new Error("supabase is not defined");

        var response = await client.auth.signInWithPassword({
            email: email,
            password: password
        });

        var data = response.data;
        var error = response.error;

        if (error) throw error;

        // Get user role
        var role = await getUserRole(data.user.id);

        // Load permissions if available globally
        if (window.fetchUserPermissions) {
            await window.fetchUserPermissions(role);
        }

        return { success: true, user: data.user, role: role };
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: error.message };
    }
}

// Get user role from database
async function getUserRole(userId) {
    try {
        var client = supabase || window.supabase || window.supabaseClient;
        if (!client) return null;

        var response = await client
            .from('user_roles')
            .select('role')
            .eq('user_id', userId)
            .single();

        var data = response.data;
        var error = response.error;

        if (error) throw error;
        return (data && data.role) || null;
    } catch (error) {
        console.error('Error fetching user role:', error);
        return null;
    }
}

// Logout function
async function logout() {
    try {
        var client = supabase || window.supabase || window.supabaseClient;
        if (!client) return;

        var response = await client.auth.signOut();
        if (response.error) throw response.error;

        // Redirect to login
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Get current session
async function getCurrentSession() {
    try {
        var client = supabase || window.supabase || window.supabaseClient;
        if (!client) return null;

        var response = await client.auth.getSession();
        if (response.error) throw response.error;
        return response.data.session;
    } catch (error) {
        console.error('Session error:', error);
        return null;
    }
}

// Get current user with role
async function getCurrentUser() {
    try {
        var client = supabase || window.supabase || window.supabaseClient;
        if (!client) return null;

        var response = await client.auth.getUser();
        var user = response.data.user;
        var error = response.error;

        if (error) {
            // Silence session missing error as it's normal when not logged in
            if (error.name === 'AuthSessionMissingError' || error.message.indexOf('session missing') !== -1) {
                return null;
            }
            // Also silence AbortError which can occur during initialization
            if (error.name === 'AbortError') {
                console.log('Auth initialization in progress, skipping user check');
                return null;
            }
            throw error;
        }

        if (user) {
            var role = await getUserRole(user.id);
            return {
                id: user.id,
                email: user.email,
                role: role
            };
        }

        return null;
    } catch (error) {
        // Don't log AbortError as it's expected during initialization
        if (error.name !== 'AbortError') {
            console.error('Get user error:', error);
        }
        return null;
    }
}

// Redirect based on role
function redirectByRole(role) {
    var routes = {
        'admin': 'admin-dashboard.html',
        'cashier': 'cashier-pos.html',
        'manager': 'manager-dashboard.html'
    };

    var route = routes[role];
    if (route) {
        window.location.href = route;
    } else {
        console.error('Unknown role:', role);
        if (typeof showError === 'function') {
            showError('Invalid user role. Please contact administrator.');
        }
    }
}

// Auth guard - protect pages that require authentication
async function requireAuth(allowedRoles) {
    if (!allowedRoles) allowedRoles = [];
    var user = await getCurrentUser();

    if (!user) {
        // Not logged in, redirect to login
        window.location.href = 'index.html';
        return null;
    }

    // Check if user has required role
    if (allowedRoles.length > 0 && allowedRoles.indexOf(user.role) === -1) {
        // User doesn't have permission, redirect to their dashboard
        redirectByRole(user.role);
        return null;
    }

    return user;
}

// Check if user is already logged in (for login page)
async function checkExistingSession() {
    var user = await getCurrentUser();
    if (user && user.role) {
        // Already logged in, redirect to appropriate dashboard
        redirectByRole(user.role);
        return true;
    }
    return false;
}

// Listen for auth state changes
(function () {
    var client = supabase || window.supabase || window.supabaseClient;
    if (client && client.auth) {
        client.auth.onAuthStateChange(function (event, session) {
            console.log('Auth state changed:', event, session);

            if (event === 'SIGNED_OUT') {
                window.location.href = 'index.html';
            }
        });
    }
})();
