const { createClient } = supabase;
const supabaseUrl = 'https://jjjdzpmxyifubbnvktwn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqamR6cG14eWlmdWJibnZrdHduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg0OTI3NTksImV4cCI6MjA1NDA2ODc1OX0.v_ch7jHEKYLa5KN-lqkBqJVLAXjpvmVhKGi_FmxkVhI';
const db = createClient(supabaseUrl, supabaseKey);

async function init() {
    if (window.location.search.includes('mode=embedded')) {
        document.body.classList.add('embedded');
    }

    // Set today's date
    document.getElementById('returnDate').valueAsDate = new Date();

    await loadShops();
    await loadSuppliers();
    generateVoucherNumber();

    // Event listeners
    document.getElementById('btnSave').addEventListener('click', saveReturn);
    document.getElementById('btnAddReturn').addEventListener('click', addProductRow);

    // Calculate totals on input change
    document.getElementById('productsTableBody').addEventListener('input', calculateRowAmount);
    document.getElementById('taxPercent').addEventListener('input', calculateTotals);
    document.getElementById('discount').addEventListener('input', calculateTotals);
    document.getElementById('shipping').addEventListener('input', calculateTotals);
    document.getElementById('refundAmount').addEventListener('input', calculateRemaining);
}

async function loadShops() {
    const { data } = await db.from('warehouses').select('*');
    const select = document.getElementById('shopSelect');
    data?.forEach(shop => {
        const opt = document.createElement('option');
        opt.value = shop.id;
        opt.textContent = shop.name;
        select.appendChild(opt);
    });
}

async function loadSuppliers() {
    const { data } = await db.from('suppliers').select('*');
    const select = document.getElementById('supplierSelect');
    data?.forEach(supplier => {
        const opt = document.createElement('option');
        opt.value = supplier.id;
        opt.textContent = supplier.name;
        select.appendChild(opt);
    });
}

function generateVoucherNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000);
    document.getElementById('voucherNo').value = `PR${year}${month}${day}${random}`;
}

