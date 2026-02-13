/**
 * Admin Dashboard - Purchases & Returns Module
 */

window.purchaseItems = [];
window.returnItems = [];

window.searchProductsForPurchase = function (input) {
    const query = input.value.toLowerCase();
    const dropdown = document.getElementById('purchaseSearchDropdown');
    if (!dropdown) return;
    if (query.length < 2) {
        dropdown.classList.add('hidden');
        return;
    }

    if (!window.productsData) return;

    const results = window.productsData.filter(p =>
        (p.name || '').toLowerCase().includes(query) ||
        (p.item_code || '').toLowerCase().includes(query)
    ).slice(0, 10);

    if (results.length > 0) {
        dropdown.innerHTML = '';
        results.forEach(p => {
            const item = document.createElement('div');
            item.className = 'search-result-item';
            item.innerHTML = `
                <div class="search-result-name">${window.escapeHtml(p.name)}</div>
                <div class="search-result-code">${window.escapeHtml(p.item_code)}</div>
            `;
            item.onclick = () => {
                window.addProductToPurchase(p);
                input.value = '';
                dropdown.classList.add('hidden');
            };
            dropdown.appendChild(item);
        });
        dropdown.classList.remove('hidden');
    } else {
        dropdown.classList.add('hidden');
    }
};

window.addProductToPurchase = function (product) {
    // Check if already in list
    const existing = window.purchaseItems.find(item => item.product_id === product.id);
    if (existing) {
        existing.quantity++;
    } else {
        window.purchaseItems.push({
            product_id: product.id,
            product_name: product.name,
            unit_cost: product.cost || 0,
            stock: product.stock || 0,
            unit: window.getUnitName(product.unit_id),
            pcs_per_box: product.pcs_per_box || 1,
            quantity: 1,
            discount: 0,
            tax: 0,
            subtotal: product.cost || 0
        });
    }
    window.renderPurchaseItems();
    window.calculatePurchaseTotals();
};

window.renderPurchaseItems = function () {
    const body = document.getElementById('purchaseAddItemsBody');
    if (!body) return;
    body.innerHTML = '';

    if (window.purchaseItems.length === 0) {
        body.innerHTML = `
            <div class="text-center text-muted" style="padding: 40px; background: var(--bg-secondary); border-radius: var(--radius-md);">
                <i class="fas fa-shopping-cart fa-3x mb-md" style="opacity: 0.2;"></i>
                <p>No products added. Use the search bar above to add items.</p>
            </div>
        `;
        return;
    }

    window.purchaseItems.forEach((item, index) => {
        const container = document.createElement('div');
        container.className = 'stacked-row fade-in';

        const totalPcs = item.quantity * (item.pcs_per_box || 1);
        const showBoxInfo = item.pcs_per_box > 1;

        container.innerHTML = `
            <div class="stacked-line">
                <div class="grid-field" style="flex: 2;">
                    <span class="field-label">Product</span>
                    <div style="padding: 10px 12px; font-weight: 600; color: var(--primary-light);">${window.escapeHtml(item.product_name)}</div>
                </div>
                <div class="grid-field" style="flex: 0.2; min-width: 50px; border-right: none; align-items: center; justify-content: center;">
                    <button class="btn-icon" onclick="removePurchaseItem(${index})" style="color: var(--error);"><i class="fas fa-trash-alt"></i></button>
                </div>
            </div>
            <div class="stacked-line" style="background: rgba(255,255,255,0.02);">
                <div class="grid-field">
                    <span class="field-label">Net Unit Cost (Ks)</span>
                    <input type="number" class="excel-input" value="${item.unit_cost}" oninput="updatePurchaseItem(${index}, 'unit_cost', this.value)">
                </div>
                <div class="grid-field" style="flex: 0.5; min-width: 80px;">
                    <span class="field-label">Current Stock</span>
                    <div style="padding: 10px 12px; color: var(--text-muted);">${item.stock}</div>
                </div>
                <div class="grid-field" style="flex: 0.5; min-width: 80px;">
                    <span class="field-label">Unit</span>
                    <div style="padding: 10px 12px; color: var(--text-muted);">${window.escapeHtml(item.unit)}</div>
                </div>
                ${showBoxInfo ? `
                <div class="grid-field" style="flex: 0.5; background: rgba(16, 185, 129, 0.05);">
                    <span class="field-label" style="color: #10b981;">Pcs/Box</span>
                    <div style="padding: 10px 12px; font-weight: 700;">${item.pcs_per_box}</div>
                </div>
                ` : ''}
                <div class="grid-field">
                    <span class="field-label">Order Qty (Boxes/Pcs)</span>
                    <input type="number" class="excel-input" value="${item.quantity}" oninput="updatePurchaseItem(${index}, 'quantity', this.value)">
                </div>
                ${showBoxInfo ? `
                <div class="grid-field" style="background: rgba(16, 185, 129, 0.05); flex: 0.7;">
                    <span class="field-label" style="color: #10b981;">Total Pcs Received</span>
                    <div style="padding: 10px 12px; font-weight: 700; color: #10b981;">${totalPcs} Pcs</div>
                </div>
                ` : ''}
            </div>
            <div class="stacked-line border-none">
                <div class="grid-field">
                    <span class="field-label">Discount (Ks)</span>
                    <input type="number" class="excel-input" value="${item.discount}" oninput="updatePurchaseItem(${index}, 'discount', this.value)">
                </div>
                <div class="grid-field">
                    <span class="field-label">Tax (%)</span>
                    <input type="number" class="excel-input" value="${item.tax}" oninput="updatePurchaseItem(${index}, 'tax', this.value)">
                </div>
                <div class="grid-field" style="background: rgba(99, 102, 241, 0.05);">
                    <span class="field-label" style="color: var(--primary-light);">Subtotal</span>
                    <div style="padding: 10px 12px; font-weight: 900; color: var(--primary-light); font-size: 1.1rem;">
                        <span id="subtotal-${index}">${item.subtotal.toFixed(2)}</span> Ks
                    </div>
                </div>
            </div>
        `;
        body.appendChild(container);
    });
};

