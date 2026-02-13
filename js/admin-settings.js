/**
 * Admin Dashboard - Settings & Configuration Module
 * Handles Brands, Units, Warehouses, and Stock Adjustments.
 */

// --- Brands State ---
window.brandsData = [];
window.modifiedBrands = new Set();
window.deletedBrands = new Set();

window.saveBrandsDraft = function () {
    try {
        const draft = {
            brandsData: window.brandsData,
            modifiedBrands: Array.from(window.modifiedBrands),
            deletedBrands: Array.from(window.deletedBrands)
        };
        localStorage.setItem('pos_draft_brands', JSON.stringify(draft));
        window.updateModuleSyncStatus('Brands', 'Unsaved Changes (Local)');
    } catch (e) { console.error(e); }
};

window.clearBrandsDraft = function () {
    localStorage.removeItem('pos_draft_brands');
    window.updateModuleSyncStatus('Brands', 'Synced to Supabase');
};

window.loadBrands = async function () {
    try {
        // Check draft
        const localDraft = localStorage.getItem('pos_draft_brands');
        if (localDraft) {
            try {
                const draft = JSON.parse(localDraft);
                const hasMods = (draft.modifiedBrands && draft.modifiedBrands.length > 0) ||
                    (draft.deletedBrands && draft.deletedBrands.length > 0);

                if (hasMods && confirm('Resume unsaved brand changes?')) {
                    window.brandsData = draft.brandsData;
                    window.modifiedBrands = new Set(draft.modifiedBrands);
                    window.deletedBrands = new Set(draft.deletedBrands);
                    window.renderBrands();
                    window.updateModuleSyncStatus('Brands', 'Unsaved Changes (Local)');
                    return;
                } else {
                    localStorage.removeItem('pos_draft_brands');
                }
            } catch (e) {
                localStorage.removeItem('pos_draft_brands');
            }
        }

        const { data, error } = await window.supabase
            .from('brands')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;
        window.brandsData = data || [];
        window.renderBrands();
        window.modifiedBrands.clear();
        window.deletedBrands.clear();
        window.updateModuleSyncStatus('Brands', 'Synced to Supabase');
    } catch (error) {
        console.error('Error loading brands:', error);
        alert('Failed to load brands');
    }
};

window.renderBrands = function () {
    const tbody = document.getElementById('brandsBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    window.brandsData.forEach((brand, index) => {
        const isSelected = window.selectedIds && window.selectedIds.has(brand.id);
        const tr = document.createElement('tr');
        tr.className = 'excel-tr';
        if (window.modifiedBrands.has(brand.id)) tr.classList.add('modified');
        if (brand.id && brand.id.toString().startsWith('new_')) tr.classList.add('new-row');
        tr.dataset.index = index;
        tr.innerHTML = `
            <td style="text-align: center;"><input type="checkbox" class="selection-checkbox" data-id="${brand.id}" ${isSelected ? 'checked' : ''} onchange="window.handleSelectionChange(this)"></td>
            <td>${index + 1}</td>
            <td><input type="text" class="excel-input" value="${window.escapeHtml(brand.name || '')}" data-field="name" oninput="markBrandModified(this)"></td>
            <td><input type="text" class="excel-input" value="${window.escapeHtml(brand.description || '')}" data-field="description" oninput="markBrandModified(this)"></td>
            <td><input type="text" class="excel-input" value="${window.escapeHtml(brand.website || '')}" data-field="website" oninput="markBrandModified(this)"></td>
            <td class="action-cell"><button class="btn-premium-danger" onclick="deleteBrand(${index})" title="Delete"><i class="fas fa-trash"></i></button></td>
        `;
        tbody.appendChild(tr);
    });
};

window.markBrandModified = function (input) {
    const tr = input.closest('tr');
    const index = parseInt(tr.dataset.index);
    const brand = window.brandsData[index];
    brand[input.dataset.field] = input.value;
    window.modifiedBrands.add(brand.id);
    tr.classList.add('modified');
    window.saveBrandsDraft();
};

window.addNewBrand = function () {
    const newBrand = { id: crypto.randomUUID(), name: '', description: '', website: '', isNew: true };
    window.brandsData.push(newBrand);
    window.modifiedBrands.add(newBrand.id);
    window.renderBrands();
    const lastTr = document.getElementById('brandsBody').lastElementChild;
    if (lastTr) lastTr.querySelector('input[data-field="name"]').focus();
    window.saveBrandsDraft();
};

window.deleteBrand = function (index) {
    if (confirm('Delete this brand?')) {
        const brand = window.brandsData[index];
        if (brand.id && !brand.id.toString().startsWith('new_')) {
            window.deletedBrands.add(brand.id);
        }
        window.modifiedBrands.delete(brand.id);
        window.brandsData.splice(index, 1);
        window.renderBrands();
        window.saveBrandsDraft();
    }
};

