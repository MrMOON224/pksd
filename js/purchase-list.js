/**
 * Purchase List Logic - Excel Grid Version
 * High-density, schema-driven, with resizable columns.
 */

const SCHEMA = [
    { id: 'date', label: 'Date', width: '8%', align: 'center' },
    { id: 'voucher', label: 'Voucher Code', width: '12%', minWidth: '120px' },
    { id: 'supplier', label: 'Supplier', width: '15%', minWidth: '150px' },
    { id: 'payment', label: 'Payment', width: '8%', align: 'center' },
    { id: 'shop', label: 'Shop / Warehouse', width: '12%', minWidth: '120px' },
    { id: 'total', label: 'Total', width: '8%', align: 'right' },
    { id: 'net', label: 'Net', width: '8%', align: 'right' },
    { id: 'paid', label: 'Paid', width: '8%', align: 'right' },
    { id: 'remain', label: 'Remaining', width: '8%', align: 'right' },
    { id: 'status', label: 'Status', width: '7%', align: 'center' },
    { id: 'remark', label: 'Remark', width: '6%' }
];

let state = {
    data: [],
    filteredData: [],
    columns: SCHEMA,
    lastSync: null
};

async function init() {
    try {
        if (window.location.search.includes('mode=embedded')) {
            document.body.classList.add('embedded');
        }

        toggleLoading(true);
        renderHeader();
        setupResizers();

        // Load metadata in parallel
        await Promise.all([
            loadShops(),
            loadSuppliers()
        ]);

        await loadPurchases();

        // Event listeners for filters
        document.getElementById('filterDate').addEventListener('change', loadPurchases);
        document.getElementById('filterShop').addEventListener('change', loadPurchases);
        document.getElementById('filterSupplier').addEventListener('change', loadPurchases);
        document.getElementById('filterPayment').addEventListener('change', loadPurchases);
        document.getElementById('searchBox').addEventListener('input', debounce(loadPurchases, 300));

    } catch (err) {
        console.error('Initialization failed:', err);
    } finally {
        toggleLoading(false);
    }
}

function renderHeader() {
    const head = document.getElementById('gridHeader');
    head.innerHTML = '<th class="row-idx">#</th>';

    state.columns.forEach((col, i) => {
        const th = document.createElement('th');
        th.style.width = col.width;
        th.innerHTML = `
            <div class="relative px-2 py-2 truncate">
                ${col.label}
                <div class="resizer" data-idx="${i}"></div>
            </div>
        `;
        head.appendChild(th);
    });
}

function renderBody() {
    const body = document.getElementById('gridBody');
    const emptyState = document.getElementById('emptyState');
    body.innerHTML = '';

    if (state.filteredData.length === 0) {
        emptyState.classList.remove('hidden');
        updateTotals(0, 0, 0, 0);
        return;
    }
    emptyState.classList.add('hidden');

    let totalAmt = 0, totalNet = 0, totalPaid = 0, totalRemain = 0;

    state.filteredData.forEach((p, rIdx) => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-white/[0.04] transition-colors";

        const grandTotal = p.grand_total || 0;
        const paidAmount = p.paid_amount || 0;
        const remainAmount = grandTotal - paidAmount;
        const status = p.payment_status || (paidAmount >= grandTotal ? 'Paid' : (paidAmount > 0 ? 'Partial' : 'Unpaid'));

        totalAmt += grandTotal;
        totalNet += grandTotal;
        totalPaid += paidAmount;
        totalRemain += remainAmount;

        // Index Column
        const idxTd = document.createElement('td');
        idxTd.className = "row-idx";
        idxTd.textContent = rIdx + 1;
        tr.appendChild(idxTd);

        state.columns.forEach(col => {
            const td = document.createElement('td');
            const container = document.createElement('div');
            container.className = "cell-container";
            if (col.align === 'right') container.classList.add('justify-end');
            if (col.align === 'center') container.classList.add('justify-center');

            switch (col.id) {
                case 'date':
                    container.innerHTML = `<span class="text-white/40 font-medium">${p.date || '-'}</span>`;
                    break;
                case 'voucher':
                    container.innerHTML = `<span class="voucher-link" onclick="viewPurchaseDetail('${p.id}')">${p.reference_no || 'N/A'}</span>`;
                    break;
                case 'supplier':
                    container.innerHTML = `<span class="font-semibold text-white/80 truncate">${p.supplier?.name || 'N/A'}</span>`;
                    break;
                case 'payment':
                    container.innerHTML = `<span class="text-white/50 text-[10px] uppercase font-bold tracking-tighter">${p.payment_type || '-'}</span>`;
                    break;
                case 'shop':
                    container.innerHTML = `<span class="text-white/40 truncate">${p.warehouse?.name || 'N/A'}</span>`;
                    break;
                case 'total':
                    container.innerHTML = `<span class="font-bold text-indigo-300/80">${grandTotal.toLocaleString()}</span>`;
                    break;
                case 'net':
                    container.innerHTML = `<span class="font-black text-emerald-400/80">${grandTotal.toLocaleString()}</span>`;
                    break;
                case 'paid':
                    container.innerHTML = `<span class="font-black text-blue-400/80">${paidAmount.toLocaleString()}</span>`;
                    break;
                case 'remain':
                    container.innerHTML = `<span class="font-black ${remainAmount > 0 ? 'text-rose-500' : 'text-white/10'}">${remainAmount.toLocaleString()}</span>`;
                    break;
                case 'status':
                    container.innerHTML = `<span class="status-badge-compact ${getStatusBadgeClass(status)}">${status}</span>`;
                    break;
                case 'remark':
                    container.innerHTML = `<span class="italic text-white/20 text-[10px] truncate" title="${p.note || ''}">${p.note || '-'}</span>`;
                    break;
            }

            td.appendChild(container);
            tr.appendChild(td);
        });
        body.appendChild(tr);
    });

    updateTotals(totalAmt, totalNet, totalPaid, totalRemain);
    logActivity(`Loaded ${state.filteredData.length} records.`);
}