window.updatePurchaseItem = function (index, field, value) {
    const item = window.purchaseItems[index];
    item[field] = parseFloat(value) || 0;

    // Calculate item subtotal
    const baseAmount = item.unit_cost * item.quantity;
    const discounted = baseAmount - item.discount;
    const taxed = discounted * (1 + (item.tax / 100));
    item.subtotal = taxed;

    const el = document.getElementById(`subtotal-${index}`);
    if (el) el.textContent = item.subtotal.toFixed(2);
    window.calculatePurchaseTotals();
};

window.removePurchaseItem = function (index) {
    window.purchaseItems.splice(index, 1);
    window.renderPurchaseItems();
    window.calculatePurchaseTotals();
};

window.calculatePurchaseTotals = function () {
    const itemsSubtotal = window.purchaseItems.reduce((sum, item) => sum + item.subtotal, 0);

    const orderTaxPercent = parseFloat(document.getElementById('purchaseOrderTax').value) || 0;
    const discountKs = parseFloat(document.getElementById('purchaseDiscount').value) || 0;
    const shippingKs = parseFloat(document.getElementById('purchaseShipping').value) || 0;

    const orderTaxAmount = itemsSubtotal * (orderTaxPercent / 100);
    const grandTotal = itemsSubtotal + orderTaxAmount - discountKs + shippingKs;

    const status = document.getElementById('purchasePaymentStatus').value;
    let paidAmount = 0;

    if (status === 'Paid') {
        paidAmount = grandTotal;
        document.getElementById('purchasePaidAmount').value = paidAmount.toFixed(2);
    } else if (status === 'Unpaid') {
        paidAmount = 0;
        document.getElementById('purchasePaidAmount').value = paidAmount.toFixed(2);
    } else {
        // Partial - use manual input
        paidAmount = parseFloat(document.getElementById('purchasePaidAmount').value) || 0;
    }

    const balance = grandTotal - paidAmount;

    if (document.getElementById('summaryOrderTax')) document.getElementById('summaryOrderTax').textContent = `${orderTaxAmount.toFixed(2)} Ks (${orderTaxPercent.toFixed(2)}) %`;
    if (document.getElementById('summaryDiscount')) document.getElementById('summaryDiscount').textContent = `${discountKs.toFixed(2)} Ks`;
    if (document.getElementById('summaryShipping')) document.getElementById('summaryShipping').textContent = `${shippingKs.toFixed(2)} Ks`;
    if (document.getElementById('summaryGrandTotal')) document.getElementById('summaryGrandTotal').textContent = `${grandTotal.toFixed(2)} Ks`;
    if (document.getElementById('summaryPaid')) document.getElementById('summaryPaid').textContent = `${paidAmount.toFixed(2)} Ks`;
    if (document.getElementById('summaryBalance')) document.getElementById('summaryBalance').textContent = `${balance.toFixed(2)} Ks`;
};

