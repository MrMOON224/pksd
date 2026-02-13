
// State
let currencies = [];
let editingId = null;

// Init
document.addEventListener('DOMContentLoaded', async () => {
    // Auth Check
    const user = await window.checkAuth();
    if (!user) return; // checkAuth redirects

    // Load Data
    fetchCurrencies();
});

// Fetch Currencies
async function fetchCurrencies() {
    const grid = document.getElementById('currencyGrid');
    grid.innerHTML = '<div class="spinner"></div>';

    try {
        const { data, error } = await window.supabase
            .from('currencies')
            .select('*')
            .order('is_default', { ascending: false });

        if (error) throw error;
        currencies = data || [];
        renderCurrencies();
    } catch (err) {
        console.error('Error fetching currencies:', err);
        grid.innerHTML = '<p class="text-muted">Failed to load currencies.</p>';
        alert('Error loading currencies: ' + err.message);
    }
}

// Render Grid
function renderCurrencies() {
    const grid = document.getElementById('currencyGrid');
    grid.innerHTML = '';

    if (currencies.length === 0) {
        grid.innerHTML = '<p class="text-muted">No currencies found.</p>';
        return;
    }

    currencies.forEach(curr => {
        const card = document.createElement('div');
        card.className = 'currency-card';
        card.innerHTML = `
            ${curr.is_default ? '<span class="default-badge">DEFAULT</span>' : ''}
            <div class="currency-symbol">${curr.symbol || ''}</div>
            <div class="currency-code">${curr.code}</div>
            <div class="currency-name text-muted">${curr.name}</div>
            <div class="currency-rate">Rate: ${parseFloat(curr.exchange_rate).toFixed(4)}</div>
            
            <div class="actions-bar">
                <button class="btn-icon-sm" onclick="editCurrency('${curr.id}')" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                ${!curr.is_default ? `
                <button class="btn-icon-sm" onclick="deleteCurrency('${curr.id}')" title="Delete" style="color:var(--error);">
                    <i class="fas fa-trash"></i>
                </button>` : ''}
            </div>
        `;
        grid.appendChild(card);
    });
}

// Open Modal
window.openModal = function () {
    editingId = null;
    document.getElementById('modalTitle').textContent = 'Add Currency';
    document.getElementById('currencyForm').reset();
    document.getElementById('isDefault').checked = false;
    document.getElementById('currencyRate').value = '1.00';
    document.getElementById('currencyModal').classList.remove('hidden');
};

// Edit
window.editCurrency = function (id) {
    const curr = currencies.find(c => c.id === id);
    if (!curr) return;

    editingId = id;
    document.getElementById('modalTitle').textContent = 'Edit Currency';
    document.getElementById('currencyName').value = curr.name;
    document.getElementById('currencyCode').value = curr.code;
    document.getElementById('currencySymbol').value = curr.symbol;
    document.getElementById('currencyRate').value = curr.exchange_rate;
    document.getElementById('isDefault').checked = curr.is_default;

    document.getElementById('currencyModal').classList.remove('hidden');
};

// Close Modal
window.closeModal = function () {
    document.getElementById('currencyModal').classList.add('hidden');
};

// Handle Save
window.handleSave = async function (e) {
    e.preventDefault();
    const saveBtn = e.target.querySelector('button[type="submit"]');
    const originalText = saveBtn.textContent;
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    const formData = {
        name: document.getElementById('currencyName').value,
        code: document.getElementById('currencyCode').value.toUpperCase(),
        symbol: document.getElementById('currencySymbol').value,
        exchange_rate: parseFloat(document.getElementById('currencyRate').value),
        is_default: document.getElementById('isDefault').checked
    };

    try {
        // If setting as default, unset others first?
        // Actually, let's handle that in a transaction or just update others locally.
        // Supabase trigger or simple two-step update.
        if (formData.is_default) {
            await window.supabase
                .from('currencies')
                .update({ is_default: false })
                .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all
        }

        let result;
        if (editingId) {
            result = await window.supabase
                .from('currencies')
                .update(formData)
                .eq('id', editingId);
        } else {
            result = await window.supabase
                .from('currencies')
                .insert([formData]);
        }

        if (result.error) throw result.error;

        closeModal();
        fetchCurrencies();

    } catch (err) {
        console.error('Error saving currency:', err);
        alert('Error saving: ' + err.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
    }
};

// Delete
window.deleteCurrency = async function (id) {
    if (!confirm('Are you sure you want to delete this currency?')) return;

    try {
        const { error } = await window.supabase
            .from('currencies')
            .delete()
            .eq('id', id);

        if (error) throw error;
        fetchCurrencies();
    } catch (err) {
        console.error('Error deleting:', err);
        alert('Error deleting: ' + err.message);
    }
};
