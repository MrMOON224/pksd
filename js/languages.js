
// State
let languages = [];
let editingId = null;

// Init
document.addEventListener('DOMContentLoaded', async () => {
    // Auth Check
    const user = await window.checkAuth();
    if (!user) return;

    // Load Data
    fetchLanguages();
});

// Fetch Languages
async function fetchLanguages() {
    const grid = document.getElementById('languageGrid');
    grid.innerHTML = '<div class="spinner"></div>';

    try {
        const { data, error } = await window.supabase
            .from('languages')
            .select('*')
            .order('is_default', { ascending: false });

        if (error) throw error;
        languages = data || [];
        renderLanguages();
    } catch (err) {
        console.error('Error fetching languages:', err);
        grid.innerHTML = '<p class="text-muted">Failed to load languages.</p>';
        // alert('Error loading languages: ' + err.message);
    }
}

// Render Grid
function renderLanguages() {
    const grid = document.getElementById('languageGrid');
    grid.innerHTML = '';

    if (languages.length === 0) {
        grid.innerHTML = '<p class="text-muted">No languages found. Add one to get started.</p>';
        return;
    }

    languages.forEach(lang => {
        const card = document.createElement('div');
        card.className = 'language-card';
        card.innerHTML = `
            ${lang.is_default ? '<span class="default-badge">DEFAULT</span>' : ''}
            <div class="language-flag">${lang.flag || '🌐'}</div>
            <div class="language-name">${lang.name}</div>
            <div class="language-code">${lang.code}</div>
            
            <div class="actions-bar">
                <button class="btn-icon-sm" onclick="editLanguage('${lang.id}')" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                ${!lang.is_default ? `
                <button class="btn-icon-sm" onclick="deleteLanguage('${lang.id}')" title="Delete" style="color:var(--error);">
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
    document.getElementById('modalTitle').textContent = 'Add Language';
    document.getElementById('languageForm').reset();
    document.getElementById('isDefault').checked = false;
    document.getElementById('languageModal').classList.remove('hidden');
};

// Edit
window.editLanguage = function (id) {
    const lang = languages.find(l => l.id === id);
    if (!lang) return;

    editingId = id;
    document.getElementById('modalTitle').textContent = 'Edit Language';
    document.getElementById('languageName').value = lang.name;
    document.getElementById('languageCode').value = lang.code;
    document.getElementById('languageFlag').value = lang.flag;
    document.getElementById('isDefault').checked = lang.is_default;

    document.getElementById('languageModal').classList.remove('hidden');
};

// Close Modal
window.closeModal = function () {
    document.getElementById('languageModal').classList.add('hidden');
};

// Handle Save
window.handleSave = async function (e) {
    e.preventDefault();
    const saveBtn = e.target.querySelector('button[type="submit"]');
    const originalText = saveBtn.textContent;
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    const formData = {
        name: document.getElementById('languageName').value,
        code: document.getElementById('languageCode').value.toLowerCase(),
        flag: document.getElementById('languageFlag').value,
        is_default: document.getElementById('isDefault').checked
    };

    try {
        // If setting as default, unset others
        if (formData.is_default) {
            await window.supabase
                .from('languages')
                .update({ is_default: false })
                .neq('id', '00000000-0000-0000-0000-000000000000');
        }

        let result;
        if (editingId) {
            result = await window.supabase
                .from('languages')
                .update(formData)
                .eq('id', editingId);
        } else {
            result = await window.supabase
                .from('languages')
                .insert([formData]);
        }

        if (result.error) throw result.error;

        closeModal();
        fetchLanguages();

    } catch (err) {
        console.error('Error saving language:', err);
        alert('Error saving: ' + err.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
    }
};

// Delete
window.deleteLanguage = async function (id) {
    if (!confirm('Are you sure you want to delete this language?')) return;

    try {
        const { error } = await window.supabase
            .from('languages')
            .delete()
            .eq('id', id);

        if (error) throw error;
        fetchLanguages();
    } catch (err) {
        console.error('Error deleting:', err);
        alert('Error deleting: ' + err.message);
    }
};