window.updatePaymentVisibility = function () {
    const status = document.getElementById('purchasePaymentStatus').value;
    const group = document.getElementById('purchasePaidAmountGroup');

    if (status === 'Partial') {
        group.classList.remove('hidden');
    } else {
        group.classList.add('hidden');
    }

    window.calculatePurchaseTotals();
};

window.savePurchase = async function () {
    if (window.purchaseItems.length === 0) {
        alert('Please add at least one product.');
        return;
    }

    const supplierId = document.getElementById('purchaseAddSupplier').value;
    if (!supplierId) {
        alert('Please select a supplier.');
        return;
    }

    try {
        window.showLoading();

        const purchaseData = {
            date: document.getElementById('purchaseAddDate').value,
            supplier_id: supplierId,
            warehouse_id: document.getElementById('purchaseAddWarehouse').value || null,
            status: document.getElementById('purchaseStatus').value,
            payment_type: document.getElementById('purchasePaymentType').value,
            payment_status: document.getElementById('purchasePaymentStatus').value,
            paid_amount: parseFloat(document.getElementById('purchasePaidAmount').value) || 0,
            order_tax_percentage: parseFloat(document.getElementById('purchaseOrderTax').value) || 0,
            discount_amount: parseFloat(document.getElementById('purchaseDiscount').value) || 0,
            shipping_amount: parseFloat(document.getElementById('purchaseShipping').value) || 0,
            grand_total: parseFloat(document.getElementById('summaryGrandTotal').textContent.split(' ')[0]) || 0,
            note: document.getElementById('purchaseNote').value,
            created_by: window.currentUser.id
        };

        // Insert purchase
        const { data: purchase, error: pError } = await window.supabase
            .from('purchases')
            .insert(purchaseData)
            .select()
            .single();

        if (pError) throw pError;

        // Insert items
        const itemsToInsert = window.purchaseItems.map(item => ({
            purchase_id: purchase.id,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_cost: item.unit_cost,
            discount_amount: item.discount,
            tax_percentage: item.tax,
            subtotal: item.subtotal
        }));

        const { error: itemsError } = await window.supabase
            .from('purchase_items')
            .insert(itemsToInsert);

        if (itemsError) throw itemsError;

        // Inventory Update Logic
        if (purchaseData.status === 'Received') {
            for (const item of window.purchaseItems) {
                const incrementAmount = item.quantity * (item.pcs_per_box || 1);
                const { error: stockError } = await window.supabase.rpc('increment_stock', {
                    row_id: item.product_id,
                    amount: incrementAmount
                });

                if (stockError) {
                    console.error(`Failed to update stock for product ${item.product_id}:`, stockError);
                }
            }
            if (typeof window.loadProducts === 'function') await window.loadProducts(true);
        }

        alert('Purchase saved successfully!');
        window.switchView('purchase-manager');
    } catch (e) {
        console.error('Error saving purchase:', e);
        alert('Failed to save purchase: ' + e.message);
    } finally {
        window.hideLoading();
    }
};

