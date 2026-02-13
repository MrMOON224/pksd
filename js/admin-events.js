/**
 * Admin Dashboard - Events, Navigation & UI Interactions Module
 */

window.selectedItemIndex = -1;

window.setupKeybinds = function () {
    document.addEventListener('keydown', function (e) {
        const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT';

        // Global Shortcuts (Even in Inputs)
        // Ctrl + / or Ctrl + F to focus search
        if ((e.ctrlKey && e.key === '/') || (e.ctrlKey && e.key === 'f')) {
            e.preventDefault();
            const search = document.getElementById('globalSearchInput');
            if (search) search.focus();
            return;
        }

        // Ctrl + S to save
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            const urlParams = new URLSearchParams(window.location.search);
            const view = urlParams.get('view');
            if (view === 'products' || !view) { if (typeof window.saveAllChanges === 'function') window.saveAllChanges(); }
            else if (view === 'categories') { if (typeof window.saveCategoryChanges === 'function') window.saveCategoryChanges(); }
            else if (view === 'brands') { if (typeof window.saveBrandChanges === 'function') window.saveBrandChanges(); }
            else if (view === 'units') { if (typeof window.saveUnitChanges === 'function') window.saveUnitChanges(); }
            else if (view === 'variations') { if (typeof window.saveVariationChanges === 'function') window.saveVariationChanges(); }
            else if (view === 'purchase-add') { if (typeof window.savePurchase === 'function') window.savePurchase(); }
            return;
        }

        // Alt + N to Add New Item
        if (e.altKey && e.key === 'n') {
            e.preventDefault();
            const urlParams = new URLSearchParams(window.location.search);
            const view = urlParams.get('view');
            if (view === 'products' || !view) { if (typeof window.addNewRow === 'function') window.addNewRow(); }
            else if (view === 'purchase-list') { if (typeof window.switchView === 'function') window.switchView('purchase-add'); }
            else if (view === 'purchase-add') {
                const dateInput = document.getElementById('purchaseAddDate');
                if (dateInput) dateInput.focus();
            }
            return;
        }

        // Help Modal (?) - Only if NOT in input
        if (!isInput) {
            if (e.key === '?' || (e.shiftKey && e.key === '?')) {
                e.preventDefault();
                window.openShortcutsModal();
                return;
            }
        }

        // Esc
        if (e.key === 'Escape') {
            const shortcutsModal = document.getElementById('shortcutsModal');
            if (shortcutsModal && !shortcutsModal.classList.contains('hidden')) {
                window.closeShortcutsModal();
                return;
            }
            const barcodePreviewModal = document.getElementById('barcodePreviewModal');
            if (barcodePreviewModal && !barcodePreviewModal.classList.contains('hidden')) {
                if (typeof window.closeBarcodePreview === 'function') window.closeBarcodePreview();
                return;
            }
            if (isInput) {
                e.target.blur();
                return;
            }
            // Clear list selection
            if (window.selectedItemIndex !== -1) {
                const rows = document.querySelectorAll('.stacked-row.active, .excel-tr.active');
                rows.forEach(r => r.classList.remove('active'));
                window.selectedItemIndex = -1;
            }
        }

        // Input Navigation (Excel-like)
        if (isInput) {
            if (['Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                window.handleInputNavigation(e);
            }
            return;
        }

        // Navigation (List Arrows) - Only if NOT in input
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            window.navigateList(e.key === 'ArrowDown' ? 1 : -1);
        }

        // Action (List Enter) - Only if NOT in input
        if (e.key === 'Enter') {
            if (window.selectedItemIndex !== -1) {
                e.preventDefault();
                window.handleEnterOnList();
            }
        }
    });
};

