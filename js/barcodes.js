/**
 * Admin Dashboard - Barcode Printing Module
 */

window.barcodeQueue = [];

window.searchProductsForBarcode = function (query) {
    const resultsDiv = document.getElementById('barcodeSearchResults');
    if (!resultsDiv) return;

    if (!query || query.length < 2) {
        resultsDiv.innerHTML = '';
        resultsDiv.classList.add('hidden');
        return;
    }

    const q = query.toLowerCase();
    if (!window.productsData) return;

    const filtered = window.productsData.filter(p =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.item_code || '').toLowerCase().includes(q) ||
        (p.barcodes || []).some(bc => bc.toLowerCase().includes(q))
    ).slice(0, 10);

    if (filtered.length === 0) {
        resultsDiv.innerHTML = '<div class="search-result-item">No products found</div>';
    } else {
        resultsDiv.innerHTML = filtered.map(p => `
            <div class="search-result-item" onclick="addToBarcodeQueue('${p.id}')">
                <div>
                    <div class="search-result-name">${window.escapeHtml(p.name)}</div>
                    <div class="search-result-code">${window.escapeHtml(p.item_code || 'No Code')}</div>
                </div>
                <i class="fas fa-plus-circle text-primary"></i>
            </div>
        `).join('');
    }
    resultsDiv.classList.remove('hidden');
};

window.addToBarcodeQueue = function (productId) {
    if (!window.productsData) return;
    const product = window.productsData.find(p => p.id.toString() === productId.toString());
    if (!product) return;

    // Check if already in queue
    const existing = window.barcodeQueue.find(item => item.id.toString() === productId.toString());
    if (existing) {
        existing.quantity++;
    } else {
        window.barcodeQueue.push({
            id: product.id,
            name: product.name,
            brand: window.getBrandName(product.brand_id) || 'N/A',
            price: product.price || 0,
            barcode: product.barcodes && product.barcodes.length > 0 ? product.barcodes[0] : 'NO BARCODE',
            quantity: 1
        });
    }

    // Clear search
    const searchInput = document.getElementById('barcodeProductSearch');
    if (searchInput) searchInput.value = '';

    const resultsDiv = document.getElementById('barcodeSearchResults');
    if (resultsDiv) {
        resultsDiv.innerHTML = '';
        resultsDiv.classList.add('hidden');
    }

    window.renderBarcodeQueue();
};

window.removeFromBarcodeQueue = function (index) {
    window.barcodeQueue.splice(index, 1);
    window.renderBarcodeQueue();
};

window.updateBarcodeQuantity = function (index, val) {
    if (window.barcodeQueue[index]) {
        window.barcodeQueue[index].quantity = parseInt(val) || 1;
    }
};

window.clearBarcodeQueue = function () {
    if (confirm('Clear the print queue?')) {
        window.barcodeQueue = [];
        window.renderBarcodeQueue();
    }
};

window.renderBarcodeQueue = function () {
    const tbody = document.getElementById('barcodeQueueBody');
    if (!tbody) return;

    if (window.barcodeQueue.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted" style="padding: 40px;">
                    <i class="fas fa-barcode fa-3x mb-md" style="opacity: 0.2;"></i>
                    <p>No products added to print queue yet.</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = window.barcodeQueue.map((item, index) => `
        <tr class="excel-tr">
            <td>${index + 1}</td>
            <td>
                <div style="font-weight: 600;">${window.escapeHtml(item.name)}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">${window.escapeHtml(item.brand)} | $${parseFloat(item.price).toFixed(2)}</div>
            </td>
            <td><code style="background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px;">${window.escapeHtml(item.barcode)}</code></td>
            <td>
                <input type="number" class="excel-input" value="${item.quantity}" min="1" onchange="updateBarcodeQuantity(${index}, this.value)">
            </td>
            <td class="action-cell">
                <button class="btn-icon" onclick="removeFromBarcodeQueue(${index})"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
};

window.closeBarcodePreview = function () {
    const modal = document.getElementById('barcodePreviewModal');
    if (modal) modal.classList.add('hidden');
};

window.previewBarcodes = function () {
    if (window.barcodeQueue.length === 0) {
        alert('Add at least one product to the queue.');
        return;
    }

    const colsInput = document.getElementById('labelCols');
    const cols = colsInput ? (parseInt(colsInput.value) || 4) : 4;

    const widthInput = document.getElementById('labelWidth');
    const widthMatch = widthInput ? widthInput.value : '40';

    const heightInput = document.getElementById('labelHeight');
    const heightMatch = heightInput ? heightInput.value : '25';

    // Render labels to both preview and printing container
    const previewDisplay = document.getElementById('barcodePreviewDisplay');
    const printContainer = document.getElementById('print-label-container');

    if (!previewDisplay || !printContainer) return;

    [previewDisplay, printContainer].forEach(container => {
        container.innerHTML = '';
        container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        container.style.width = (cols * widthMatch) + 'mm';

        window.barcodeQueue.forEach((item, idx) => {
            for (let i = 0; i < item.quantity; i++) {
                const label = document.createElement('div');
                label.className = 'barcode-label';
                label.style.width = widthMatch + 'mm';
                label.style.height = heightMatch + 'mm';

                const labelId = `bc-${idx}-${i}-${container.id.startsWith('print') ? 'p' : 'v'}`;

                label.innerHTML = `
                    <div class="label-brand">${window.escapeHtml(item.brand)}</div>
                    <div class="label-name">${window.escapeHtml(item.name)}</div>
                    <svg id="${labelId}" class="label-barcode-svg"></svg>
                    <div class="label-footer">
                        <span class="label-code">${window.escapeHtml(item.barcode)}</span>
                        <span class="label-price">$${parseFloat(item.price).toFixed(2)}</span>
                    </div>
                `;
                container.appendChild(label);

                // Use JsBarcode to generate the real barcode
                setTimeout(() => {
                    if (typeof JsBarcode === 'function') {
                        JsBarcode(`#${labelId}`, item.barcode, {
                            format: "CODE128",
                            width: 1,
                            height: 30,
                            displayValue: false,
                            margin: 0
                        });
                    }
                }, 0);
            }
        });
    });

    document.getElementById('barcodePreviewModal').classList.remove('hidden');
};