window.loadPurchases = async function () {
    try {
        window.showLoading();
        const { data, error } = await window.supabase
            .from('purchases')
            .select(`
                *,
                suppliers (name),
                warehouses (name)
            `)
            .order('date', { ascending: false });

        if (error) throw error;

        const body = document.getElementById('purchaseBody');
        if (!body) return;
        body.innerHTML = '';

        if (!data || data.length === 0) {
            body.innerHTML = `
                <div class="text-center text-muted" style="padding: 40px; background: var(--bg-secondary); border-radius: var(--radius-md);">
                    <i class="fas fa-inbox fa-3x mb-md" style="opacity: 0.2;"></i>
                    <p>No purchases found. Click "Add Purchase" to create one.</p>
                </div>
            `;
            return;
        }

        data.forEach(p => {
            const balance = p.grand_total - (p.paid_amount || 0);
            const container = document.createElement('div');
            container.className = 'stacked-row fade-in';

            container.innerHTML = `
                <div class="stacked-line">
                    <div class="grid-field" style="flex: 1;">
                        <span class="field-label">Reference</span>
                        <div style="padding: 10px 12px; font-weight: 600; color: var(--primary-light);">${window.escapeHtml(p.reference_no || '-')}</div>
                    </div>
                    <div class="grid-field" style="flex: 1;">
                        <span class="field-label">Date</span>
                        <div style="padding: 10px 12px; color: var(--text-muted);">${p.date}</div>
                    </div>
                    <div class="grid-field" style="flex: 1.5;">
                        <span class="field-label">Supplier</span>
                        <div style="padding: 10px 12px; font-weight: 600;">${p.suppliers ? window.escapeHtml(p.suppliers.name) : 'N/A'}</div>
                    </div>
                    <div class="grid-field" style="flex: 0.5; min-width: 100px; border-right: none; align-items: center; justify-content: center; flex-direction: row; gap: 10px;">
                        <button class="btn-icon" title="View" style="color: var(--primary-light);"><i class="fas fa-eye"></i></button>
                        <button class="btn-icon" title="Print" style="color: var(--text-muted);"><i class="fas fa-print"></i></button>
                    </div>
                </div>
                <div class="stacked-line border-none" style="background: rgba(255,255,255,0.02);">
                    <div class="grid-field">
                        <span class="field-label">Warehouse</span>
                        <div style="padding: 10px 12px;">${p.warehouses ? window.escapeHtml(p.warehouses.name) : 'N/A'}</div>
                    </div>
                    <div class="grid-field">
                        <span class="field-label">Status</span>
                        <div style="padding: 8px 12px;"><span class="badge badge-${p.status.toLowerCase()}">${p.status}</span></div>
                    </div>
                    <div class="grid-field">
                        <span class="field-label">Grand Total</span>
                        <div style="padding: 10px 12px; font-weight: 700;">${p.grand_total.toFixed(2)} Ks</div>
                    </div>
                    <div class="grid-field">
                        <span class="field-label">Paid</span>
                        <div style="padding: 10px 12px; color: #10b981; font-weight: 700;">${(p.paid_amount || 0).toFixed(2)} Ks</div>
                    </div>
                    <div class="grid-field">
                        <span class="field-label">Balance</span>
                        <div style="padding: 10px 12px; color: var(--error); font-weight: 700;">${balance.toFixed(2)} Ks</div>
                    </div>
                    <div class="grid-field">
                        <span class="field-label">Payment Status</span>
                        <div style="padding: 8px 12px;"><span class="badge badge-${p.payment_status.toLowerCase()}">${p.payment_status}</span></div>
                    </div>
                </div>
            `;
            body.appendChild(container);
        });
    } catch (e) {
        console.error('Error loading purchases:', e);
    } finally {
        window.hideLoading();
    }
};

window.loadPurchaseReturns = async function () {
    try {
        window.showLoading();
        const { data, error } = await window.supabase
            .from('purchase_returns')
            .select(`
                *,
                suppliers (name),
                warehouses (name)
            `)
            .order('date', { ascending: false });

        if (error) throw error;

        const body = document.getElementById('purchaseReturnBody');
        if (!body) return;
        body.innerHTML = '';

        if (!data || data.length === 0) {
            body.innerHTML = `
                <div class="text-center text-muted" style="padding: 40px; background: var(--bg-secondary); border-radius: var(--radius-md);">
                    <i class="fas fa-undo fa-3x mb-md" style="opacity: 0.2;"></i>
                    <p>No purchase returns found.</p>
                </div>
            `;
            return;
        }

        data.forEach(r => {
            const container = document.createElement('div');
            container.className = 'stacked-row fade-in';

            container.innerHTML = `
                <div class="stacked-line">
                    <div class="grid-field" style="flex: 1;">
                        <span class="field-label">Reference</span>
                        <div style="padding: 10px 12px; font-weight: 600; color: var(--primary-light);">${window.escapeHtml(r.reference_no || '-')}</div>
                    </div>
                    <div class="grid-field" style="flex: 1;">
                        <span class="field-label">Date</span>
                        <div style="padding: 10px 12px; color: var(--text-muted);">${r.date}</div>
                    </div>
                    <div class="grid-field" style="flex: 1.5;">
                        <span class="field-label">Supplier</span>
                        <div style="padding: 10px 12px; font-weight: 600;">${r.suppliers ? window.escapeHtml(r.suppliers.name) : 'N/A'}</div>
                    </div>
                    <div class="grid-field" style="flex: 0.5; min-width: 100px; border-right: none; align-items: center; justify-content: center; flex-direction: row; gap: 10px;">
                        <button class="btn-icon" title="View" style="color: var(--primary-light);"><i class="fas fa-eye"></i></button>
                    </div>
                </div>
                <div class="stacked-line border-none" style="background: rgba(255,255,255,0.02);">
                    <div class="grid-field">
                        <span class="field-label">Warehouse</span>
                        <div style="padding: 10px 12px;">${r.warehouses ? window.escapeHtml(r.warehouses.name) : 'N/A'}</div>
                    </div>
                    <div class="grid-field">
                        <span class="field-label">Status</span>
                        <div style="padding: 8px 12px;"><span class="badge badge-success">${r.status}</span></div>
                    </div>
                    <div class="grid-field">
                        <span class="field-label">Grand Total</span>
                        <div style="padding: 10px 12px; font-weight: 700;">${(r.total || 0).toFixed(2)} Ks</div>
                    </div>
                </div>
            `;
            body.appendChild(container);
        });
    } catch (e) {
        console.error('Error loading returns:', e);
    } finally {
        window.hideLoading();
    }
};

