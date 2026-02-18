/**
 * Admin Dashboard - Settings & Configuration Module
 * (Legacy Brands and Units logic removed - now in brands.js and units.js)
 */

// --- Stock Adjustments ---
// Legacy logic removed. Adjustments are now handled via adjustment.html iframe.

/**
 * Global Bulk Delete (Legacy)
 * Keeping as a general template or for other modules if needed by admin-dashboard.html
 */
window.executeBulkDelete = async function (ids) {
    if (!ids || ids.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${ids.length} selected items?`)) return;

    if (typeof window.showLoading === 'function') window.showLoading();
    try {
        let table = '';
        // Note: active table determination depends on which view is active
        // This function is largely redundant now that modules are independent iframes.
        console.warn('executeBulkDelete called on legacy admin-settings.js. Each module should handle its own bulk delete now.');
    } catch (e) {
        console.error('Bulk delete error:', e);
        alert('Failed to delete items: ' + e.message);
    } finally {
        if (typeof window.hideLoading === 'function') window.hideLoading();
    }
};
