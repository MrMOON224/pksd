/**
 * Admin Dashboard - Product Management Module
 */

// Module Schema
window.PRODUCT_SCHEMA = [
    { id: 'code', label: 'Item Code', width: '8%', type: 'text' },
    { id: 'barcodes', label: 'Barcodes', width: '15%', type: 'tags' },
    { id: 'name', label: 'Description', width: '15%', type: 'text' },
    { id: 'category_id', label: 'Category', width: '10%', type: 'dropdown', ref: 'refCategories' },
    { id: 'subcategory_id', label: 'Sub-Category', width: '10%', type: 'dropdown', ref: 'refSubcategories', parent: 'category_id' },
    { id: 'brand_id', label: 'Brand', width: '8%', type: 'dropdown', ref: 'refBrands' },
    { id: 'cost', label: 'Cost', width: '7%', type: 'number' },
    { id: 'price', label: 'Price', width: '7%', type: 'number' },
    { id: 'margin', label: 'Margin %', width: '6%', type: 'readonly' },
    { id: 'unit_id', label: 'Unit', width: '8%', type: 'dropdown', ref: 'refUnits' },
    { id: 'supplier', label: 'Supplier', width: '8%', type: 'text' },
    { id: 'shop', label: 'Shop', width: '8%', type: 'text' },
    { id: 'stock', label: 'Stock', width: '6%', type: 'number' }
];

// Module State
window.productsData = [];
window.modifiedProducts = new Set();
window.deletedProducts = new Set();
window.selectedProductIds = new Set();

// --- Iframe Communication Bridge ---
window.addEventListener('message', function (event) {
    const { type, data, rowIdx, colId, value, rowData } = event.data;
    const iframe = document.getElementById('productGridIframe');
    if (!iframe || event.source !== iframe.contentWindow) return;

    if (type === 'CELL_UPDATE') {
        const product = rowData.id ? window.productsData.find(p => p.id === rowData.id) : null;

        if (product) {
            const fieldMap = {
                'desc': 'name',
                'category': 'category_id',
                'subCategory': 'subcategory_id',
                'qty': 'stock',
                'prices': 'price',
                'barcode': 'barcodes'
            };
            const field = fieldMap[colId] || colId;

            if (colId === 'barcode') {
                product.barcodes = value ? [value] : [];
            } else {
                product[field] = value;
            }

            window.modifiedProducts.add(product.id);
            window.updateSaveButton();
            window.saveProductDraft();
        }
    } else if (type === 'SYNC_REQUEST') {
        window.saveAllChanges();
    } else if (type === 'EXPORT_DATA') {
        window.processExportData(data);
    } else if (type === 'SELECTION_CHANGE') {
        window.selectedProductIds = new Set(event.data.selectedIds);
        // Update button text using ID
        const deleteBtn = document.getElementById('deleteProductBtn');
        if (deleteBtn) {
            const count = window.selectedProductIds.size;
            deleteBtn.innerHTML = count > 0 ? `<i class="fas fa-trash-alt"></i> Delete (${count})` : `<i class="fas fa-trash-alt"></i> Delete`;
            deleteBtn.disabled = count === 0;
        }
    }
});

/**
 * Local Storage Draft Helpers
 */
window.saveProductDraft = function () {
    try {
        if (window.modifiedProducts.size === 0 && window.deletedProducts.size === 0) {
            localStorage.removeItem('pos_draft_products');
            window.updateModuleSyncStatus('Products', 'Synced to Supabase');
            return;
        }

        const draft = {
            productsData: window.productsData,
            modifiedProducts: Array.from(window.modifiedProducts),
            deletedProducts: Array.from(window.deletedProducts),
            timestamp: Date.now()
        };
        localStorage.setItem('pos_draft_products', JSON.stringify(draft));
        window.updateModuleSyncStatus('Products', 'Unsaved Changes (Local)');
    } catch (e) {
        console.error('Failed to save product draft:', e);
    }
};

