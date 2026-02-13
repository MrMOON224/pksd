const { createClient } = supabase;
const supabaseUrl = 'https://jjjdzpmxyifubbnvktwn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqamR6cG14eWlmdWJibnZrdHduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg0OTI3NTksImV4cCI6MjA1NDA2ODc1OX0.v_ch7jHEKYLa5KN-lqkBqJVLAXjpvmVhKGi_FmxkVhI';
const db = createClient(supabaseUrl, supabaseKey);

async function init() {
    if (window.location.search.includes('mode=embedded')) {
        document.body.classList.add('embedded');
    }

    await loadShops();
    await loadSuppliers();
    await loadPurchases();

    // Event listeners
    document.getElementById('filterDate').addEventListener('change', loadPurchases);
    document.getElementById('filterShop').addEventListener('change', loadPurchases);
    document.getElementById('filterSupplier').addEventListener('change', loadPurchases);
    document.getElementById('filterPayment').addEventListener('change', loadPurchases);
    document.getElementById('searchBox').addEventListener('input', loadPurchases);
}

async function loadShops() {
    const { data } = await db.from('warehouses').select('*');
    const select = document.getElementById('filterShop');
    data?.forEach(shop => {
        const opt = document.createElement('option');
        opt.value = shop.id;
        opt.textContent = shop.name;
        select.appendChild(opt);
    });
}

async function loadSuppliers() {
    const { data } = await db.from('suppliers').select('*');
    const select = document.getElementById('filterSupplier');
    data?.forEach(supplier => {
        const opt = document.createElement('option');
        opt.value = supplier.id;
        opt.textContent = supplier.name;
        select.appendChild(opt);
    });
}

async function loadPurchases() {
    let query = db.from('purchases').select(`
        *,
        supplier:suppliers(name),
        warehouse:warehouses(name)
    `).order('created_at', { ascending: false });

    // Apply filters
    const filterDate = document.getElementById('filterDate').value;
    const filterShop = document.getElementById('filterShop').value;
    const filterSupplier = document.getElementById('filterSupplier').value;
    const filterPayment = document.getElementById('filterPayment').value;
    const searchTerm = document.getElementById('searchBox').value;

    if (filterDate) {
        query = query.gte('created_at', filterDate + 'T00:00:00')
            .lte('created_at', filterDate + 'T23:59:59');
    }

    if (filterShop) {
        query = query.eq('warehouse_id', filterShop);
    }

    if (filterSupplier) {
        query = query.eq('supplier_id', filterSupplier);
    }

    if (filterPayment) {
        query = query.eq('payment_method', filterPayment);
    }

    const { data } = await query;

    // Filter by search term
    let filteredData = data || [];
    if (searchTerm) {
        filteredData = filteredData.filter(p =>
            p.voucher_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }

    renderTable(filteredData);
}

function renderTable(purchases) {
    const tbody = document.getElementById('purchaseTableBody');
    tbody.innerHTML = '';

    let totalAmount = 0;
    let totalNet = 0;
    let totalPaid = 0;

    purchases.forEach(purchase => {
        const row = document.createElement('tr');
        const date = new Date(purchase.created_at).toLocaleDateString();
        const totalAmt = purchase.total_amount || 0;
        const netAmt = purchase.net_amount || purchase.total_amount || 0;
        const paidAmt = purchase.paid_amount || 0;
        const remainAmt = netAmt - paidAmt;
        const paymentStatus = remainAmt > 0 ? 'partial pay' : 'paid';

        totalAmount += totalAmt;
        totalNet += netAmt;
        totalPaid += paidAmt;

        row.innerHTML = `
            <td>${date}</td>
            <td class="clickable-cell" onclick="viewPurchaseDetail('${purchase.id}')">${purchase.voucher_no || 'N/A'}</td>
            <td>${purchase.supplier?.name || 'N/A'}</td>
            <td>${purchase.payment_method || 'Credit'}</td>
            <td>${purchase.warehouse?.name || 'N/A'}</td>
            <td>${totalAmt.toFixed(0)}</td>
            <td>${netAmt.toFixed(0)}</td>
            <td>${paidAmt.toFixed(0)}</td>
            <td>${remainAmt.toFixed(0)}</td>
            <td>${paymentStatus}</td>
            <td>${purchase.notes || ''}</td>
        `;
        tbody.appendChild(row);
    });

    // Update totals
    document.getElementById('totalAmount').textContent = totalAmount.toFixed(0);
    document.getElementById('totalNet').textContent = totalNet.toFixed(0);
    document.getElementById('totalPaid').textContent = totalPaid.toFixed(0);
}

function viewPurchaseDetail(purchaseId) {
    // Navigate to purchase detail page
    window.location.href = `purchase-detail.html?id=${purchaseId}`;
}

document.addEventListener('DOMContentLoaded', init);
