// ─── Quotation Page JavaScript ───
// Handles the Create Quotation form logic

// Supabase client
const SUPABASE_URL = 'https://jjjdzpmxyifubbnvktwn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqamR6cG14eWlmdWJibnZrdHduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg1NjUyNjYsImV4cCI6MjA1NDE0MTI2Nn0.a0mShHRmQBsXBIFByO4FyyYlvjVcNhFib6YgxPmGiQg';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// State
let orderItems = [];
let allProducts = [];

// ─── Embedded mode detection ───
(function () {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'embedded') {
        document.body.classList.add('embedded');
    }
})();

// ─── Init ───
document.addEventListener('DOMContentLoaded', async () => {
    // Set today's date
    document.getElementById('quotationDate').value = new Date().toISOString().split('T')[0];

    // Load data
    await Promise.all([
        loadWarehouses(),
        loadCustomers(),
        loadProducts()
    ]);

    // Event listeners
    setupProductSearch();
    setupCalculationListeners();

    document.getElementById('btnSave').addEventListener('click', saveQuotation);
    document.getElementById('btnCancel').addEventListener('click', cancelQuotation);
});

// ─── Load Warehouses ───
async function loadWarehouses() {
    const { data, error } = await supabase.from('warehouses').select('id, name').order('name');
    if (error) { console.error('Error loading warehouses:', error); return; }
    const select = document.getElementById('warehouseSelect');
    (data || []).forEach(w => {
        const opt = document.createElement('option');
        opt.value = w.id;
        opt.textContent = w.name;
        select.appendChild(opt);
    });
}

// ─── Load Customers ───
async function loadCustomers() {
    const { data, error } = await supabase.from('customers').select('id, name').order('name');
    if (error) { console.error('Error loading customers:', error); return; }
    const select = document.getElementById('customerSelect');
    (data || []).forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        select.appendChild(opt);
    });
}

// ─── Load Products ───
async function loadProducts() {
    const { data, error } = await supabase.from('products').select('id, name, code, item_code, price, stock, unit, sale_unit');
    if (error) { console.error('Error loading products:', error); return; }
    allProducts = data || [];
}

// ─── Product Search ───
function setupProductSearch() {
    const input = document.getElementById('productSearch');
    const dropdown = document.getElementById('searchDropdown');
    let debounceTimer;

    input.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const query = input.value.trim().toLowerCase();
            if (query.length < 1) {
                dropdown.classList.add('hidden');
                return;
            }

            const matches = allProducts.filter(p =>
                (p.name && p.name.toLowerCase().includes(query)) ||
                (p.code && p.code.toLowerCase().includes(query)) ||
                (p.item_code && p.item_code.toLowerCase().includes(query))
            ).slice(0, 10);

            if (matches.length === 0) {
                dropdown.classList.add('hidden');
                return;
            }

            dropdown.innerHTML = matches.map(p => `
                <div class="search-item" data-product-id="${p.id}">
                    <div>
                        <div class="product-name">${p.name}</div>
                        <div class="product-code">${p.code || p.item_code || ''}</div>
                    </div>
                    <div class="product-price">${parseFloat(p.price || 0).toFixed(2)} Ks</div>
                </div>
            `).join('');

            dropdown.classList.remove('hidden');

            // Click handlers
            dropdown.querySelectorAll('.search-item').forEach(el => {
                el.addEventListener('click', () => {
                    const pid = el.dataset.productId;
                    const product = allProducts.find(p => p.id === pid);
                    if (product) addProductToOrder(product);
                    input.value = '';
                    dropdown.classList.add('hidden');
                });
            });
        }, 200);
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.product-search-wrapper')) {
            dropdown.classList.add('hidden');
        }
    });
}