window.handleInputNavigation = function (e) {
    const current = e.target;
    const allInputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])'));

    // Filter to ensure they are visible
    const visibleInputs = allInputs.filter(el => el.offsetParent !== null);
    const currentIndex = visibleInputs.indexOf(current);

    if (currentIndex === -1) return;

    let nextIndex = currentIndex;

    // Enter or Right Arrow -> Next Field
    if (e.key === 'Enter' || e.key === 'ArrowRight') {
        e.preventDefault();
        nextIndex = currentIndex + 1;
    }
    // Left Arrow -> Previous Field
    else if (e.key === 'ArrowLeft') {
        if (current.selectionStart === 0 && current.selectionEnd === 0) { // Only if at start of text
            e.preventDefault();
            nextIndex = currentIndex - 1;
        } else if (e.target.tagName === 'SELECT') { // Selects don't have cursor
            e.preventDefault();
            nextIndex = currentIndex - 1;
        } else {
            return; // Let user move cursor in text
        }
    }
    // Up / Down Arrow -> Geometric/Grid Navigation
    else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        const direction = e.key === 'ArrowDown' ? 1 : -1;

        // Check if we are in a row-based structure
        const row = current.closest('.stacked-row, .excel-tr');
        if (row) {
            e.preventDefault();
            // Grid Navigation Logic
            const inputsInRow = Array.from(row.querySelectorAll('input:not([type="hidden"]), select, textarea'));
            const colIndex = inputsInRow.indexOf(current);

            // Find sibling row
            let siblingRow = direction === 1 ? row.nextElementSibling : row.previousElementSibling;

            // Skip non-item rows if necessary (e.g. headers)
            while (siblingRow && !siblingRow.matches('.stacked-row, .excel-tr')) {
                siblingRow = direction === 1 ? siblingRow.nextElementSibling : siblingRow.previousElementSibling;
            }

            if (siblingRow) {
                const siblingInputs = Array.from(siblingRow.querySelectorAll('input:not([type="hidden"]), select, textarea'));
                // Try to find input at same index, or closest
                if (siblingInputs[colIndex]) {
                    siblingInputs[colIndex].focus();
                    if (siblingInputs[colIndex].select) siblingInputs[colIndex].select();
                    return;
                }
            } else {
                nextIndex = currentIndex + direction;
            }
        } else {
            if (current.type === 'number' || current.tagName === 'SELECT') return;
            e.preventDefault();
            nextIndex = currentIndex + direction;
        }
    }

    // Boundary checks
    if (nextIndex >= 0 && nextIndex < visibleInputs.length) {
        const target = visibleInputs[nextIndex];
        target.focus();
        if (target.select) target.select();
    }
};