// Utility: HTML Escaping
window.escapeHtml = window.escapeHtml || function (text) {
    if (!text) return "";
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};

window.saveBrandChanges = async function () {
    try {
        window.showLoading();
        // Delete
        if (window.deletedBrands.size > 0) {
            await window.supabase.from('brands').delete().in('id', Array.from(window.deletedBrands));
        }

        // Upsert
        const toSave = Array.from(window.modifiedBrands)
            .map(id => window.brandsData.find(b => b.id === id))
            .filter(b => b && b.name);

        if (toSave.length > 0) {
            const { error } = await window.supabase.from('brands').upsert(toSave.map(b => ({
                id: b.id,
                name: b.name,
                description: b.description,
                website: b.website
            })));
            if (error) throw error;
        }

        var delBrands = Array.from(window.deletedBrands);
        window.modifiedBrands.clear();
        window.deletedBrands.clear();
        window.clearBrandsDraft();

        alert('Saved!');

        if (delBrands.length > 0) window.brandsData = window.brandsData.filter(b => delBrands.indexOf(b.id) === -1);
        window.brandsData.forEach(b => { if (b.isNew) b.isNew = false; });

        window.renderBrands();

        // Sync with parent if in iframe
        const isIframe = window.parent && window.parent !== window;
        const parentWindow = isIframe ? window.parent : window;

        if (typeof parentWindow.loadReferenceData === 'function') await parentWindow.loadReferenceData();

        const checkDoc = parentWindow.document;
        if (checkDoc.getElementById('view-products') && !checkDoc.getElementById('view-products').classList.contains('hidden')) {
            if (typeof parentWindow.renderGrid === 'function') parentWindow.renderGrid();
        }
    } catch (e) {
        console.error(e);
        alert('Error saving: ' + e.message);
    } finally {
        window.hideLoading();
    }
};

// --- Units State ---
window.unitsData = [];
window.modifiedUnits = new Set();
window.deletedUnits = new Set();

window.saveUnitsDraft = function () {
    try {
        const draft = {
            unitsData: window.unitsData,
            modifiedUnits: Array.from(window.modifiedUnits),
            deletedUnits: Array.from(window.deletedUnits)
        };
        localStorage.setItem('pos_draft_units', JSON.stringify(draft));
        window.updateModuleSyncStatus('Units', 'Unsaved Changes (Local)');
    } catch (e) { console.error(e); }
};

window.clearUnitsDraft = function () {
    localStorage.removeItem('pos_draft_units');
    window.updateModuleSyncStatus('Units', 'Synced to Supabase');
};

window.loadUnits = async function () {
    try {
        // Check draft
        const localDraft = localStorage.getItem('pos_draft_units');
        if (localDraft) {
            try {
                const draft = JSON.parse(localDraft);
                const hasMods = (draft.modifiedUnits && draft.modifiedUnits.length > 0) ||
                    (draft.deletedUnits && draft.deletedUnits.length > 0);

                if (hasMods && confirm('Resume unsaved unit changes?')) {
                    window.unitsData = draft.unitsData;
                    window.modifiedUnits = new Set(draft.modifiedUnits);
                    window.deletedUnits = new Set(draft.deletedUnits);
                    window.renderUnits();
                    window.updateModuleSyncStatus('Units', 'Unsaved Changes (Local)');
                    return;
                } else {
                    localStorage.removeItem('pos_draft_units');
                }
            } catch (e) {
                localStorage.removeItem('pos_draft_units');
            }
        }

        const { data, error } = await window.supabase.from('units').select('*').order('name');
        if (error) throw error;
        window.unitsData = data || [];
        window.renderUnits();
        window.modifiedUnits.clear();
        window.deletedUnits.clear();
        window.updateModuleSyncStatus('Units', 'Synced to Supabase');
    } catch (e) { console.error(e); alert('Failed to load units'); }
};