// ─── Add Product to Order ───
function addProductToOrder(product) {
    // Check if already in the list
    const existing = orderItems.find(i => i.product_id === product.id);
    if (existing) {
        existing.quantity += 1;
        recalculateItem(existing);
        renderOrderItems();
        recalculateTotals();
        return;
    }

    const item = {
        product_id: product.id,
        product_name: product.name,
        net_unit_price: parseFloat(product.price || 0),
        stock: parseInt(product.stock || 0),
        unit: product.sale_unit || product.unit || 'pc',
        quantity: 1,
        discount: 0,
        tax_percentage: 0,
        tax_amount: 0,
        subtotal: parseFloat(product.price || 0)
    };

    orderItems.push(item);
    renderOrderItems();
    recalculateTotals();
}

// ─── Render Order Items ───
function renderOrderItems() {
    const tbody = document.getElementById('itemsTableBody');

    if (orderItems.length === 0) {
        tbody.innerHTML = '<tr class="no-data-row"><td colspan="9" class="no-data">No Data Available</td></tr>';
        return;
    }

    tbody.innerHTML = orderItems.map((item, index) => `
        <tr data-index="${index}">
            <td>${item.product_name}</td>
            <td><input type="number" class="item-price" data-index="${index}" value="${item.net_unit_price.toFixed(2)}" min="0" step="0.01"></td>
            <td style="text-align:center; color:var(--text-muted);">${item.stock}</td>
            <td style="text-align:center; color:var(--text-muted);">${item.unit}</td>
            <td><input type="number" class="item-qty" data-index="${index}" value="${item.quantity}" min="1" step="1"></td>
            <td><input type="number" class="item-discount" data-index="${index}" value="${item.discount.toFixed(2)}" min="0" step="0.01"></td>
            <td><input type="number" class="item-tax" data-index="${index}" value="${item.tax_percentage.toFixed(2)}" min="0" step="0.01"></td>
            <td style="text-align:right; font-weight:600;">${item.subtotal.toFixed(2)}</td>
            <td style="text-align:center;"><button class="btn-remove-row" data-index="${index}"><i class="fas fa-trash-alt"></i></button></td>
        </tr>
    `).join('');

    // Bind events
    tbody.querySelectorAll('.item-price, .item-qty, .item-discount, .item-tax').forEach(input => {
        input.addEventListener('change', (e) => {
            const idx = parseInt(e.target.dataset.index);
            updateItem(idx);
        });
    });

    tbody.querySelectorAll('.btn-remove-row').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.currentTarget.dataset.index);
            orderItems.splice(idx, 1);
            renderOrderItems();
            recalculateTotals();
        });
    });
}

// ─── Update Item from inputs ───
function updateItem(index) {
    const item = orderItems[index];
    if (!item) return;

    const tbody = document.getElementById('itemsTableBody');
    const row = tbody.querySelector(`tr[data-index="${index}"]`);
    if (!row) return;

    item.net_unit_price = parseFloat(row.querySelector('.item-price').value) || 0;
    item.quantity = parseInt(row.querySelector('.item-qty').value) || 1;
    item.discount = parseFloat(row.querySelector('.item-discount').value) || 0;
    item.tax_percentage = parseFloat(row.querySelector('.item-tax').value) || 0;

    recalculateItem(item);
    renderOrderItems();
    recalculateTotals();
}

// ─── Recalculate single item ───
function recalculateItem(item) {
    const base = item.net_unit_price * item.quantity;
    const afterDiscount = base - item.discount;
    item.tax_amount = afterDiscount * (item.tax_percentage / 100);
    item.subtotal = afterDiscount + item.tax_amount;
}

// ─── Calculation listeners for bottom controls ───
function setupCalculationListeners() {
    ['orderTax', 'discountAmount', 'shippingAmount'].forEach(id => {
        document.getElementById(id).addEventListener('input', recalculateTotals);
    });
}

