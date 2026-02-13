/**
 * Customers Module Logic - List & Modal Style
 */

let allCustomers = [];
let filteredCustomers = [];

window.loadData = async function () {
    updateSyncStatus('Loading...');
    try {
        const { data, error } = await window.supabase
            .from('customers')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;
        allCustomers = data || [];
        filteredCustomers = [...allCustomers];
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

    if (filteredCustomers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 40px; color: var(--text-muted);">No customers found.</td></tr>`;
        return;
    }

    filteredCustomers.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${escapeHtml(item.name || '')}</strong></td>
            <td>${escapeHtml(item.phone || '-')}</td>
            <td>${escapeHtml(item.city || '-')}</td>
            <td>${escapeHtml(item.email || '-')}</td>
            <td class="action-btns">
                <button class="btn-icon" onclick="openModal('${item.id}')" title="Edit"><i class="fas fa-edit"></i></button>
                <button class="btn-icon delete" onclick="deleteCustomer('${item.id}')" title="Delete"><i class="fas fa-trash-alt"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
};

window.filterData = function (query) {
    const q = query.toLowerCase().trim();
    if (!q) {
        filteredCustomers = [...allCustomers];
    } else {
        filteredCustomers = allCustomers.filter(c =>
            c.name?.toLowerCase().includes(q) ||
            c.phone?.toLowerCase().includes(q) ||
            c.city?.toLowerCase().includes(q) ||
            c.email?.toLowerCase().includes(q)
        );
    }
    window.renderGrid();
};

window.openModal = function (id = null) {
    const overlay = document.getElementById('modalOverlay');
    const title = document.getElementById('modalTitle');
    const form = document.getElementById('customerForm');

    // Reset form
    form.reset();
    document.getElementById('customerId').value = '';

    if (id) {
        title.textContent = 'Edit Customer';
        const customer = allCustomers.find(c => c.id === id);
        if (customer) {
            document.getElementById('customerId').value = customer.id;
            document.getElementById('name').value = customer.name || '';
            document.getElementById('email').value = customer.email || '';
            document.getElementById('phone').value = customer.phone || '';
            document.getElementById('dob').value = customer.dob || '';
            document.getElementById('country').value = customer.country || '';
            document.getElementById('city').value = customer.city || '';
            document.getElementById('address').value = customer.address || '';
        }
    } else {
        title.textContent = 'Add Customer';
    }

    overlay.classList.add('active');
};

window.closeModal = function () {
    document.getElementById('modalOverlay').classList.remove('active');
};

window.handleFormSubmit = async function (event) {
    event.preventDefault();
    const id = document.getElementById('customerId').value;
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
            result = await window.supabase.from('customers').update(formData).eq('id', id);
        } else {
            // Create
            result = await window.supabase.from('customers').insert([formData]);
        }

        if (result.error) throw result.error;

        closeModal();
        await loadData();
        alert('Customer saved successfully!');
    } catch (e) {
        console.error('Save error:', e);
        alert('Error saving customer: ' + e.message);
        updateSyncStatus('Error saving');
    }
};

window.deleteCustomer = async function (id) {
    if (!confirm('Are you sure you want to delete this customer?')) return;

    try {
        updateSyncStatus('Deleting...');
        const { error } = await window.supabase.from('customers').delete().eq('id', id);
        if (error) throw error;

        await loadData();
        alert('Customer deleted successfully!');
    } catch (e) {
        console.error('Delete error:', e);
        alert('Error deleting customer: ' + e.message);
        updateSyncStatus('Error deleting');
    }
};

function updateSyncStatus(text) {
    const el = document.getElementById('syncStatusText');
    if (el) el.textContent = text;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    if (!text) return "";
    div.textContent = text;
    return div.innerHTML;
}