window.renderUnits = function () {
    const tbody = document.getElementById('unitsBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    window.unitsData.forEach((u, index) => {
        const isSelected = window.selectedIds && window.selectedIds.has(u.id);
        const tr = document.createElement('tr');
        tr.className = 'excel-tr';
        if (window.modifiedUnits.has(u.id)) tr.classList.add('modified');
        if (u.id && u.id.toString().startsWith('new_')) tr.classList.add('new-row');
        tr.dataset.index = index;
        tr.innerHTML = `
            <td style="text-align: center;"><input type="checkbox" class="selection-checkbox" data-id="${u.id}" ${isSelected ? 'checked' : ''} onchange="window.handleSelectionChange(this)"></td>
            <td>${index + 1}</td>
            <td><input type="text" class="excel-input" value="${window.escapeHtml(u.name || '')}" data-field="name" oninput="markUnitModified(this)"></td>
            <td><input type="text" class="excel-input" value="${window.escapeHtml(u.short_name || '')}" data-field="short_name" oninput="markUnitModified(this)"></td>
            <td style="text-align: center;"><input type="checkbox" ${u.allow_decimals ? 'checked' : ''} onchange="markUnitModified(this, true)" data-field="allow_decimals"></td>
            <td class="action-cell"><button class="btn-premium-danger" onclick="deleteUnit(${index})" title="Delete"><i class="fas fa-trash"></i></button></td>
        `;
        tbody.appendChild(tr);
    });
};

window.markUnitModified = function (input, isCheckbox = false) {
    const tr = input.closest('tr');
    const index = parseInt(tr.dataset.index);
    const unit = window.unitsData[index];
    const val = isCheckbox ? input.checked : input.value;
    unit[input.dataset.field] = val;
    window.modifiedUnits.add(unit.id);
    tr.classList.add('modified');
    window.saveUnitsDraft();
};

window.addNewUnit = function () {
    const newUnit = { id: crypto.randomUUID(), name: '', short_name: '', allow_decimals: false, isNew: true };
    window.unitsData.push(newUnit);
    window.modifiedUnits.add(newUnit.id);
    window.renderUnits();
    const lastTr = document.getElementById('unitsBody').lastElementChild;
    if (lastTr) lastTr.querySelector('input[data-field="name"]').focus();
    window.saveUnitsDraft();
};

window.deleteUnit = function (index) {
    if (confirm('Delete unit?')) {
        const unit = window.unitsData[index];
        if (unit.id && !unit.id.toString().startsWith('new_')) {
            window.deletedUnits.add(unit.id);
        }
        window.modifiedUnits.delete(unit.id);
        window.unitsData.splice(index, 1);
        window.renderUnits();
        window.saveUnitsDraft();
    }
};

window.saveUnitChanges = async function () {
    try {
        window.showLoading();
        if (window.deletedUnits.size > 0) {
            await window.supabase.from('units').delete().in('id', Array.from(window.deletedUnits));
        }
        const toSave = Array.from(window.modifiedUnits)
            .map(id => window.unitsData.find(u => u.id === id))
            .filter(u => u && u.name && u.short_name);

        if (toSave.length > 0) {
            const { error } = await window.supabase.from('units').upsert(toSave.map(u => ({
                id: u.id,
                name: u.name,
                short_name: u.short_name,
                allow_decimals: u.allow_decimals
            })));
            if (error) throw error;
        }

        var delUnits = Array.from(window.deletedUnits);
        window.modifiedUnits.clear();
        window.deletedUnits.clear();
        window.clearUnitsDraft();

        alert('Saved!');

        if (delUnits.length > 0) window.unitsData = window.unitsData.filter(u => delUnits.indexOf(u.id) === -1);
        window.unitsData.forEach(u => { if (u.isNew) u.isNew = false; });

        window.renderUnits();

        // Sync with parent if in iframe
        const isIframe = window.parent && window.parent !== window;
        const parentWindow = isIframe ? window.parent : window;

        if (typeof parentWindow.loadReferenceData === 'function') await parentWindow.loadReferenceData();

        const checkDoc = parentWindow.document;
        if (checkDoc.getElementById('view-products') && !checkDoc.getElementById('view-products').classList.contains('hidden')) {
            if (typeof parentWindow.renderGrid === 'function') parentWindow.renderGrid();
        }
    } catch (e) { console.error(e); alert('Error saving: ' + e.message); }
    finally { window.hideLoading(); }
};

// --- Stock Adjustments ---
// Legacy logic removed. Adjustments are now handled via adjustment.html iframe.

// --- Warehouses Management ---
window.warehousesListData = [];

window.loadWarehousesList = async function () {
    try {
        window.updateModuleSyncStatus('Warehouses', 'Loading...');
        const { data, error } = await window.supabase
            .from('warehouses')
            .select('*')
            .order('name');

        if (error) throw error;
        window.warehousesListData = data || [];
        window.renderWarehousesList();
        window.updateModuleSyncStatus('Warehouses', 'Synced to Supabase');
    } catch (e) {
        console.error('Error loading warehouses:', e);
        window.updateModuleSyncStatus('Warehouses', 'Error Loading Data');
    }
};