window.navigateList = function (direction) {
    const rows = Array.from(document.querySelectorAll('.stacked-row, .excel-tr'));
    const visibleRows = rows.filter(r => r.offsetParent !== null && !r.closest('thead'));

    if (visibleRows.length === 0) return;

    window.selectedItemIndex += direction;
    if (window.selectedItemIndex < 0) window.selectedItemIndex = 0;
    if (window.selectedItemIndex >= visibleRows.length) window.selectedItemIndex = visibleRows.length - 1;

    visibleRows.forEach(r => r.classList.remove('active'));

    const selected = visibleRows[window.selectedItemIndex];
    if (selected) {
        selected.classList.add('active');
        selected.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
};

window.handleEnterOnList = function () {
    const rows = Array.from(document.querySelectorAll('.stacked-row, .excel-tr'));
    const visibleRows = rows.filter(r => r.offsetParent !== null && !r.closest('thead'));
    const selected = visibleRows[window.selectedItemIndex];

    if (!selected) return;

    const editBtn = selected.querySelector('.fa-edit')?.closest('button');
    const viewBtn = selected.querySelector('.fa-eye')?.closest('button');

    if (editBtn) editBtn.click();
    else if (viewBtn) viewBtn.click();
};

window.openShortcutsModal = function () {
    const modal = document.getElementById('shortcutsModal');
    if (modal) modal.classList.remove('hidden');
};

window.closeShortcutsModal = function () {
    const modal = document.getElementById('shortcutsModal');
    if (modal) modal.classList.add('hidden');
};

window.setupGlobalSearch = function () {
    const searchInput = document.getElementById('globalSearchInput');
    if (!searchInput) return;

    searchInput.addEventListener('input', function (e) {
        const query = e.target.value;
        const urlParams = new URL(window.location).searchParams;
        const currentView = urlParams.get('view');

        if (currentView === 'products' || !currentView) {
            if (typeof window.filterProducts === 'function') window.filterProducts(query);
        }
    });
};

window.filterProducts = function (query) {
    const q = query.toLowerCase();
    const rows = document.querySelectorAll('.stacked-row');
    if (!window.productsData) return;

    rows.forEach(row => {
        const id = row.dataset.id;
        const product = window.productsData.find(p => p.id.toString() === id.toString());
        if (product) {
            const matches =
                (product.name || '').toLowerCase().includes(q) ||
                (product.item_code || '').toLowerCase().includes(q) ||
                (product.barcodes || []).some(bc => bc.toLowerCase().includes(q));

            row.style.display = matches ? '' : 'none';
        }
    });
};

window.exportToExcel = function () {
    if (!window.productsData || window.productsData.length === 0) {
        alert("No products to export.");
        return;
    }

    const headers = ['Item Code', 'Barcodes', 'Description', 'Category', 'Sub-Category', 'Brand', 'Cost', 'Price', 'Margin %', 'Unit Type (pcs/box)', 'Supplier', 'Shop', 'Stock'];
    const csvRows = [headers.join(',')];

    window.productsData.forEach(p => {
        let margin = 0;
        if (p.price && p.cost && p.cost > 0) {
            margin = ((p.price - p.cost) / p.cost) * 100;
        }

        const row = [
            `"${(p.item_code || '').replace(/"/g, '""')}"`,
            `"${(p.barcodes || []).join('; ').replace(/"/g, '""')}"`,
            `"${(p.name || '').replace(/"/g, '""')}"`,
            `"${(window.getCategoryName ? window.getCategoryName(p.category_id) : '').replace(/"/g, '""')}"`,
            `"${(window.getSubcategoryName ? window.getSubcategoryName(p.subcategory_id) : '').replace(/"/g, '""')}"`,
            `"${(window.getBrandName ? window.getBrandName(p.brand_id) : '').replace(/"/g, '""')}"`,
            p.cost || 0,
            p.price || 0,
            margin.toFixed(2),
            p.pcs_per_box || 1,
            `"${(p.supplier || '').replace(/"/g, '""')}"`,
            `"${(p.shop || '').replace(/"/g, '""')}"`,
            p.stock || 0
        ];
        csvRows.push(row.join(','));
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "products_export_" + new Date().toISOString().split('T')[0] + ".csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

window.openExcelImport = function () {
    const input = document.getElementById('excelInput');
    if (input) input.click();
};

window.handleExcelImport = function (input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const text = e.target.result;
        alert("Import feature is currently in CSV mode.\nReceived " + text.length + " bytes.\nFull parsing logic coming in next update.");
        console.log("CSV Content:", text.substring(0, 200) + "...");
    };
    reader.readAsText(file);
    input.value = '';
};

window.setupDoubleTouchEditing = function () {
    const lockInput = (el) => {
        if (el.tagName === 'SELECT') {
            if (el.tomselect) el.tomselect.lock();
        } else {
            el.setAttribute('readonly', 'true');
        }
        el.classList.add('touch-locked');
    };

    const unlockInput = (el) => {
        if (el.tagName === 'SELECT') {
            if (el.tomselect) {
                el.tomselect.unlock();
                setTimeout(() => el.tomselect.open(), 50);
            }
        } else {
            el.removeAttribute('readonly');
        }
        el.classList.remove('touch-locked');
        el.focus();
    };

    window.unlockTouchInput = unlockInput;

    window.applyTouchLocks = () => {
        document.querySelectorAll('.excel-input').forEach(el => {
            if (!el.dataset.touchInit) {
                lockInput(el);
                el.dataset.touchInit = 'true';
            }
        });
    };

    let lastTap = 0;
    let lastTarget = null;

    document.addEventListener('click', function (e) {
        let target = e.target.closest('.excel-input');
        let isTomSelect = false;

        if (!target) {
            const tsWrapper = e.target.closest('.ts-wrapper');
            if (tsWrapper && tsWrapper.classList.contains('excel-input')) {
                const parent = tsWrapper.parentElement;
                if (parent) {
                    target = parent.querySelector('select');
                    isTomSelect = true;
                }
            }
        }

        if (!target) return;
        if (!target.classList.contains('touch-locked')) return;

        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        const isDoubleTap = tapLength < 500 && tapLength > 0;

        if (isDoubleTap && (target === lastTarget || (isTomSelect && lastTarget && lastTarget.closest('.ts-wrapper')))) {
            e.preventDefault();
            e.stopPropagation();
            unlockInput(target);
            lastTap = 0;
            lastTarget = null;
        } else {
            if (target.tagName === 'SELECT' || target.classList.contains('ts-wrapper')) {
                e.preventDefault();
                e.stopPropagation();
            }
            lastTarget = target;
            lastTap = currentTime;
        }
    }, true);

    document.addEventListener('focusout', function (e) {
        setTimeout(() => {
            const active = document.activeElement;
            if (active && (active.classList.contains('excel-input') || active.closest('.excel-input'))) return;

            document.querySelectorAll('.excel-input:not(.touch-locked)').forEach(el => {
                if (el !== active && !el.contains(active)) {
                    if (el.tomselect && el.tomselect.wrapper.contains(active)) return;
                    lockInput(el);
                }
            });
        }, 200);
    });

    window.applyTouchLocks();
};

window.toggleFullscreen = function () {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable full-screen mode: ${err.message}`);
        });
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
    }
};

// --- Sidebar Sync ---
window.setupSidebar = function () {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    if (menuToggle && sidebar && sidebarOverlay) {
        menuToggle.addEventListener('click', function () {
            sidebar.classList.toggle('active');
            sidebarOverlay.classList.toggle('active');
        });

        sidebarOverlay.addEventListener('click', function () {
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        });
    }

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            if (sidebar && sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
                if (sidebarOverlay) sidebarOverlay.classList.remove('active');
            }
        });
    });

    document.querySelectorAll('.dropdown-toggle').forEach(button => {
        button.addEventListener('click', () => {
            const currentSubmenu = button.nextElementSibling;
            const isOpen = currentSubmenu.classList.contains('show');
            document.querySelectorAll('.submenu').forEach(sub => sub.classList.remove('show'));
            document.querySelectorAll('.dropdown-toggle').forEach(btn => btn.classList.remove('active'));
            if (!isOpen) {
                currentSubmenu.classList.add('show');
                button.classList.add('active');
            }
        });
    });
};
