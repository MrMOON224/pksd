/**
 * Warehouse Management Module
 * Handles loading, rendering, and CRUD operations for warehouses with high-density inline editing.
 */

const SCHEMA = [
    { id: 'select', label: '', width: '40px', align: 'center', noSort: true, type: 'checkbox' },
    { id: 'index', label: '#', width: '40px', align: 'center', noSort: true },
    { id: 'name', label: 'Warehouse Name*', width: '20%', minWidth: '150px' },
    { id: 'email', label: 'Email', width: '15%', minWidth: '150px' },
    { id: 'phone', label: 'Phone', width: '12%', minWidth: '120px' },
    { id: 'city', label: 'City', width: '12%', minWidth: '100px' },
    { id: 'country', label: 'Country', width: '12%', minWidth: '100px' },
    { id: 'zip_code', label: 'Zip Code', width: '10%', minWidth: '80px' },
    { id: 'actions', label: '', width: '50px', align: 'center', noSort: true }
];

let warehousesData = [];
let modifiedIds = new Set();
let deletedIds = new Set();
let selectedIds = new Set();

// --- Data Loading ---

window.loadWarehouses = async function () {
    try {
        updateSyncStatus('Loading...');

        // Check for local drafts
        const draft = localStorage.getItem('pos_draft_warehouses');
        if (draft) {
            const parsed = JSON.parse(draft);
            if ((parsed.modifiedIds.length > 0 || parsed.deletedIds.length > 0) && confirm('Resume unsaved warehouse changes?')) {
                warehousesData = parsed.warehousesData;
                modifiedIds = new Set(parsed.modifiedIds);
                deletedIds = new Set(parsed.deletedIds);
                renderGrid();
                updateSyncStatus('Unsaved Changes (Local)');
                return;
            } else {
                localStorage.removeItem('pos_draft_warehouses');
            }
        }

        const { data, error } = await window.supabase
            .from('warehouses')
            .select('*')
            .order('name');

        if (error) throw error;
        warehousesData = data || [];
        modifiedIds.clear();
        deletedIds.clear();
        renderGrid();
        updateSyncStatus('Synced to Supabase');
    } catch (e) {
        console.error('Error loading warehouses:', e);
        updateSyncStatus('Error Loading Data');
    }
};

function saveDraft() {
    const draft = {
        warehousesData,
        modifiedIds: Array.from(modifiedIds),
        deletedIds: Array.from(deletedIds)
    };
    localStorage.setItem('pos_draft_warehouses', JSON.stringify(draft));
    updateSyncStatus('Unsaved Changes (Local)');
}

function clearDraft() {
    localStorage.removeItem('pos_draft_warehouses');
}

function updateSyncStatus(status) {
    if (typeof window.updateModuleSyncStatus === 'function') {
        window.updateModuleSyncStatus('Warehouses', status);
    }
}

// --- Grid Rendering ---

function renderHeader() {
    const thead = document.getElementById('gridHeader');
    if (!thead) return;

    let html = '<tr>';
    SCHEMA.forEach((col, index) => {
        const isLast = index === SCHEMA.length - 1;
        const isCheckbox = col.id === 'select';

        html += `
            <th style="width: ${col.width}; min-width: ${col.minWidth || 'auto'}; text-align: ${col.align || 'left'};">
                <div class="header-cell">
                    ${isCheckbox ? `
                        <label class="checkbox-container">
                            <input type="checkbox" onchange="toggleSelectAll(this)">
                            <span class="checkmark"></span>
                        </label>
                    ` : `<span>${col.label}</span>`}
                    ${(!isLast && !isCheckbox) ? `<div class="resizer" data-index="${index}"></div>` : ''}
                </div>
            </th>
        `;
    });
    html += '</tr>';
    thead.innerHTML = html;
    setupResizers();
}