window.renderWarehousesList = function () {
    const tbody = document.getElementById('warehousesListBody');
    if (!tbody) return;

    if (window.warehousesListData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No warehouses found.</td></tr>';
        return;
    }

    tbody.innerHTML = window.warehousesListData.map((w, index) => {
        return `
            <tr class="excel-tr">
                <td>${index + 1}</td>
                <td style="font-weight:600;">${window.escapeHtml(w.name)}</td>
                <td>${window.escapeHtml(w.email || '-')}</td>
                <td>${window.escapeHtml(w.phone || '-')}</td>
                <td>${window.escapeHtml(w.city || '')}${w.city && w.country ? ', ' : ''}${window.escapeHtml(w.country || '')}</td>
                <td class="action-cell">
                    <button class="btn-icon" onclick="editWarehouse('${w.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon" onclick="deleteWarehouse('${w.id}')" title="Delete" style="color:var(--error);">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
};

window.openWarehouseModal = function (id = null) {
    const modal = document.getElementById('warehouseModal');
    const form = document.getElementById('warehouseForm');
    if (!modal || !form) return;

    form.reset();
    document.getElementById('warehouseId').value = id || '';

    if (id) {
        const w = window.warehousesListData.find(x => x.id === id);
        if (w) {
            document.getElementById('warehouseName').value = w.name;
            document.getElementById('warehouseEmail').value = w.email || '';
            document.getElementById('warehousePhone').value = w.phone || '';
            document.getElementById('warehouseCountry').value = w.country || '';
            document.getElementById('warehouseCity').value = w.city || '';
            document.getElementById('warehouseZip').value = w.zip_code || '';
        }
    }

    modal.classList.remove('hidden');
};

window.closeWarehouseModal = function () {
    document.getElementById('warehouseModal').classList.add('hidden');
};

window.editWarehouse = function (id) {
    window.openWarehouseModal(id);
};

window.handleSaveWarehouse = async function (e) {
    e.preventDefault();
    const btn = document.getElementById('saveWarehouseBtn');
    if (!btn) return;
    const originalText = btn.innerHTML;

    const id = document.getElementById('warehouseId').value;
    const payload = {
        name: document.getElementById('warehouseName').value,
        email: document.getElementById('warehouseEmail').value,
        phone: document.getElementById('warehousePhone').value,
        country: document.getElementById('warehouseCountry').value,
        city: document.getElementById('warehouseCity').value,
        zip_code: document.getElementById('warehouseZip').value
    };

    try {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        btn.disabled = true;

        let res;
        if (id) {
            res = await window.supabase.from('warehouses').update(payload).eq('id', id);
        } else {
            res = await window.supabase.from('warehouses').insert([payload]);
        }

        if (res.error) throw res.error;

        alert('Warehouse saved successfully!');
        window.closeWarehouseModal();
        window.loadWarehousesList();
        if (typeof window.loadReferenceData === 'function') await window.loadReferenceData();
    } catch (err) {
        console.error(err);
        alert('Error: ' + err.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
};

window.deleteWarehouse = async function (id) {
    if (!confirm('Are you sure you want to delete this warehouse? This might affect records linked to it.')) return;

    try {
        const { error } = await window.supabase.from('warehouses').delete().eq('id', id);
        if (error) throw error;
        alert('Warehouse deleted successfully!');
        window.loadWarehousesList();
        if (typeof window.loadReferenceData === 'function') await window.loadReferenceData();
    } catch (err) {
        console.error(err);
        alert('Error: ' + err.message);
    }
};

window.executeBulkDelete = async function (ids) {
    if (!ids || ids.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${ids.length} selected items?`)) return;

    window.showLoading();
    try {
        let table = '';
        if (document.getElementById('brandsBody')) {
            table = 'brands';
        } else if (document.getElementById('unitsBody')) {
            table = 'units';
        }

        if (!table) throw new Error('Could not determine active table for deletion');

        const { error } = await window.supabase.from(table).delete().in('id', ids);
        if (error) throw error;

        // Clear local selection
        if (window.clearSelection) window.clearSelection();

        alert('Bulk deletion successful!');

        // Refresh data
        if (table === 'brands') {
            await window.loadBrands();
        } else {
            await window.loadUnits();
        }

        // Sync with parent grid if needed
        const isIframe = window.parent && window.parent !== window;
        const parentWindow = isIframe ? window.parent : window;

        if (typeof parentWindow.loadReferenceData === 'function') await parentWindow.loadReferenceData();

        const checkDoc = parentWindow.document;
        if (checkDoc.getElementById('view-products') && !checkDoc.getElementById('view-products').classList.contains('hidden')) {
            if (typeof parentWindow.renderGrid === 'function') parentWindow.renderGrid();
        }

    } catch (e) {
        console.error('Bulk delete error:', e);
        alert('Failed to delete items: ' + e.message);
    } finally {
        window.hideLoading();
    }
};