window.clearProductDraft = function () {
    localStorage.removeItem('pos_draft_products');
    window.updateModuleSyncStatus('Products', 'Synced to Supabase');
};

/**
 * Loading Products from Supabase
 */
window.loadProducts = function (forceRefresh) {
    forceRefresh = forceRefresh || false;
    var iframe = document.getElementById('productGridIframe');
    if (!document.getElementById('view-products')) return;

    window.updateModuleSyncStatus('Products', 'Loading...');

    // Check for local draft first
    if (!forceRefresh) {
        var localDraft = localStorage.getItem('pos_draft_products');
        if (localDraft) {
            try {
                var draft = JSON.parse(localDraft);
                var hasMods = (draft.modifiedProducts && draft.modifiedProducts.length > 0) ||
                    (draft.deletedProducts && draft.deletedProducts.length > 0);

                if (hasMods) {
                    if (confirm('You have unsaved product changes from a previous session. Would you like to resume?')) {
                        window.productsData = draft.productsData;
                        window.modifiedProducts = new Set(draft.modifiedProducts);
                        window.deletedProducts = new Set(draft.deletedProducts);
                        window.renderGrid();
                        window.updateSaveButton();
                        window.updateModuleSyncStatus('Products', 'Unsaved Changes (Local)');
                        return;
                    } else {
                        localStorage.removeItem('pos_draft_products');
                    }
                }
            } catch (e) {
                console.error('Error parsing product draft:', e);
            }
        }
    }

    // Use DataLoader if available
    if (typeof window.DataLoader !== 'undefined') {
        // Find the best container for loading UI (iframe grid or productsBody)
        var loadContainer = iframe ? null : 'productsBody';

        window.DataLoader.fetch({
            fetchFn: function () {
                return window.supabase
                    .from('products')
                    .select('*')
                    .order('created_at', { ascending: false });
            },
            containerId: loadContainer,
            maxRetries: 3,
            retryInterval: 2000,
            loadingMessage: 'Loading products...',
            errorMessage: 'Failed to load products. Check your connection and try again.',
            onSuccess: function (data) {
                window.productsData = data || [];
                window.modifiedProducts.clear();
                window.deletedProducts.clear();
                window.renderGrid();
                window.updateSaveButton();
                window.updateModuleSyncStatus('Products', 'Synced to Supabase');
            },
            onError: function (err) {
                console.error('Error loading products:', err);
                window.updateModuleSyncStatus('Products', 'Error: ' + (err.message || 'Unknown'));
            }
        });
    } else {
        // Fallback without DataLoader
        (async function () {
            try {
                var result = await window.supabase
                    .from('products')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (result.error) throw result.error;

                window.productsData = result.data || [];
                window.modifiedProducts.clear();
                window.deletedProducts.clear();
                window.renderGrid();
                window.updateSaveButton();
                window.updateModuleSyncStatus('Products', 'Synced to Supabase');
            } catch (error) {
                console.error('Error loading products:', error);
                window.updateModuleSyncStatus('Products', 'Error: ' + error.message);
            }
        })();
    }
};

/**
 * Grid Rendering (Iframe Bridge)
 */
window.renderGrid = function () {
    const iframe = document.getElementById('productGridIframe');
    if (!iframe || !iframe.contentWindow) {
        console.warn('Iframe not ready');
        return;
    }

    iframe.contentWindow.postMessage({
        type: 'LOAD_DATA',
        data: window.productsData,
        references: {
            categories: window.refCategories || [],
            subcategories: window.refSubcategories || [],
            brands: window.refBrands || [],
            units: window.refUnits || []
        }
    }, '*');
};

