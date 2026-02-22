/**
 * Unit Management Module
 * Handles loading, rendering, and CRUD operations for units with high-density inline editing.
 */

const SCHEMA = [
    { id: 'select', label: '', width: '40px', align: 'center', noSort: true, type: 'checkbox' },
    { id: 'index', label: '#', width: '40px', align: 'center', noSort: true },
    { id: 'name', label: 'Unit Name*', width: '40%', minWidth: '150px' },
    { id: 'short_name', label: 'Short Name*', width: '30%', minWidth: '100px' },
    { id: 'allow_decimals', label: 'Allow Decimals', width: '120px', align: 'center' },
    { id: 'actions', label: '', width: '50px', align: 'center', noSort: true }
];

let unitsData = [];
let modifiedIds = new Set();
let deletedIds = new Set();
let selectedIds = new Set();

// --- Data Loading ---

window.loadUnits = async function () {
    try {
        updateSyncStatus('Loading...');

        const draft = localStorage.getItem('pos_draft_units');
        if (draft) {
            const parsed = JSON.parse(draft);
            if ((parsed.modifiedIds.length > 0 || parsed.deletedIds.length > 0) && confirm('Resume unsaved unit changes?')) {
                unitsData = parsed.unitsData;
                modifiedIds = new Set(parsed.modifiedIds);
                deletedIds = new Set(parsed.deletedIds);
                renderGrid();
                updateSyncStatus('Unsaved Changes (Local)');
                return;
            } else {
                localStorage.removeItem('pos_draft_units');
            }
        }

        const { data, error } = await window.supabase
            .from('units')
            .select('*')
            .order('name');

        if (error) throw error;
        unitsData = data || [];
        modifiedIds.clear();
        deletedIds.clear();
        renderGrid();
        updateSyncStatus('Synced to Supabase');
    } catch (e) {
        console.error('Error loading units:', e);
        updateSyncStatus('Error Loading Data');
    }
};

function saveDraft() {
    const draft = {
        unitsData,
        modifiedIds: Array.from(modifiedIds),
        deletedIds: Array.from(deletedIds)
    };
    localStorage.setItem('pos_draft_units', JSON.stringify(draft));
    updateSyncStatus('Unsaved Changes (Local)');
}

function clearDraft() {
    localStorage.removeItem('pos_draft_units');
}

