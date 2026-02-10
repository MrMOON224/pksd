// Authentication Module
// Supabase client is already initialized globally in supabase-client.js

// Login function
async function login(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;

        // Get user role
        const role = await getUserRole(data.user.id);

        return { success: true, user: data.user, role };
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: error.message };
    }
}

// Get user role from database
async function getUserRole(userId) {
    try {
        const { data, error } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userId)
            .single();

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
        const { error } = await supabase.auth.signOut();
        if (error) throw error;

        // Redirect to login
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Get current session
async function getCurrentSession() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        return session;
    } catch (error) {
        console.error('Session error:', error);
        return null;
    }
}

// Get current user with role
async function getCurrentUser() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error) {
            // Silence session missing error as it's normal when not logged in
            if (error.name === 'AuthSessionMissingError' || error.message.includes('session missing')) {
                return null;
            }
            throw error;
        }

        if (user) {
            const role = await getUserRole(user.id);
            return { ...user, role };
        }

        return null;
    } catch (error) {
        console.error('Get user error:', error);
        return null;
    }
}

// Redirect based on role
function redirectByRole(role) {
    const routes = {
        'admin': 'admin-dashboard.html',
        'cashier': 'cashier-pos.html',
        'manager': 'manager-dashboard.html'
    };

    const route = routes[role];
    if (route) {
        window.location.href = route;
    } else {
        console.error('Unknown role:', role);
        showError('Invalid user role. Please contact administrator.');
    }
}

// Auth guard - protect pages that require authentication
async function requireAuth(allowedRoles = []) {
    const user = await getCurrentUser();

    if (!user) {
        // Not logged in, redirect to login
        window.location.href = 'index.html';
        return null;
    }

    // Check if user has required role
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        // User doesn't have permission, redirect to their dashboard
        redirectByRole(user.role);
        return null;
    }

    return user;
}

// Check if user is already logged in (for login page)
async function checkExistingSession() {
    const user = await getCurrentUser();
    if (user && user.role) {
        // Already logged in, redirect to appropriate dashboard
        redirectByRole(user.role);
        return true;
    }
    return false;
}

// Listen for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event, session);

    if (event === 'SIGNED_OUT') {
        window.location.href = 'index.html';
    }
});