async function loadPurchases() {
    toggleLoading(true);
    try {
        let query = supabase.from('purchases').select(`
            *,
            supplier:suppliers(name),
            warehouse:warehouses(name)
        `).order('date', { ascending: false });

        const filterDate = document.getElementById('filterDate').value;
        const filterShop = document.getElementById('filterShop').value;
        const filterSupplier = document.getElementById('filterSupplier').value;
        const filterPayment = document.getElementById('filterPayment').value;
        const searchTerm = document.getElementById('searchBox').value.trim();

        if (filterDate) query = query.eq('date', filterDate);
        if (filterShop) query = query.eq('warehouse_id', filterShop);
        if (filterSupplier) query = query.eq('supplier_id', filterSupplier);
        if (filterPayment) query = query.eq('payment_type', filterPayment);

        const { data, error } = await query;
        if (error) throw error;

        state.data = data || [];
        state.filteredData = [...state.data];

        if (searchTerm) {
            const q = searchTerm.toLowerCase();
            state.filteredData = state.data.filter(p =>
                (p.reference_no && p.reference_no.toLowerCase().includes(q)) ||
                (p.supplier?.name && p.supplier.name.toLowerCase().includes(q)) ||
                (p.note && p.note.toLowerCase().includes(q))
            );
        }

        renderBody();
        document.getElementById('lastUpdated').textContent = new Date().toLocaleTimeString();
    } catch (err) {
        console.error('Load error:', err);
    } finally {
        toggleLoading(false);
    }
}

function getStatusBadgeClass(status) {
    switch (status.toLowerCase()) {
        case 'paid': return 'badge-paid';
        case 'partial': return 'badge-partial';
        case 'unpaid': return 'badge-unpaid';
        default: return 'bg-white/5 text-white/20';
    }
}

function updateTotals(amount, net, paid, remain) {
    document.getElementById('totalAmount').textContent = amount.toLocaleString();
    document.getElementById('totalNet').textContent = net.toLocaleString();
    document.getElementById('totalPaid').textContent = paid.toLocaleString();
    document.getElementById('totalRemain').textContent = remain.toLocaleString();
}

function logActivity(msg) {
    const el = document.getElementById('activityLog');
    if (el) el.textContent = msg;
}

function toggleLoading(show) {
    const el = document.getElementById('loadingStatus');
    if (el) show ? el.classList.remove('hidden') : el.classList.add('hidden');
}

function setupResizers() {
    let startX, startWidth, activeColIdx, tableWidth;

    document.getElementById('gridHeader').addEventListener('mousedown', e => {
        if (e.target.classList.contains('resizer')) {
            activeColIdx = parseInt(e.target.dataset.idx);
            const th = e.target.parentElement.parentElement;
            startX = e.pageX;
            startWidth = th.offsetWidth;
            tableWidth = document.getElementById('gridTable').offsetWidth;

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
        }
    });

    function handleMouseMove(e) {
        const diff = e.pageX - startX;
        const newWidthPx = Math.max(50, startWidth + diff);
        const newWidthPct = (newWidthPx / tableWidth) * 100;

        state.columns[activeColIdx].width = newWidthPct + '%';

        const ths = document.getElementById('gridHeader').querySelectorAll('th');
        // +1 because of row-idx column
        ths[activeColIdx + 1].style.width = newWidthPct + '%';

        // When using table-layout: fixed, the table will honor these percentages 
        // and adjust the rest of the columns if the total exceeds 100% or fits within it.
    }

    function handleMouseUp() {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'default';
    }
}

async function loadShops() {
    const { data } = await supabase.from('warehouses').select('id, name').order('name');
    const select = document.getElementById('filterShop');
    (data || []).forEach(shop => {
        const opt = document.createElement('option');
        opt.value = shop.id;
        opt.textContent = shop.name;
        select.appendChild(opt);
    });
}

async function loadSuppliers() {
    const { data } = await supabase.from('suppliers').select('id, name').order('name');
    const select = document.getElementById('filterSupplier');
    (data || []).forEach(supplier => {
        const opt = document.createElement('option');
        opt.value = supplier.id;
        opt.textContent = supplier.name;
        select.appendChild(opt);
    });
}

function viewPurchaseDetail(id) {
    if (window.parent && window.parent.switchView) {
        window.parent.switchView('purchase-add', { id: id });
    } else {
        window.location.href = `purchase-add.html?id=${id}`;
    }
}

function resetFilters() {
    document.getElementById('filterDate').value = '';
    document.getElementById('filterShop').value = '';
    document.getElementById('filterSupplier').value = '';
    document.getElementById('filterPayment').value = '';
    document.getElementById('searchBox').value = '';
    loadPurchases();
}

function debounce(func, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

document.addEventListener('DOMContentLoaded', init);