function updateSyncStatus(status) {
    if (typeof window.updateModuleSyncStatus === 'function') {
        window.updateModuleSyncStatus('Units', status);
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

    if (unitsData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${SCHEMA.length}" class="empty-state">No units found.</td></tr>`;
        return;
    }

    tbody.innerHTML = unitsData.map((u, index) => {
        const isModified = modifiedIds.has(u.id);
        const isNew = u.id && u.id.toString().startsWith('new_');
        const isSelected = selectedIds.has(u.id);

        return `
            <tr class="excel-tr ${isModified ? 'modified' : ''} ${isNew ? 'new-row' : ''}" data-index="${index}">
                <td style="text-align: center;">
                    <label class="checkbox-container">
                        <input type="checkbox" class="selection-checkbox" onchange="handleSelectionChange(this)" data-id="${u.id}" ${isSelected ? 'checked' : ''}>
                        <span class="checkmark"></span>
                    </label>
                </td>
                <td style="text-align: center;">${index + 1}</td>
                <td><input type="text" class="excel-input" value="${escapeHtml(u.name || '')}" data-field="name" oninput="markModified(this)" placeholder="Required"></td>
                <td><input type="text" class="excel-input" value="${escapeHtml(u.short_name || '')}" data-field="short_name" oninput="markModified(this)" placeholder="Required"></td>
                <td style="text-align: center;">
                    <label class="checkbox-container">
                        <input type="checkbox" ${u.allow_decimals ? 'checked' : ''} onchange="markModified(this, true)" data-field="allow_decimals">
                        <span class="checkmark"></span>
                    </label>
                </td>
                <td class="action-cell" style="text-align: center;">
                    <button class="btn-premium-danger" onclick="deleteUnit(${index})" title="Delete">
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
};

// --- CRUD Operations ---

window.addNewUnit = function () {
    const newUnit = {
        id: 'new_' + Date.now(),
        name: '',
        short_name: '',
        allow_decimals: false
    };
    unitsData.push(newUnit);
    modifiedIds.add(newUnit.id);
    renderBody();

    // Focus the name input
    const rows = document.querySelectorAll('.excel-tr');
    const lastRow = rows[rows.length - 1];
    if (lastRow) {
        const input = lastRow.querySelector('input[data-field="name"]');
        if (input) input.focus();
    }
    saveDraft();
};

window.markModified = function (input, isCheckbox = false) {
    const tr = input.closest('tr');
    const index = parseInt(tr.dataset.index);
    const field = input.dataset.field;
    const value = isCheckbox ? input.checked : input.value;

    unitsData[index][field] = value;
    modifiedIds.add(unitsData[index].id);
    tr.classList.add('modified');
    saveDraft();
};

window.deleteUnit = function (index) {
    const u = unitsData[index];
    if (confirm(`Are you sure you want to delete "${u.name || 'this unit'}"?`)) {
        if (!u.id.toString().startsWith('new_')) {
            deletedIds.add(u.id);
        }
        modifiedIds.delete(u.id);
        selectedIds.delete(u.id);
        unitsData.splice(index, 1);
        renderBody();
        saveDraft();
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
                .from('units')
                .delete()
                .in('id', Array.from(deletedIds));
            if (error) throw error;
        }

        // 2. Upsert
        const toSave = unitsData
            .filter(u => modifiedIds.has(u.id))
            .map(u => {
                const payload = {
                    name: u.name,
                    short_name: u.short_name,
                    allow_decimals: u.allow_decimals
                };
                if (!u.id.toString().startsWith('new_')) {
                    payload.id = u.id;
                }
                return payload;
            })
            .filter(u => u.name && u.short_name);

        if (toSave.length > 0) {
            const { error } = await window.supabase
                .from('units')
                .upsert(toSave);
            if (error) throw error;
        }

        alert('Changes saved successfully!');
        clearDraft();
        await window.loadUnits();

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
};

window.handleSelectionChange = function (cb) {
    const id = cb.dataset.id;
    if (cb.checked) selectedIds.add(id);
    else selectedIds.delete(id);
};

window.clearSelection = function () {
    selectedIds.clear();
    const master = document.querySelector('thead input[type="checkbox"]');
    if (master) master.checked = false;
    const items = document.querySelectorAll('tbody .selection-checkbox');
    items.forEach(i => i.checked = false);
};

window.bulkDelete = async function () {
    if (selectedIds.size === 0) {
        alert('Please select items to delete.');
        return;
    }
    if (confirm(`Are you sure you want to delete ${selectedIds.size} selected units?`)) {
        try {
            updateSyncStatus('Deleting...');
            const idsToDelete = Array.from(selectedIds);
            const realIds = idsToDelete.filter(id => !id.toString().startsWith('new_'));

            if (realIds.length > 0) {
                const { error } = await window.supabase.from('units').delete().in('id', realIds);
                if (error) throw error;
            }

            unitsData = unitsData.filter(u => !selectedIds.has(u.id));
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

// --- Arrow Key Navigation ---
function getGridInputs() {
    const rows = document.querySelectorAll('#gridBody .excel-tr');
    const inputs = [];
    rows.forEach((row, rowIdx) => {
        const rowInputs = row.querySelectorAll('input.excel-input');
        rowInputs.forEach(input => {
            inputs.push({ row: rowIdx, input: input, field: input.dataset.field });
        });
    });
    return inputs;
}

function moveGridFocus(currentInput, direction) {
    const allInputs = getGridInputs();
    const currentIdx = allInputs.findIndex(i => i.input === currentInput);
    if (currentIdx === -1) return;

    let targetIdx = currentIdx;
    const numCols = 4; // name, short_name, description,

    if (direction === 'right') {
        targetIdx = currentIdx + 1;
    } else if (direction === 'left') {
        targetIdx = currentIdx - 1;
    } else if (direction === 'down') {
        targetIdx = currentIdx + numCols;
    } else if (direction === 'up') {
        targetIdx = currentIdx - numCols;
    }

    if (targetIdx >= 0 && targetIdx < allInputs.length) {
        allInputs[targetIdx].input.focus();
        allInputs[targetIdx].input.select();
    }
}

function setupGridKeyNavigation() {
    document.addEventListener('keydown', (e) => {
        if (!e.target.classList.contains('excel-input')) return;
        
        const input = e.target;
        const row = input.closest('.excel-tr');
        if (!row) return;

        if (e.key === 'Enter') {
            e.preventDefault();
            moveGridFocus(input, 'right');
        } else if (e.key === 'ArrowRight') {
            const selStart = input.selectionStart;
            const val = input.value;
            if (selStart === val.length) {
                e.preventDefault();
                moveGridFocus(input, 'right');
            }
        } else if (e.key === 'ArrowLeft') {
            const selStart = input.selectionStart;
            if (selStart === 0) {
                e.preventDefault();
                moveGridFocus(input, 'left');
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            moveGridFocus(input, 'down');
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            moveGridFocus(input, 'up');
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.supabase || (window.parent && window.parent.supabase)) {
        if (!window.supabase) window.supabase = window.parent.supabase;
        setupGridKeyNavigation();
        window.loadUnits();
    }
});
