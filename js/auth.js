// ============================================================
// Authentication Module — Resilient Session & Role Handling
// Handles Supabase session restore, exponential backoff,
// offline detection, and role-based access control.
// ============================================================

(function () {
    'use strict';

    // --- Configuration ---
    var AUTH_CONFIG = {
        maxRetries: 5,
        initialDelay: 1000,   // 1s
        maxTimeout: 15000,    // 15s total
        redirectUrl: 'index.html'
    };

    // --- Internal Helpers ---

    function getClient() {
        return window.supabase || window.supabaseClient || null;
    }

    function sleep(ms) {
        return new Promise(function (resolve) { setTimeout(resolve, ms); });
    }

    /**
     * Check if the browser is online.
     * Shows an error message via global showError() or alert().
     * @returns {boolean} true if online
     */
    function checkNetwork() {
        if (!navigator.onLine) {
            var msg = 'You are offline. Please check your internet connection.';
            if (typeof window.showError === 'function') {
                window.showError(msg);
            } else {
                alert(msg);
            }
            return false;
        }
        return true;
    }

    /**
     * Determine whether an error is a retryable network/fetch error.
     * Supabase free-tier sleep, AbortError, TypeError (fetch), etc.
     */
    function isRetryableError(err) {
        if (!err) return false;
        var msg = (err.message || '').toLowerCase();
        var name = (err.name || '').toLowerCase();

        return (
            name === 'aborterror' ||
            name === 'typeerror' ||
            msg.indexOf('failed to fetch') !== -1 ||
            msg.indexOf('network') !== -1 ||
            msg.indexOf('abort') !== -1 ||
            msg.indexOf('connection') !== -1 ||
            msg.indexOf('timeout') !== -1 ||
            msg.indexOf('load failed') !== -1
        );
    }

    // =======================================================
    // 1. Wait for Session — Exponential Backoff
    // =======================================================
    async function waitForSession() {
        var client = getClient();
        if (!client) {
            console.error('[Auth] Supabase client not found.');
            return null;
        }

        var attempt = 0;
        var delay = AUTH_CONFIG.initialDelay;
        var startTime = Date.now();

        while (attempt < AUTH_CONFIG.maxRetries) {
            // Total timeout guard
            if (Date.now() - startTime > AUTH_CONFIG.maxTimeout) {
                console.warn('[Auth] Session restore timeout exceeded.');
                break;
            }

            try {
                // If offline, wait for online event before retrying
                if (!navigator.onLine) {
                    console.warn('[Auth] Offline — waiting for connection...');
                    await new Promise(function (resolve) {
                        window.addEventListener('online', resolve, { once: true });
                    });
                    console.log('[Auth] Back online — retrying session restore.');
                }

                var result = await client.auth.getSession();
                if (result.error) throw result.error;

                // Successful response — return session (may be null if logged out)
                return result.data.session;

            } catch (err) {
                attempt++;
                console.warn('[Auth] Session attempt ' + attempt + ' failed:', err.message);

                // If it's NOT a retryable error, don't bother retrying
                if (!isRetryableError(err)) {
                    console.error('[Auth] Non-retryable error. Stopping.');
                    break;
                }

                if (attempt >= AUTH_CONFIG.maxRetries) break;

                // Exponential backoff: 1s → 2s → 4s → 8s
                await sleep(delay);
                delay = Math.min(delay * 2, 8000);
            }
        }

        // All retries exhausted
        return null;
    }

    // =======================================================
    // 2. requireAuth — Session + Role Gatekeeper
    // =======================================================
    async function requireAuth(allowedRoles) {
        allowedRoles = allowedRoles || [];

        // 1. Check network
        if (!checkNetwork()) {
            return null; // UI already shown
        }

        try {
            // 2. Wait for session with backoff
            var session = await waitForSession();

            if (!session) {
                console.warn('[Auth] No active session. Redirecting to login.');
                window.location.href = AUTH_CONFIG.redirectUrl;
                return null;
            }

            // 3. Get role
            var user = session.user;
            var role = await getUserRole(user.id);

            // 4. Role check
            if (allowedRoles.length > 0 && allowedRoles.indexOf(role) === -1) {
                console.warn('[Auth] Role "' + role + '" not allowed. Required: ' + allowedRoles.join(', '));
                redirectByRole(role);
                return null;
            }

            // Attach role to user object
            var authedUser = {};
            for (var k in user) {
                if (user.hasOwnProperty(k)) authedUser[k] = user[k];
            }
            authedUser.role = role;
            return authedUser;

        } catch (error) {
            console.error('[Auth] Authorization failed:', error);
            window.location.href = AUTH_CONFIG.redirectUrl;
            return null;
        }
    }

    // =======================================================
    // 3. initApp — Global Entry Point for Protected Pages
    // =======================================================
    window.initApp = async function (requiredRoles) {
        requiredRoles = requiredRoles || [];
        var user = await requireAuth(requiredRoles);
        if (!user) {
            throw new Error('Unauthorized or Network Error');
        }
        return user;
    };

    // =======================================================
    // 4. Login
    // =======================================================
    async function login(email, password) {
        try {
            var client = getClient();
            if (!client) throw new Error('Supabase client not available');
            if (!checkNetwork()) return { success: false, error: 'Network offline' };

            var response = await client.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (response.error) throw response.error;

            var role = await getUserRole(response.data.user.id);

            if (typeof window.fetchUserPermissions === 'function') {
                await window.fetchUserPermissions(role);
            }

            return { success: true, user: response.data.user, role: role };
        } catch (error) {
            console.error('[Auth] Login error:', error);
            return { success: false, error: error.message };
        }
    }

    // =======================================================
    // 5. Get User Role (with 1 retry)
    // =======================================================
    async function getUserRole(userId) {
        var client = getClient();
        if (!client) return null;

        try {
            var result = await client
                .from('user_roles')
                .select('role')
                .eq('user_id', userId)
                .single();

            if (result.error) {
                // Retry once
                console.warn('[Auth] Role fetch failed, retrying...', result.error.message);
                await sleep(1000);
                var retry = await client.from('user_roles').select('role').eq('user_id', userId).single();
                if (retry.error) throw retry.error;
                return (retry.data && retry.data.role) || null;
            }

            return (result.data && result.data.role) || null;
        } catch (error) {
            console.error('[Auth] Error fetching user role:', error);
            return null;
        }
    }

    // =======================================================
    // 6. Logout
    // =======================================================
    async function logout() {
        try {
            var client = getClient();
            if (client) await client.auth.signOut();
        } catch (error) {
            console.error('[Auth] Logout error:', error);
        } finally {
            window.location.href = 'index.html';
        }
    }

    // =======================================================
    // 7. Session / User Getters
    // =======================================================
    async function getCurrentSession() {
        try {
            var client = getClient();
            if (!client) return null;
            var r = await client.auth.getSession();
            if (r.error) throw r.error;
            return r.data.session;
        } catch (error) {
            console.error('[Auth] Session error:', error);
            return null;
        }
    }

    async function getCurrentUser() {
        try {
            var client = getClient();
            if (!client) return null;

            var r = await client.auth.getUser();
            if (r.error || !r.data.user) return null;

            var role = await getUserRole(r.data.user.id);
            var u = {};
            for (var k in r.data.user) {
                if (r.data.user.hasOwnProperty(k)) u[k] = r.data.user[k];
            }
            u.role = role;
            return u;
        } catch (error) {
            return null;
        }
    }

    // =======================================================
    // 8. Role-Based Redirect
    // =======================================================
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
            console.error('[Auth] Unknown role:', role);
            var msg = 'Invalid user role. Please contact administrator.';
            if (typeof window.showError === 'function') {
                window.showError(msg);
            } else {
                alert(msg);
            }
        }
    }

    // =======================================================
    // 9. Check Existing Session (for login page)
    // =======================================================
    async function checkExistingSession() {
        var session = await getCurrentSession();
        if (session && session.user) {
            var role = await getUserRole(session.user.id);
            if (role) {
                redirectByRole(role);
                return true;
            }
        }
        return false;
    }

    // =======================================================
    // 10. Auth State Listener
    // =======================================================
    (function setupAuthListener() {
        var client = getClient();
        if (client && client.auth) {
            client.auth.onAuthStateChange(function (event) {
                if (event === 'SIGNED_OUT') {
                    if (window.location.href.indexOf('index.html') === -1) {
                        window.location.href = 'index.html';
                    }
                }
            });
        }
    })();

    // =======================================================
    // 11. Online / Offline Global Listeners
    // =======================================================
    window.addEventListener('offline', function () {
        console.warn('[Auth] Network went offline.');
        var msg = 'No Internet Connection. Waiting for network...';
        if (typeof window.showError === 'function') {
            window.showError(msg);
        }
    });

    window.addEventListener('online', function () {
        console.log('[Auth] Network restored.');
        // Trigger custom event that DataLoader and other modules can listen to
        window.dispatchEvent(new CustomEvent('app:online'));
    });

    // =======================================================
    // Expose to Global Scope
    // =======================================================
    window.requireAuth = requireAuth;
    window.login = login;
    window.logout = logout;
    window.getUserRole = getUserRole;
    window.redirectByRole = redirectByRole;
    window.checkExistingSession = checkExistingSession;
    window.getCurrentSession = getCurrentSession;
    window.getCurrentUser = getCurrentUser;
    window.checkNetwork = checkNetwork;

})();