window.addNewRow = function () {
    const newProduct = {
        id: crypto.randomUUID(),
        code: '',
        name: '',
        barcodes: [],
        category_id: null,
        subcategory_id: null,
        brand_id: null,
        cost: 0,
        price: 0,
        unit_id: null,
        supplier: '',
        shop: 'Main Warehouse',
        stock: 0,
        isNew: true
    };

    window.productsData.unshift(newProduct);
    window.modifiedProducts.add(newProduct.id);
    window.renderGrid();
    window.updateSaveButton();
    window.saveProductDraft();

    // Focus the first cell of the new row in the iframe
    setTimeout(() => {
        const iframe = document.getElementById('productGridIframe');
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({
                type: 'FOCUS_CELL',
                data: {
                    rowIdx: 0,
                    colId: 'code'
                }
            }, '*');
        }
    }, 100);
};

/**
 * Barcode Handling
 */
window.handleAddBarcode = function (event, productId) {
    if (event.key === 'Enter') {
        const input = event.target;
        const value = input.value.trim();
        if (value) {
            const product = window.productsData.find(p => p.id.toString() === productId.toString());

            if (product) {
                if (!product.barcodes) product.barcodes = [];
                if (!product.barcodes.includes(value)) {
                    product.barcodes.push(value);

                    window.modifiedProducts.add(productId);
                    window.renderGrid();
                    window.updateSaveButton();
                    window.saveProductDraft();

                    // Refocus scan input
                    setTimeout(() => {
                        const container = document.getElementById('productsBody');
                        const row = container ? container.querySelector(`tr[data-id="${productId}"]`) : null;
                        if (row) {
                            const scan = row.querySelector('.barcode-scan');
                            if (scan) scan.focus();
                        }
                    }, 50);
                }
            }
        }
        input.value = '';
        event.preventDefault();
    }
};

window.removeBarcode = function (productId, barcode) {
    const product = window.productsData.find(p => p.id.toString() === productId.toString());

    if (product && product.barcodes) {
        product.barcodes = product.barcodes.filter(b => b !== barcode);

        window.modifiedProducts.add(productId);
        window.renderGrid();
        window.updateSaveButton();
        window.saveProductDraft();
    }
};

/**
 * Calculation Logic
 */
window.calculateMargin = function (input) {
    const row = input.closest('tr');
    const productId = row.dataset.id;
    const product = window.productsData.find(p => p.id.toString() === productId.toString());

    if (product) {
        product[input.name] = parseFloat(input.value) || 0;

        const cost = product.cost || 0;
        const price = product.price || 0;
        const marginInput = row.querySelector('input[name="margin"]');

        if (marginInput && cost > 0) {
            const m = ((price - cost) / cost) * 100;
            marginInput.value = m.toFixed(2) + '%';
        }

        window.markProductModified(input);
    }
};

/**
 * Event Handlers
 */
window.handleCategoryChange = function (select) {
    const row = select.closest('tr');
    const subSelect = row.querySelector('select[name="subcategory_id"]');
    const categoryId = select.value;
    const productId = row.dataset.id;

    window.markProductModified(select);

    const product = window.productsData.find(p => p.id.toString() === productId.toString());
    if (product) {
        product.category_id = categoryId || null;
        product.subcategory_id = null; // Reset subcat on cat change
    }

    // Update Sub-category dropdown
    const filteredSubs = categoryId
        ? window.refSubcategories.filter(s => s.category_id === categoryId)
        : [];

    subSelect.innerHTML = '<option value="">Sub-Category</option>' + filteredSubs.map(s =>
        `<option value="${s.id}">${window.escapeHtml(s.name)}</option>`
    ).join('');
    subSelect.value = "";
};

/**
 * Loading Products from Supabase
 */

window.deleteProductRow = function (btn) {
    const row = btn.closest('tr');
    const id = row.dataset.id;

    if (confirm('Are you sure you want to delete this product?')) {
        const product = window.productsData.find(p => p.id === id);
        if (product && !product.isNew) {
            window.deletedProducts.add(id);
        }
        window.modifiedProducts.delete(id);

        // Visual feedback or remove if new
        if (product && product.isNew) {
            window.productsData = window.productsData.filter(p => p.id !== id);
        } else {
            row.style.opacity = '0.3';
            row.style.pointerEvents = 'none';
        }

        window.updateSaveButton();
        window.updateSaveButton();
        window.saveProductDraft();
    }
};

