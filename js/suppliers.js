/**
 * Suppliers Module Logic - List & Modal Style
 */

let allSuppliers = [];
let filteredSuppliers = [];

window.loadData = async function () {
    updateSyncStatus('Loading...');
    try {
        const { data, error } = await window.supabase
            .from('suppliers')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;
        allSuppliers = data || [];
        filteredSuppliers = [...allSuppliers];
        window.renderGrid();
        updateSyncStatus('Synced to Supabase');
    } catch (e) {
        console.error('Load error:', e);
        updateSyncStatus('Error sync');
        alert('Load error: ' + e.message);
    }
};

window.renderGrid = function () {
    const tbody = document.getElementById('gridBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (filteredSuppliers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 40px; color: var(--text-muted);">No suppliers found.</td></tr>`;
        return;
    }

    filteredSuppliers.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${escapeHtml(item.name || '')}</strong></td>
            <td>${escapeHtml(item.phone || '-')}</td>
            <td>${escapeHtml(item.city || '-')}</td>
            <td>${escapeHtml(item.email || '-')}</td>
            <td class="action-btns">
                <button class="btn-icon" onclick="openModal('${item.id}')" title="Edit"><i class="fas fa-edit"></i></button>
                <button class="btn-icon delete" onclick="deleteSupplier('${item.id}')" title="Delete"><i class="fas fa-trash-alt"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
};

window.filterData = function (query) {
    const q = query.toLowerCase().trim();
    if (!q) {
        filteredSuppliers = [...allSuppliers];
    } else {
        filteredSuppliers = allSuppliers.filter(s =>
            s.name?.toLowerCase().includes(q) ||
            s.phone?.toLowerCase().includes(q) ||
            s.city?.toLowerCase().includes(q) ||
            s.email?.toLowerCase().includes(q)
        );
    }
    window.renderGrid();
};

window.openModal = function (id = null) {
    const overlay = document.getElementById('modalOverlay');
    const title = document.getElementById('modalTitle');
    const form = document.getElementById('supplierForm');

    // Reset form
    form.reset();
    document.getElementById('supplierId').value = '';

    if (id) {
        title.textContent = 'Edit Supplier';
        const supplier = allSuppliers.find(s => s.id === id);
        if (supplier) {
            document.getElementById('supplierId').value = supplier.id;
            document.getElementById('name').value = supplier.name || '';
            document.getElementById('email').value = supplier.email || '';
            document.getElementById('phone').value = supplier.phone || '';
            document.getElementById('dob').value = supplier.dob || '';
            document.getElementById('country').value = supplier.country || '';
            document.getElementById('city').value = supplier.city || '';
            document.getElementById('address').value = supplier.address || '';
        }
    } else {
        title.textContent = 'Add Supplier';
    }

    overlay.classList.add('active');
};

window.closeModal = function () {
    document.getElementById('modalOverlay').classList.remove('active');
};

window.handleFormSubmit = async function (event) {
    event.preventDefault();
    const id = document.getElementById('supplierId').value;
    const formData = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        dob: document.getElementById('dob').value || null,
        country: document.getElementById('country').value,
        city: document.getElementById('city').value,
        address: document.getElementById('address').value,
        updated_at: new Date().toISOString()
    };

    try {
        updateSyncStatus('Saving...');
        let result;
        if (id) {
            // Update
            result = await window.supabase.from('suppliers').update(formData).eq('id', id);
        } else {
            // Create
            result = await window.supabase.from('suppliers').insert([formData]);
        }

        if (result.error) throw result.error;

        closeModal();
        await loadData();
        alert('Supplier saved successfully!');
    } catch (e) {
        console.error('Save error:', e);
        alert('Error saving supplier: ' + e.message);
        updateSyncStatus('Error saving');
    }
};

window.deleteSupplier = async function (id) {
    if (!confirm('Are you sure you want to delete this supplier?')) return;

    try {
        updateSyncStatus('Deleting...');
        const { error } = await window.supabase.from('suppliers').delete().eq('id', id);
        if (error) throw error;

        await loadData();
        alert('Supplier deleted successfully!');
    } catch (e) {
        console.error('Delete error:', e);
        alert('Error deleting supplier: ' + e.message);
        updateSyncStatus('Error deleting');
    }
};

function updateSyncStatus(text) {
    const el = document.getElementById('syncStatusText');
    if (el) el.textContent = text;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