window.initPurchaseReturnAdd = async function () {
    // Reset form
    window.returnItems = [];
    document.getElementById('returnAddDate').valueAsDate = new Date();
    document.getElementById('returnAddWarehouse').value = '';
    document.getElementById('returnAddSupplier').value = '';
    document.getElementById('returnProductSearch').value = '';
    document.getElementById('returnOrderTax').value = '0.00';
    document.getElementById('returnDiscount').value = '0.00';
    document.getElementById('returnShipping').value = '0.00';
    document.getElementById('returnNote').value = '';

    // Populate Dropdowns
    const whSelect = document.getElementById('returnAddWarehouse');
    whSelect.innerHTML = '<option value="">Choose Warehouse</option>';
    if (window.warehousesData) {
        window.warehousesData.forEach(w => {
            whSelect.innerHTML += `<option value="${w.id}">${window.escapeHtml(w.name)}</option>`;
        });
    }

    const supSelect = document.getElementById('returnAddSupplier');
    supSelect.innerHTML = '<option value="">Choose Supplier</option>';
    if (window.suppliersData) {
        window.suppliersData.forEach(s => {
            supSelect.innerHTML += `<option value="${s.id}">${window.escapeHtml(s.name)}</option>`;
        });
    }

    // Pre-load reference data if missing
    if (typeof window.loadProducts === 'function' && (!window.productsData || window.productsData.length === 0)) await window.loadProducts();

    window.renderReturnItems();
    window.calculateReturnTotals();
};

window.searchProductsForReturn = function (input) {
    const query = input.value.toLowerCase().trim();
    const dropdown = document.getElementById('returnSearchDropdown');
    if (!dropdown) return;
    dropdown.innerHTML = '';

    if (query.length < 1) {
        dropdown.classList.add('hidden');
        return;
    }

    if (!window.productsData) return;

    const filtered = window.productsData.filter(p =>
        (p.name || '').toLowerCase().includes(query) ||
        (p.item_code || '').toLowerCase().includes(query)
    ).slice(0, 5);

    if (filtered.length === 0) {
        dropdown.innerHTML = '<div class="search-item">No products found</div>';
    } else {
        filtered.forEach(p => {
            const div = document.createElement('div');
            div.className = 'search-item';
            div.innerHTML = `
                <div style="font-weight:600;">${window.escapeHtml(p.name)}</div>
                <div style="font-size:0.75rem; color:var(--text-muted);">${window.escapeHtml(p.item_code)} | Stock: ${p.stock}</div>
            `;
            div.onclick = () => {
                window.addSelectedItemToReturn(p);
                input.value = '';
                dropdown.classList.add('hidden');
            };
            dropdown.appendChild(div);
        });
    }
    dropdown.classList.remove('hidden');
};

window.addSelectedItemToReturn = function (product) {
    const existing = window.returnItems.find(item => item.product_id === product.id);
    if (existing) {
        existing.quantity += 1;
    } else {
        window.returnItems.push({
            product_id: product.id,
            name: product.name,
            item_code: product.item_code,
            unit_price: product.price || 0,
            quantity: 1,
            total: product.price || 0
        });
    }
    window.renderReturnItems();
    window.calculateReturnTotals();
};