window.deleteSelectedProducts = function () {
    if (window.selectedProductIds.size === 0) {
        alert('Please select products to delete.');
        return;
    }

    if (!confirm(`Are you sure you want to delete ${window.selectedProductIds.size} products?`)) return;

    window.selectedProductIds.forEach(id => {
        const idStr = String(id);
        const product = window.productsData.find(p => String(p.id) === idStr);
        if (product && !product.isNew) {
            window.deletedProducts.add(idStr);
        }
        window.modifiedProducts.delete(idStr);
    });

    // Update local data
    const selectedIds = new Set(Array.from(window.selectedProductIds).map(id => String(id)));
    window.productsData = window.productsData.filter(p => !selectedIds.has(String(p.id)));

    // Clear selection
    window.selectedProductIds.clear();

    // Update UI
    window.renderGrid();
    window.updateSaveButton();
    window.saveProductDraft();

    // Update button text using ID
    const deleteBtn = document.getElementById('deleteProductBtn');
    if (deleteBtn) {
        deleteBtn.innerHTML = `<i class="fas fa-trash-alt"></i> Delete`;
        deleteBtn.disabled = true;
    }
};

window.markProductModified = function (input) {
    const row = input.closest('tr');
    const productId = row.dataset.id;
    const product = window.productsData.find(p => p.id.toString() === productId.toString());

    if (!product) return;

    const field = input.name;
    let value = input.value;

    if (['cost', 'price', 'stock'].includes(field)) {
        value = parseFloat(value) || 0;
    } else if (value === "") {
        value = null;
    }

    if (field !== 'margin') {
        product[field] = value;
    }

    window.modifiedProducts.add(product.id);
    row.classList.add('modified');
    window.updateSaveButton();
    window.saveProductDraft();
};

window.updateSaveButton = function () {
    const btns = [document.getElementById('saveBtn'), document.getElementById('saveBtnBottom')].filter(b => b);
    const count = window.modifiedProducts.size + window.deletedProducts.size;
    const label = count > 0 ? `<i class="fas fa-save"></i> Save (${count})` : '<i class="fas fa-save"></i> Save Changes';

    btns.forEach(btn => {
        btn.innerHTML = label;
        if (count > 0) btn.classList.add('pulse');
        else btn.classList.remove('pulse');
    });
};

/**
 * Persistence Loop
 */
window.saveAllChanges = async function () {
    window.showLoading();

    try {
        // 1. Handle Deletions
        if (window.deletedProducts.size > 0) {
            const { error } = await window.supabase
                .from('products')
                .delete()
                .in('id', Array.from(window.deletedProducts));
            if (error) throw error;
        }

        // 2. Handle Upserts
        const upsertData = [];
        window.modifiedProducts.forEach(id => {
            if (window.deletedProducts.has(id)) return;
            const p = window.productsData.find(item => item.id === id);
            if (!p) return;

            upsertData.push({
                id: p.id,
                code: p.code,
                name: p.name,
                barcodes: p.barcodes || [],
                category_id: p.category_id,
                subcategory_id: p.subcategory_id,
                brand_id: p.brand_id,
                cost: p.cost,
                price: p.price,
                unit_id: p.unit_id,
                supplier: p.supplier,
                shop: p.shop,
                stock: p.stock
            });
        });

        if (upsertData.length > 0) {
            const { error } = await window.supabase.from('products').upsert(upsertData);
            if (error) throw error;
        }

        // 3. Post-save Cleanup
        const deletedArr = Array.from(window.deletedProducts);
        window.productsData = window.productsData.filter(p => !deletedArr.includes(p.id));
        window.productsData.forEach(p => p.isNew = false);

        window.modifiedProducts.clear();
        window.deletedProducts.clear();
        window.clearProductDraft();

        window.renderGrid();
        window.updateSaveButton();
        alert('Products saved successfully!');
    } catch (error) {
        console.error('Error saving products:', error);
        alert('Error saving products: ' + error.message);
    } finally {
        window.hideLoading();
    }
};