// ─── Recalculate Totals ───
function recalculateTotals() {
    const itemsSubtotal = orderItems.reduce((sum, i) => sum + i.subtotal, 0);

    const orderTaxPct = parseFloat(document.getElementById('orderTax').value) || 0;
    const discount = parseFloat(document.getElementById('discountAmount').value) || 0;
    const shipping = parseFloat(document.getElementById('shippingAmount').value) || 0;

    const orderTaxAmount = itemsSubtotal * (orderTaxPct / 100);
    const grandTotal = itemsSubtotal + orderTaxAmount - discount + shipping;

    document.getElementById('summaryTax').textContent = `${orderTaxAmount.toFixed(2)} Ks (${orderTaxPct.toFixed(2)}) %`;
    document.getElementById('summaryDiscount').textContent = `${discount.toFixed(2)} Ks`;
    document.getElementById('summaryShipping').textContent = `${shipping.toFixed(2)} Ks`;
    document.getElementById('summaryGrandTotal').textContent = `${grandTotal.toFixed(2)} Ks`;
}

// ─── Save Quotation ───
async function saveQuotation() {
    const date = document.getElementById('quotationDate').value;
    const warehouseId = document.getElementById('warehouseSelect').value;
    const customerId = document.getElementById('customerSelect').value;
    const status = document.getElementById('quotationStatus').value;
    const note = document.getElementById('quotationNote').value;
    const orderTaxPct = parseFloat(document.getElementById('orderTax').value) || 0;
    const discount = parseFloat(document.getElementById('discountAmount').value) || 0;
    const shipping = parseFloat(document.getElementById('shippingAmount').value) || 0;

    if (!date) { alert('Please select a date.'); return; }
    if (orderItems.length === 0) { alert('Please add at least one product.'); return; }

    const itemsSubtotal = orderItems.reduce((sum, i) => sum + i.subtotal, 0);
    const orderTaxAmount = itemsSubtotal * (orderTaxPct / 100);
    const grandTotal = itemsSubtotal + orderTaxAmount - discount + shipping;
    const totalQty = orderItems.reduce((sum, i) => sum + i.quantity, 0);

    // Generate reference number
    const refNo = 'QT-' + Date.now().toString(36).toUpperCase();

    const quotation = {
        date,
        reference_no: refNo,
        customer_id: customerId || null,
        warehouse_id: warehouseId || null,
        status,
        total_qty: totalQty,
        order_tax_percentage: orderTaxPct,
        order_tax_amount: orderTaxAmount,
        discount_amount: discount,
        shipping_amount: shipping,
        grand_total: grandTotal,
        note: note || null
    };

    const btn = document.getElementById('btnSave');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    try {
        const { data: quotData, error: quotError } = await supabase
            .from('quotations')
            .insert(quotation)
            .select()
            .single();

        if (quotError) throw quotError;

        // Insert items
        const items = orderItems.map(item => ({
            quotation_id: quotData.id,
            product_id: item.product_id,
            net_unit_price: item.net_unit_price,
            stock: item.stock,
            unit: item.unit,
            quantity: item.quantity,
            discount_amount: item.discount,
            tax_percentage: item.tax_percentage,
            tax_amount: item.tax_amount,
            subtotal: item.subtotal
        }));

        const { error: itemsError } = await supabase
            .from('quotation_items')
            .insert(items);

        if (itemsError) throw itemsError;

        alert('Quotation saved successfully! Ref: ' + refNo);
        resetForm();

    } catch (err) {
        console.error('Save error:', err);
        alert('Error saving quotation: ' + (err.message || err));
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> Save';
    }
}

// ─── Cancel ───
function cancelQuotation() {
    if (orderItems.length > 0) {
        if (!confirm('Discard this quotation?')) return;
    }
    resetForm();
}

// ─── Reset Form ───
function resetForm() {
    document.getElementById('quotationDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('warehouseSelect').value = '';
    document.getElementById('customerSelect').value = '';
    document.getElementById('quotationStatus').value = 'Sent';
    document.getElementById('quotationNote').value = '';
    document.getElementById('orderTax').value = '0.00';
    document.getElementById('discountAmount').value = '0.00';
    document.getElementById('shippingAmount').value = '0.00';
    orderItems = [];
    renderOrderItems();
    recalculateTotals();
}