function renderBody() {
    const tbody = document.getElementById('gridBody');
    if (!tbody) return;

    if (warehousesData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${SCHEMA.length}" class="empty-state">No warehouses found.</td></tr>`;
        return;
    }

    tbody.innerHTML = warehousesData.map((w, index) => {
        const isModified = modifiedIds.has(w.id);
        const isNew = w.id && w.id.toString().startsWith('new_');
        const isSelected = selectedIds.has(w.id);

        return `
            <tr class="excel-tr ${isModified ? 'modified' : ''} ${isNew ? 'new-row' : ''}" data-index="${index}">
                <td style="text-align: center;">
                    <label class="checkbox-container">
                        <input type="checkbox" class="selection-checkbox" onchange="handleSelectionChange(this)" data-id="${w.id}" ${isSelected ? 'checked' : ''}>
                        <span class="checkmark"></span>
                    </label>
                </td>
                <td style="text-align: center;">${index + 1}</td>
                <td><input type="text" class="excel-input" value="${escapeHtml(w.name || '')}" data-field="name" oninput="markModified(this)" placeholder="Required"></td>
                <td><input type="text" class="excel-input" value="${escapeHtml(w.email || '')}" data-field="email" oninput="markModified(this)" placeholder="Optional"></td>
                <td><input type="text" class="excel-input" value="${escapeHtml(w.phone || '')}" data-field="phone" oninput="markModified(this)" placeholder="Optional"></td>
                <td><input type="text" class="excel-input" value="${escapeHtml(w.city || '')}" data-field="city" oninput="markModified(this)" placeholder="Optional"></td>
                <td><input type="text" class="excel-input" value="${escapeHtml(w.country || '')}" data-field="country" oninput="markModified(this)" placeholder="Optional"></td>
                <td><input type="text" class="excel-input" value="${escapeHtml(w.zip_code || '')}" data-field="zip_code" oninput="markModified(this)" placeholder="Optional"></td>
                <td class="action-cell">
                    <button class="btn-premium-delete" onclick="deleteWarehouse(${index})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

window.renderGrid = function () {
    renderHeader();
    renderBody();
    updateBulkToolbar();
};

// --- CRUD Operations ---

window.addNewWarehouse = function () {
    const newWarehouse = {
        id: 'new_' + Date.now(),
        name: '',
        email: '',
        phone: '',
        city: '',
        country: '',
        zip_code: ''
    };
    warehousesData.push(newWarehouse);
    modifiedIds.add(newWarehouse.id);
    renderGrid();

    // Focus the name input of the new row
    setTimeout(() => {
        const rows = document.querySelectorAll('.excel-tr');
        const lastRow = rows[rows.length - 1];
        if (lastRow) {
            const input = lastRow.querySelector('input[data-field="name"]');
            if (input) input.focus();
        }
    }, 50);
    saveDraft();
};

window.markModified = function (input) {
    const tr = input.closest('tr');
    const index = parseInt(tr.dataset.index);
    const field = input.dataset.field;
    const value = input.value;

    warehousesData[index][field] = value;
    modifiedIds.add(warehousesData[index].id);
    tr.classList.add('modified');
    saveDraft();
};

window.deleteWarehouse = function (index) {
    const w = warehousesData[index];
    if (confirm(`Are you sure you want to delete "${w.name || 'this warehouse'}"?`)) {
        if (!w.id.toString().startsWith('new_')) {
            deletedIds.add(w.id);
        }
        modifiedIds.delete(w.id);
        selectedIds.delete(w.id);
        warehousesData.splice(index, 1);
        renderBody();
        saveDraft();
        updateBulkToolbar();
    }
};

window.saveChanges = async function () {
    const btn = document.getElementById('saveBtn');
    if (!btn) return;
    const originalContent = btn.innerHTML;

    try {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        btn.disabled = true;

        // 1. Delete
        if (deletedIds.size > 0) {
            const { error } = await window.supabase
                .from('warehouses')
                .delete()
                .in('id', Array.from(deletedIds));
            if (error) throw error;
        }

        // 2. Upsert (Created/Modified)
        const toSave = warehousesData
            .filter(w => modifiedIds.has(w.id))
            .map(w => {
                const payload = {
                    name: w.name,
                    email: w.email,
                    phone: w.phone,
                    city: w.city,
                    country: w.country,
                    zip_code: w.zip_code
                };
                if (!w.id.toString().startsWith('new_')) {
                    payload.id = w.id;
                }
                return payload;
            })
            .filter(w => w.name); // Basic validation

        if (toSave.length > 0) {
            const { error } = await window.supabase
                .from('warehouses')
                .upsert(toSave);
            if (error) throw error;
        }

        alert('Changes saved successfully!');
        clearDraft();
        await window.loadWarehouses();

        if (window.parent && typeof window.parent.loadReferenceData === 'function') {
            await window.parent.loadReferenceData();
        }
    } catch (err) {
        console.error(err);
        alert('Error: ' + err.message);
    } finally {
        btn.innerHTML = originalContent;
        btn.disabled = false;
    }
};

// --- Selection & Bulk Actions ---

window.toggleSelectAll = function (master) {
    const table = master.closest('table');
    const checkboxes = table.querySelectorAll('tbody .selection-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = master.checked;
        const id = cb.dataset.id;
        if (master.checked) selectedIds.add(id);
        else selectedIds.delete(id);
    });
    updateBulkToolbar();
};

window.handleSelectionChange = function (cb) {
    const id = cb.dataset.id;
    if (cb.checked) selectedIds.add(id);
    else selectedIds.delete(id);
    updateBulkToolbar();
};

function updateBulkToolbar() {
    const toolbar = document.getElementById('bulkToolbar');
    const countEl = document.getElementById('selectedCount');
    if (!toolbar || !countEl) return;

    if (selectedIds.size > 0) {
        toolbar.classList.remove('hidden');
        countEl.textContent = selectedIds.size;
    } else {
        toolbar.classList.add('hidden');
    }
}

window.clearSelection = function () {
    selectedIds.clear();
    const master = document.querySelector('thead input[type="checkbox"]');
    if (master) master.checked = false;
    const items = document.querySelectorAll('tbody .selection-checkbox');
    items.forEach(i => i.checked = false);
    updateBulkToolbar();
};

window.bulkDelete = async function () {
    if (selectedIds.size === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedIds.size} selected warehouses?`)) {
        try {
            updateSyncStatus('Deleting...');
            const idsToDelete = Array.from(selectedIds);
            const realIds = idsToDelete.filter(id => !id.toString().startsWith('new_'));

            if (realIds.length > 0) {
                const { error } = await window.supabase.from('warehouses').delete().in('id', realIds);
                if (error) throw error;
            }

            warehousesData = warehousesData.filter(w => !selectedIds.has(w.id));
            selectedIds.clear();
            renderGrid();
            saveDraft();
            alert('Bulk deletion complete.');

            if (window.parent && typeof window.parent.loadReferenceData === 'function') {
                await window.parent.loadReferenceData();
            }
        } catch (e) {
            console.error(e);
            alert('Error deleting: ' + e.message);
        }
    }
};