function addProductRow() {
    const tbody = document.getElementById('productsTableBody');
    const rowCount = tbody.rows.length + 1;

    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${rowCount}</td>
        <td><input type="text" placeholder="Item Code"></td>
        <td><input type="text" placeholder="Scan/Enter Barcode"></td>
        <td><input type="text" placeholder="Description"></td>
        <td><input type="number" value="0" min="0"></td>
        <td><input type="number" value="0" min="0"></td>
        <td><input type="number" value="0" min="0" step="0.01"></td>
        <td><input type="number" value="0" min="0" max="100" step="0.1"></td>
        <td><input type="number" value="0" readonly></td>
        <td><input type="text" placeholder="Remark"></td>
        <td><button class="btn-remove" onclick="removeRow(this)"><i class="fas fa-trash"></i></button></td>
    `;
    tbody.appendChild(row);
}

function removeRow(btn) {
    const row = btn.closest('tr');
    row.remove();

    // Renumber rows
    const tbody = document.getElementById('productsTableBody');
    Array.from(tbody.rows).forEach((row, index) => {
        row.cells[0].textContent = index + 1;
    });

    calculateTotals();
}

function calculateRowAmount(e) {
    const row = e.target.closest('tr');
    if (!row) return;

    const qty = parseFloat(row.cells[4].querySelector('input').value) || 0;
    const cost = parseFloat(row.cells[6].querySelector('input').value) || 0;
    const discount = parseFloat(row.cells[7].querySelector('input').value) || 0;

    let amount = qty * cost;
    amount = amount - (amount * discount / 100);

    row.cells[8].querySelector('input').value = amount.toFixed(2);

    calculateTotals();
}

function calculateTotals() {
    const tbody = document.getElementById('productsTableBody');
    let subtotal = 0;

    Array.from(tbody.rows).forEach(row => {
        const amount = parseFloat(row.cells[8].querySelector('input').value) || 0;
        subtotal += amount;
    });

    const taxPercent = parseFloat(document.getElementById('taxPercent').value) || 0;
    const discountInput = document.getElementById('discount').value;
    const shipping = parseFloat(document.getElementById('shipping').value) || 0;

    const taxAmount = subtotal * taxPercent / 100;

    // Check if discount is percentage or fixed amount
    let discountAmount = 0;
    if (discountInput.includes('%')) {
        const percent = parseFloat(discountInput.replace('%', '')) || 0;
        discountAmount = subtotal * percent / 100;
    } else {
        discountAmount = parseFloat(discountInput) || 0;
    }

    const grandTotal = subtotal + taxAmount - discountAmount + shipping;
    const netAmount = grandTotal;

    document.getElementById('grandTotal').value = subtotal.toFixed(2);
    document.getElementById('taxAmount').value = taxAmount.toFixed(2);
    document.getElementById('discountAmount').value = discountAmount.toFixed(2);
    document.getElementById('shippingAmount').value = shipping.toFixed(2);
    document.getElementById('netAmount').value = netAmount.toFixed(2);

    calculateRemaining();
}

function calculateRemaining() {
    const netAmount = parseFloat(document.getElementById('netAmount').value) || 0;
    const refundAmount = parseFloat(document.getElementById('refundAmount').value) || 0;
    const remainAmount = netAmount - refundAmount;

    document.getElementById('remainAmount').value = remainAmount.toFixed(2);
}

async function saveReturn() {
    const returnDate = document.getElementById('returnDate').value;
    const shopId = document.getElementById('shopSelect').value;
    const supplierId = document.getElementById('supplierSelect').value;
    const paymentMethod = document.getElementById('paymentMethod').value;
    const voucherNo = document.getElementById('voucherNo').value;

    if (!shopId || !supplierId) {
        alert('Please select shop and supplier');
        return;
    }

    // Get products
    const tbody = document.getElementById('productsTableBody');
    const products = [];

    Array.from(tbody.rows).forEach(row => {
        const itemCode = row.cells[1].querySelector('input').value;
        const barcode = row.cells[2].querySelector('input').value;
        const description = row.cells[3].querySelector('input').value;
        const qty = parseFloat(row.cells[4].querySelector('input').value) || 0;
        const pcsBox = parseFloat(row.cells[5].querySelector('input').value) || 0;
        const cost = parseFloat(row.cells[6].querySelector('input').value) || 0;
        const discount = parseFloat(row.cells[7].querySelector('input').value) || 0;
        const amount = parseFloat(row.cells[8].querySelector('input').value) || 0;
        const remark = row.cells[9].querySelector('input').value;

        if (qty > 0) {
            products.push({
                item_code: itemCode,
                barcode: barcode,
                description: description,
                quantity: qty,
                pcs_box: pcsBox,
                cost: cost,
                discount: discount,
                amount: amount,
                remark: remark
            });
        }
    });

    if (products.length === 0) {
        alert('Please add at least one product');
        return;
    }

    const returnData = {
        voucher_no: voucherNo,
        return_date: returnDate,
        warehouse_id: shopId,
        supplier_id: supplierId,
        payment_method: paymentMethod,
        tax_percent: parseFloat(document.getElementById('taxPercent').value) || 0,
        discount: document.getElementById('discount').value,
        shipping: parseFloat(document.getElementById('shipping').value) || 0,
        total_amount: parseFloat(document.getElementById('grandTotal').value) || 0,
        tax_amount: parseFloat(document.getElementById('taxAmount').value) || 0,
        discount_amount: parseFloat(document.getElementById('discountAmount').value) || 0,
        net_amount: parseFloat(document.getElementById('netAmount').value) || 0,
        refund_amount: parseFloat(document.getElementById('refundAmount').value) || 0,
        status: document.getElementById('status').value,
        payment_status: document.getElementById('paymentStatus').value,
        payment_type: document.getElementById('paymentType').value,
        notes: document.getElementById('remarkText').value,
        products: products
    };

    try {
        const { data, error } = await db.from('purchase_returns').insert([returnData]).select();

        if (error) throw error;

        alert('Purchase return saved successfully!');
        window.location.href = 'purchase-list.html';
    } catch (error) {
        console.error('Error saving purchase return:', error);
        alert('Error saving purchase return: ' + error.message);
    }
}

document.addEventListener('DOMContentLoaded', init);