/**
 * Grid Navigation (A-la Excel)
 */
window.handleGridNavigation = function (event) {
    const key = event.key;
    const isArrow = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key);

    if (key === 'Enter' || isArrow) {
        // Skip if special context
        if (event.target.id === 'globalSearchInput') return;
        if (key === 'Enter' && event.target.classList.contains('barcode-scan') && event.target.value.trim() !== '') return;

        event.preventDefault();
        const inputs = Array.from(document.querySelectorAll('#productsBody .excel-input'));
        const currentIndex = inputs.indexOf(event.target);

        if (currentIndex === -1) return;

        let nextIndex = -1;
        const columns = 13; // Count based on inputs per row in renderGrid

        switch (key) {
            case 'Enter':
            case 'ArrowRight': nextIndex = currentIndex + 1; break;
            case 'ArrowLeft': nextIndex = currentIndex - 1; break;
            case 'ArrowUp': nextIndex = currentIndex - columns; break;
            case 'ArrowDown': nextIndex = currentIndex + columns; break;
        }

        if (nextIndex >= 0 && nextIndex < inputs.length) {
            inputs[nextIndex].focus();
            if (inputs[nextIndex].select) inputs[nextIndex].select();
        } else if (key === 'Enter' && nextIndex >= inputs.length) {
            window.addNewRow();
        }
    }
};

/**
     * Import/Export Integration
     */
window.exportToExcel = function () {
    const iframe = document.getElementById('productGridIframe');
    if (iframe && iframe.contentWindow) {
        window.updateModuleSyncStatus('Products', 'Preparing Export...');
        iframe.contentWindow.postMessage({ type: 'EXPORT_REQUEST' }, '*');
    }
};

window.processExportData = function (data) {
    if (!data || data.length === 0) {
        alert("No products to export.");
        return;
    }

    const headers = ['Item Code', 'Barcode', 'Description', 'Category', 'Sub-Category', 'Brand', 'Cost', 'Price', 'Unit Type', 'Stock'];
    const csvRows = [headers.join(',')];

    data.forEach(p => {
        const row = [
            `"${(p.code || '').replace(/"/g, '""')}"`,
            `"${(p.barcode || '').replace(/"/g, '""')}"`,
            `"${(p.desc || '').replace(/"/g, '""')}"`,
            `"${(p.category || '').replace(/"/g, '""')}"`,
            `"${(p.subCategory || '').replace(/"/g, '""')}"`,
            `"${(p.brand_id || '').replace(/"/g, '""')}"`,
            p.cost || 0,
            p.prices || 0,
            `"${(p.unit || '').replace(/"/g, '""')}"`,
            p.qty || 0
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
    window.updateModuleSyncStatus('Products', 'Export Complete');
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
        const lines = text.split('\n');
        const headers = lines[0].split(',');
        const importedData = [];

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const values = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            const p = {};
            p.id = crypto.randomUUID();
            p.code = (values[0] || '').replace(/"/g, '');
            p.barcode = (values[1] || '').replace(/"/g, '');
            p.desc = (values[2] || '').replace(/"/g, '');
            p.category = (values[3] || '').replace(/"/g, '');
            p.subCategory = (values[4] || '').replace(/"/g, '');
            p.brand_id = (values[5] || '').replace(/"/g, '');
            p.cost = parseFloat(values[6]) || 0;
            p.prices = parseFloat(values[7]) || 0;
            p.unit = (values[8] || '').replace(/"/g, '');
            p.qty = parseFloat(values[9]) || 0;
            importedData.push(p);
        }

        const iframe = document.getElementById('productGridIframe');
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({ type: 'IMPORT_DATA', data: importedData }, '*');
            alert(`Successfully imported ${importedData.length} products to the grid.`);
        }
    };
    reader.readAsText(file);
    input.value = '';
};