// --- Utilities & Layout ---

function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function setupResizers() {
    const table = document.querySelector('.excel-table');
    const headerRow = document.getElementById('gridHeader');
    if (!table || !headerRow) return;

    const resizers = headerRow.querySelectorAll('.resizer');
    const cols = headerRow.querySelectorAll('th');

    resizers.forEach(resizer => {
        resizer.addEventListener('mousedown', function (e) {
            e.preventDefault();
            const index = parseInt(this.dataset.index);
            const col = cols[index];
            const nextCol = cols[index + 1];
            if (!nextCol) return;

            const startX = e.pageX;
            const startWidth = col.offsetWidth;
            const nextStartWidth = nextCol.offsetWidth;
            const tableWidth = table.offsetWidth;

            function onMouseMove(e) {
                const diff = e.pageX - startX;
                const newWidthPx = startWidth + diff;
                const newNextWidthPx = nextStartWidth - diff;

                if (newWidthPx > 50 && newNextWidthPx > 50) {
                    const newWidthPct = (newWidthPx / tableWidth) * 100;
                    const newNextWidthPct = (newNextWidthPx / tableWidth) * 100;
                    col.style.width = newWidthPct + '%';
                    nextCol.style.width = newNextWidthPct + '%';
                }
            }

            function onMouseUp() {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                document.body.style.cursor = 'default';
            }

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            document.body.style.cursor = 'col-resize';
        });
    });
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    if (window.supabase || (window.parent && window.parent.supabase)) {
        if (!window.supabase) window.supabase = window.parent.supabase;
        window.loadWarehouses();
    }
});
