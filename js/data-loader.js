// ============================================================
// DataLoader — Resilient Data Fetching Utility
// Retry logic, loading UI, error + retry button, offline detection.
//
// Usage:
//   DataLoader.fetch({
//     fetchFn: async () => supabase.from('products').select('*'),
//     containerId: 'productsBody',        // or null for page overlay
//     onSuccess: (data) => renderProducts(data),
//     loadingMessage: 'Loading products...'
//   });
// ============================================================

(function () {
    'use strict';

    // --- Default Config ---
    var DEFAULTS = {
        maxRetries: 3,
        retryInterval: 2000,
        loadingMessage: 'Loading data...',
        errorMessage: 'Failed to load data. Please try again.',
        offlineMessage: 'No Internet Connection. Waiting for network...'
    };

    // --- Inject CSS Once ---
    var cssInjected = false;
    function injectCSS() {
        if (cssInjected) return;
        cssInjected = true;

        var style = document.createElement('style');
        style.id = 'data-loader-styles';
        style.textContent = [
            '/* DataLoader Container Overlay */',
            '.dl-overlay {',
            '  display: flex;',
            '  flex-direction: column;',
            '  align-items: center;',
            '  justify-content: center;',
            '  padding: 48px 24px;',
            '  gap: 16px;',
            '  text-align: center;',
            '  min-height: 120px;',
            '  animation: dl-fade-in 0.3s ease;',
            '}',
            '@keyframes dl-fade-in {',
            '  from { opacity: 0; transform: translateY(8px); }',
            '  to   { opacity: 1; transform: translateY(0); }',
            '}',
            '',
            '/* Page-level fixed overlay (when no container is given) */',
            '.dl-page-overlay {',
            '  position: fixed;',
            '  top: 0; left: 0; right: 0; bottom: 0;',
            '  z-index: 9999;',
            '  background: rgba(15, 15, 20, 0.85);',
            '  backdrop-filter: blur(6px);',
            '  display: flex;',
            '  flex-direction: column;',
            '  align-items: center;',
            '  justify-content: center;',
            '  gap: 16px;',
            '  text-align: center;',
            '  animation: dl-fade-in 0.3s ease;',
            '}',
            '',
            '/* Spinner */',
            '.dl-spinner {',
            '  width: 36px;',
            '  height: 36px;',
            '  border: 3px solid rgba(255,255,255,0.1);',
            '  border-top-color: #818cf8;',
            '  border-radius: 50%;',
            '  animation: dl-spin 0.8s linear infinite;',
            '}',
            '@keyframes dl-spin {',
            '  to { transform: rotate(360deg); }',
            '}',
            '',
            '/* Message */',
            '.dl-message {',
            '  font-size: 0.9rem;',
            '  color: #94a3b8;',
            '  font-weight: 500;',
            '  max-width: 320px;',
            '}',
            '.dl-message.dl-error {',
            '  color: #f87171;',
            '}',
            '.dl-message.dl-offline {',
            '  color: #fbbf24;',
            '}',
            '',
            '/* Retry Button */',
            '.dl-retry-btn {',
            '  display: inline-flex;',
            '  align-items: center;',
            '  gap: 8px;',
            '  padding: 10px 24px;',
            '  background: rgba(79, 70, 229, 0.15);',
            '  color: #818cf8;',
            '  border: 1px solid rgba(79, 70, 229, 0.3);',
            '  border-radius: 999px;',
            '  font-size: 0.85rem;',
            '  font-weight: 600;',
            '  font-family: inherit;',
            '  cursor: pointer;',
            '  transition: all 0.2s ease;',
            '}',
            '.dl-retry-btn:hover {',
            '  background: rgba(79, 70, 229, 0.3);',
            '  transform: translateY(-1px);',
            '  box-shadow: 0 4px 16px rgba(79, 70, 229, 0.25);',
            '}',
            '.dl-retry-btn:active {',
            '  transform: translateY(0);',
            '}',
            '',
            '/* Attempt counter */',
            '.dl-attempt {',
            '  font-size: 0.75rem;',
            '  color: #64748b;',
            '  margin-top: -8px;',
            '}'
        ].join('\n');

        document.head.appendChild(style);
    }

    // --- Active fetch tracker (prevents race conditions) ---
    var activeFetches = {};
    var fetchCounter = 0;

    // --- "Warmed up" flag ---
    // After the first successful fetch, the DB is awake.
    // Subsequent fetches skip the loading overlay for instant feel.
    var warmedUp = false;

    // --- Core: DataLoader.fetch ---
    // KEY DESIGN: Show loading on first-ever fetch (cold start / DB sleeping).
    // After a successful fetch, mark as "warmed up" and skip loading on future clicks.
    // Retries and offline always show UI regardless.
    function dataLoaderFetch(options) {
        var fetchFn = options.fetchFn;
        var containerId = options.containerId || null;
        var onSuccess = options.onSuccess || function () { };
        var onError = options.onError || function () { };
        var maxRetries = options.maxRetries != null ? options.maxRetries : DEFAULTS.maxRetries;
        var retryInterval = options.retryInterval != null ? options.retryInterval : DEFAULTS.retryInterval;
        var loadingMessage = options.loadingMessage || DEFAULTS.loadingMessage;
        var errorMessage = options.errorMessage || DEFAULTS.errorMessage;

        // Inject CSS on first use
        injectCSS();

        // Generate a unique key for this fetch
        fetchCounter++;
        var fetchKey = containerId || ('__global_' + fetchCounter);
        var fetchId = fetchKey + '_' + Date.now();
        activeFetches[fetchKey] = fetchId;

        // Resolve target container (may be null)
        var container = containerId ? document.getElementById(containerId) : null;
        var usePageOverlay = !container;
        var pageOverlayEl = null;

        // Show loading on first attempt ONLY if not warmed up yet (cold start)
        if (!warmedUp) {
            if (usePageOverlay) {
                pageOverlayEl = createPageOverlay(loadingMessage);
            } else {
                showLoading(container, loadingMessage);
            }
        }

        // Start the fetch loop
        attemptFetch(0);

        function attemptFetch(attempt) {
            // Race condition guard
            if (activeFetches[fetchKey] !== fetchId) {
                console.log('[DataLoader] Stale fetch aborted for:', fetchKey);
                removePageOverlay(pageOverlayEl);
                return;
            }

            // Offline check — always show immediately (user needs to know)
            if (!navigator.onLine) {
                if (usePageOverlay) {
                    if (!pageOverlayEl) pageOverlayEl = createPageOverlay('');
                    updatePageOverlay(pageOverlayEl, 'offline');
                } else {
                    showOffline(container);
                }

                var onOnline = function () {
                    window.removeEventListener('online', onOnline);
                    if (activeFetches[fetchKey] !== fetchId) return;
                    // After coming back online, remove overlay and retry silently
                    removePageOverlay(pageOverlayEl);
                    pageOverlayEl = null;
                    if (container) clearUI(container);
                    attemptFetch(attempt);
                };
                window.addEventListener('online', onOnline);
                return;
            }

            // Show loading UI on retries (always) or first attempt (only if cold start)
            if (attempt > 0) {
                if (usePageOverlay) {
                    if (!pageOverlayEl) pageOverlayEl = createPageOverlay(loadingMessage);
                    updatePageOverlay(pageOverlayEl, 'loading', loadingMessage, attempt, maxRetries);
                } else {
                    showLoading(container, loadingMessage, attempt, maxRetries);
                }
            }

            // Execute the fetch
            fetchFn()
                .then(function (result) {
                    if (activeFetches[fetchKey] !== fetchId) return;

                    // Supabase returns { data, error }
                    if (result && result.error) {
                        throw result.error;
                    }

                    var data = result && result.data != null ? result.data : result;

                    // Success — DB is awake, mark as warmed up
                    warmedUp = true;
                    removePageOverlay(pageOverlayEl);
                    if (container) clearUI(container);
                    onSuccess(data);
                })
                .catch(function (err) {
                    if (activeFetches[fetchKey] !== fetchId) return;

                    console.warn('[DataLoader] Attempt ' + (attempt + 1) + '/' + maxRetries + ' failed:', err.message || err);

                    if (attempt + 1 < maxRetries) {
                        // Schedule retry — UI will show on next attemptFetch call
                        setTimeout(function () {
                            attemptFetch(attempt + 1);
                        }, retryInterval);
                    } else {
                        // All retries exhausted — show error + retry button
                        console.error('[DataLoader] All retries failed for:', fetchKey);
                        var retryCallback = function () {
                            dataLoaderFetch(options);
                        };
                        if (usePageOverlay) {
                            if (!pageOverlayEl) pageOverlayEl = createPageOverlay('');
                            updatePageOverlay(pageOverlayEl, 'error', errorMessage, null, null, retryCallback);
                        } else {
                            showError(container, errorMessage, retryCallback);
                        }
                        onError(err);
                    }
                });
        }
    }

    // --- Page Overlay Helpers ---

    function createPageOverlay(message) {
        var el = document.createElement('div');
        el.className = 'dl-page-overlay';
        el.innerHTML =
            '<div class="dl-spinner"></div>' +
            '<div class="dl-message">' + escapeHtml(message) + '</div>';
        document.body.appendChild(el);
        return el;
    }

    function updatePageOverlay(el, type, message, attempt, maxRetries, retryCallback) {
        if (!el || !el.parentNode) return;

        if (type === 'offline') {
            el.innerHTML =
                '<i class="fas fa-wifi" style="font-size: 2rem; color: #fbbf24; opacity: 0.7;"></i>' +
                '<div class="dl-message dl-offline">' + escapeHtml(DEFAULTS.offlineMessage) + '</div>' +
                '<div class="dl-spinner" style="border-top-color: #fbbf24;"></div>';
        } else if (type === 'error') {
            var btnId = 'dl-retry-page-' + Date.now();
            el.innerHTML =
                '<i class="fas fa-exclamation-triangle" style="font-size: 2rem; color: #f87171; opacity: 0.7;"></i>' +
                '<div class="dl-message dl-error">' + escapeHtml(message) + '</div>' +
                '<button class="dl-retry-btn" id="' + btnId + '">' +
                '<i class="fas fa-redo"></i> Retry' +
                '</button>';
            var btn = document.getElementById(btnId);
            if (btn && retryCallback) {
                btn.addEventListener('click', function () {
                    removePageOverlay(el);
                    retryCallback();
                });
            }
        } else {
            // loading
            var html =
                '<div class="dl-spinner"></div>' +
                '<div class="dl-message">' + escapeHtml(message) + '</div>';
            if (attempt != null && maxRetries != null) {
                html += '<div class="dl-attempt">Retry ' + attempt + ' of ' + maxRetries + '</div>';
            }
            el.innerHTML = html;
        }
    }

    function removePageOverlay(el) {
        if (el && el.parentNode) {
            el.style.opacity = '0';
            el.style.transition = 'opacity 0.2s ease';
            setTimeout(function () {
                if (el.parentNode) el.parentNode.removeChild(el);
            }, 200);
        }
    }

    // --- Container UI Helpers ---

    function showLoading(container, message, attempt, maxRetries) {
        var html = '<div class="dl-overlay">' +
            '<div class="dl-spinner"></div>' +
            '<div class="dl-message">' + escapeHtml(message) + '</div>';

        if (attempt != null && maxRetries != null) {
            html += '<div class="dl-attempt">Retry ' + attempt + ' of ' + maxRetries + '</div>';
        }

        html += '</div>';

        if (container.tagName === 'TBODY') {
            var colSpan = getColSpan(container);
            container.innerHTML = '<tr><td colspan="' + colSpan + '">' + html + '</td></tr>';
        } else {
            container.innerHTML = html;
        }
    }

    function showOffline(container) {
        var html = '<div class="dl-overlay">' +
            '<i class="fas fa-wifi" style="font-size: 2rem; color: #fbbf24; opacity: 0.7;"></i>' +
            '<div class="dl-message dl-offline">' + escapeHtml(DEFAULTS.offlineMessage) + '</div>' +
            '<div class="dl-spinner" style="border-top-color: #fbbf24;"></div>' +
            '</div>';

        if (container.tagName === 'TBODY') {
            var colSpan = getColSpan(container);
            container.innerHTML = '<tr><td colspan="' + colSpan + '">' + html + '</td></tr>';
        } else {
            container.innerHTML = html;
        }
    }

    function showError(container, message, retryCallback) {
        var btnId = 'dl-retry-' + (container.id || Date.now());
        var html = '<div class="dl-overlay">' +
            '<i class="fas fa-exclamation-triangle" style="font-size: 2rem; color: #f87171; opacity: 0.7;"></i>' +
            '<div class="dl-message dl-error">' + escapeHtml(message) + '</div>' +
            '<button class="dl-retry-btn" id="' + btnId + '">' +
            '<i class="fas fa-redo"></i> Retry' +
            '</button>' +
            '</div>';

        if (container.tagName === 'TBODY') {
            var colSpan = getColSpan(container);
            container.innerHTML = '<tr><td colspan="' + colSpan + '">' + html + '</td></tr>';
        } else {
            container.innerHTML = html;
        }

        var btn = document.getElementById(btnId);
        if (btn && retryCallback) {
            btn.addEventListener('click', function () {
                retryCallback();
            });
        }
    }

    function clearUI(container) {
        var overlay = container.querySelector('.dl-overlay');
        if (overlay) {
            if (container.tagName === 'TBODY') {
                container.innerHTML = '';
            } else {
                overlay.remove();
            }
        }
    }

    function getColSpan(tbody) {
        var table = tbody.closest('table');
        if (table) {
            var headerRow = table.querySelector('thead tr');
            if (headerRow) return headerRow.children.length;
        }
        return 10;
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // --- Expose Globally ---
    window.DataLoader = {
        fetch: dataLoaderFetch
    };

})();