window.renderReturnItems = function () {
    const body = document.getElementById('returnAddItemsBody');
    if (!body) return;
    if (window.returnItems.length === 0) {
        body.innerHTML = `
            <div class="text-center text-muted" style="padding: 40px; background: var(--bg-secondary); border-radius: var(--radius-md);">
                <i class="fas fa-undo fa-3x mb-md" style="opacity: 0.2;"></i>
                <p>No products added. Use the search bar above to add items for return.</p>
            </div>
        `;
        return;
    }

    let html = `
        <table class="excel-table">
            <thead>
                <tr>
                    <th>Product</th>
                    <th style="width:120px;">Unit Price</th>
                    <th style="width:120px;">Quantity</th>
                    <th style="width:120px; text-align:right;">Subtotal</th>
                    <th style="width:50px;"></th>
                </tr>
            </thead>
            <tbody>
    `;

    window.returnItems.forEach((item, index) => {
        html += `
            <tr>
                <td style="padding: 8px 12px;">
                    <div style="font-weight:600;">${window.escapeHtml(item.name)}</div>
                    <div style="font-size:0.75rem; color:var(--text-muted);">${window.escapeHtml(item.item_code)}</div>
                </td>
                <td>
                    <input type="number" class="excel-input" value="${item.unit_price}" 
                        oninput="updateReturnItem(${index}, 'unit_price', this.value)" style="padding: 4px 8px;">
                </td>
                <td>
                    <input type="number" class="excel-input" value="${item.quantity}" 
                        oninput="updateReturnItem(${index}, 'quantity', this.value)" style="padding: 4px 8px;">
                </td>
                <td style="text-align:right; font-weight:600; padding-right: 12px;">${(item.unit_price * item.quantity).toFixed(2)}</td>
                <td style="text-align:center;">
                    <button class="btn-icon" style="color:var(--error);" onclick="removeReturnItem(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    body.innerHTML = html;
};

window.updateReturnItem = function (index, field, value) {
    const val = parseFloat(value) || 0;
    window.returnItems[index][field] = val;
    window.returnItems[index].total = window.returnItems[index].unit_price * window.returnItems[index].quantity;
    window.renderReturnItems();
    window.calculateReturnTotals();
};

window.removeReturnItem = function (index) {
    window.returnItems.splice(index, 1);
    window.renderReturnItems();
    window.calculateReturnTotals();
};

window.calculateReturnTotals = function () {
    const taxRate = parseFloat(document.getElementById('returnOrderTax').value) || 0;
    const discount = parseFloat(document.getElementById('returnDiscount').value) || 0;
    const shipping = parseFloat(document.getElementById('returnShipping').value) || 0;

    let subtotal = 0;
    window.returnItems.forEach(item => {
        subtotal += item.unit_price * item.quantity;
    });

    const taxAmount = subtotal * (taxRate / 100);
    const grandTotal = subtotal + taxAmount + shipping - discount;

    const el = document.getElementById('returnSummaryGrandTotal');
    if (el) el.innerText = grandTotal.toFixed(2) + ' Ks';
    return grandTotal;
};

window.savePurchaseReturn = async function () {
    const date = document.getElementById('returnAddDate').value;
    const warehouse_id = document.getElementById('returnAddWarehouse').value;
    const supplier_id = document.getElementById('returnAddSupplier').value;
    const note = document.getElementById('returnNote').value;

    if (!warehouse_id || !supplier_id || window.returnItems.length === 0) {
        alert('Please select warehouse, supplier and add items.');
        return;
    }

    const btn = document.getElementById('saveReturnBtn');
    if (!btn) return;
    const originalText = btn.innerHTML;

    try {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        window.showLoading();

        const taxRate = parseFloat(document.getElementById('returnOrderTax').value) || 0;
        const discount = parseFloat(document.getElementById('returnDiscount').value) || 0;
        const shipping = parseFloat(document.getElementById('returnShipping').value) || 0;
        const total = window.calculateReturnTotals();

        // 1. Insert Return Record
        const { data: returnData, error: returnError } = await window.supabase
            .from('purchase_returns')
            .insert([{
                date,
                warehouse_id,
                supplier_id,
                tax_rate: taxRate,
                discount,
                shipping,
                total,
                note,
                status: 'Completed',
                reference_no: 'PR-' + Date.now()
            }])
            .select();

        if (returnError) throw returnError;
        const returnId = returnData[0].id;

        // 2. Insert Items
        const itemsToInsert = window.returnItems.map(item => ({
            return_id: returnId,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.total
        }));

        const { error: itemsError } = await window.supabase
            .from('purchase_return_items')
            .insert(itemsToInsert);

        if (itemsError) throw itemsError;

        // 3. Update Stock (Decrement)
        for (const item of window.returnItems) {
            const { error: stockError } = await window.supabase.rpc('increment_stock', {
                row_id: item.product_id,
                amount: -item.quantity
            });
            if (stockError) console.error('Stock Update Error:', stockError);
        }

        alert('Purchase Return saved successfully!');
        window.switchView('purchase-return');
        if (typeof window.loadProducts === 'function') await window.loadProducts(true);

    } catch (e) {
        console.error('Error:', e);
        alert('Error: ' + e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
        window.hideLoading();
    }
};

window.resetPurchaseForm = function () {
    window.purchaseItems = [];
    if (document.getElementById('purchaseAddDate')) document.getElementById('purchaseAddDate').valueAsDate = new Date();
    if (document.getElementById('purchaseAddWarehouse')) document.getElementById('purchaseAddWarehouse').value = '';
    if (document.getElementById('purchaseAddSupplier')) document.getElementById('purchaseAddSupplier').value = '';
    if (document.getElementById('purchaseProductSearch')) document.getElementById('purchaseProductSearch').value = '';
    if (document.getElementById('purchaseOrderTax')) document.getElementById('purchaseOrderTax').value = '0.00';
    if (document.getElementById('purchaseDiscount')) document.getElementById('purchaseDiscount').value = '0.00';
    if (document.getElementById('purchaseShipping')) document.getElementById('purchaseShipping').value = '0.00';
    if (document.getElementById('purchaseStatus')) document.getElementById('purchaseStatus').value = 'Received';
    if (document.getElementById('purchasePaymentType')) document.getElementById('purchasePaymentType').value = 'Cash';
    if (document.getElementById('purchasePaymentStatus')) document.getElementById('purchasePaymentStatus').value = 'Unpaid';
    if (document.getElementById('purchasePaidAmount')) document.getElementById('purchasePaidAmount').value = '0.00';
    if (document.getElementById('purchasePaidAmountGroup')) document.getElementById('purchasePaidAmountGroup').classList.add('hidden');
    if (document.getElementById('purchaseNote')) document.getElementById('purchaseNote').value = '';
    window.renderPurchaseItems();
    window.calculatePurchaseTotals();
};

window.loadSuppliers = async function () {
    try {
        const { data, error } = await window.supabase.from('suppliers').select('*').order('name');
        if (error) throw error;
        window.suppliersData = data || [];
        const supplierSelect = document.getElementById('purchaseAddSupplier');
        if (supplierSelect) {
            if (supplierSelect.tomselect) supplierSelect.tomselect.destroy();
            supplierSelect.innerHTML = '<option value="">Choose Supplier</option>';
            window.suppliersData.forEach(s => {
                supplierSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`;
            });
            new TomSelect(supplierSelect, {
                create: true,
                sortField: { field: "text", direction: "asc" },
                placeholder: "Select or Type Supplier..."
            });
        }
    } catch (e) {
        console.error('Error loading suppliers:', e);
    }
};

window.loadWarehouses = async function () {
    try {
        const { data, error } = await window.supabase.from('warehouses').select('*').order('name');
        if (error) throw error;
        window.warehousesData = data || [];
        const warehouseSelect = document.getElementById('purchaseAddWarehouse');
        if (warehouseSelect) {
            if (warehouseSelect.tomselect) warehouseSelect.tomselect.destroy();
            warehouseSelect.innerHTML = '<option value="">Choose Warehouse</option>';
            window.warehousesData.forEach(w => {
                warehouseSelect.innerHTML += `<option value="${w.id}">${w.name}</option>`;
            });
            new TomSelect(warehouseSelect, {
                create: false,
                sortField: { field: "text", direction: "asc" },
                placeholder: "Select Warehouse..."
            });
        }
    } catch (e) {
        console.error('Error loading warehouses:', e);
    }
};
