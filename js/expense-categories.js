/**
 * Admin Dashboard - Expense Categories Module
 */

window.categoriesData = [];
window.modifiedCategories = new Set();
window.deletedCategories = new Set();

window.escapeHtml = function (text) {
    if (!text) return "";
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};

window.saveCategoriesDraft = function () {
    try {
        const draft = {
            categoriesData: window.categoriesData,
            modifiedCategories: Array.from(window.modifiedCategories),
            deletedCategories: Array.from(window.deletedCategories)
        };
        localStorage.setItem('pos_draft_expense_categories', JSON.stringify(draft));
        if (window.updateSyncStatus) window.updateSyncStatus('Unsaved Changes (Local)');
    } catch (e) {
        console.error('Failed to save categories draft:', e);
    }
};

window.clearCategoriesDraft = function () {
    localStorage.removeItem('pos_draft_expense_categories');
    if (window.updateSyncStatus) window.updateSyncStatus('Synced to Supabase');
};

window.loadCategories = async function () {
    try {
        const localDraft = localStorage.getItem('pos_draft_expense_categories');
        if (localDraft) {
            const draft = JSON.parse(localDraft);
            if (draft.modifiedCategories.length > 0 || draft.deletedCategories.length > 0) {
                if (confirm('You have unsaved changes. Resume?')) {
                    window.categoriesData = draft.categoriesData;
                    window.modifiedCategories = new Set(draft.modifiedCategories);
                    window.deletedCategories = new Set(draft.deletedCategories);
                    window.renderCategories();
                    return;
                }
            }
        }

        const { data, error } = await window.supabase
            .from('expense_categories')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;
        window.categoriesData = data || [];
        window.renderCategories();
        window.modifiedCategories.clear();
        window.deletedCategories.clear();
        window.clearCategoriesDraft();

    } catch (error) {
        console.error('Error loading categories:', error);
        alert('Failed to load categories: ' + error.message);
    }
};

window.renderCategories = function () {
    const tbody = document.getElementById('categoriesBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    window.categoriesData.forEach((category, index) => {
        const isSelected = window.selectedIds && window.selectedIds.has(category.id);
        const tr = document.createElement('tr');
        tr.className = 'excel-tr';
        if (window.modifiedCategories.has(category.id)) tr.classList.add('modified');
        if (category.id && category.id.toString().startsWith('new_')) tr.classList.add('new-row');
        tr.dataset.index = index;

        tr.innerHTML = `
            <td style="text-align: center;"><input type="checkbox" class="selection-checkbox" data-id="${category.id}" ${isSelected ? 'checked' : ''} onchange="window.handleSelectionChange(this)"></td>
            <td>${index + 1}</td>
            <td><input type="text" class="excel-input" value="${window.escapeHtml(category.name || '')}" data-field="name" oninput="window.markModified(this)"></td>
            <td><input type="text" class="excel-input" value="${window.escapeHtml(category.description || '')}" data-field="description" oninput="window.markModified(this)"></td>
            <td class="action-cell">
                <button class="btn-premium-danger" onclick="window.deleteCategory(${index})" title="Delete"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
};

window.markModified = function (input) {
    const tr = input.closest('tr');
    const index = parseInt(tr.dataset.index);
    const category = window.categoriesData[index];
    const field = input.dataset.field;
    category[field] = input.value;
    window.modifiedCategories.add(category.id);
    tr.classList.add('modified');
    window.saveCategoriesDraft();
};

window.addNewCategory = function () {
    const newCategory = {
        id: 'new_' + crypto.randomUUID(),
        name: '',
        description: '',
        isNew: true
    };
    window.categoriesData.push(newCategory);
    window.modifiedCategories.add(newCategory.id);
    window.renderCategories();
    const lastTr = document.getElementById('categoriesBody').lastElementChild;
    if (lastTr) lastTr.querySelector('input[data-field="name"]').focus();
    window.saveCategoriesDraft();
};

window.deleteCategory = function (index) {
    if (confirm('Delete this category?')) {
        const category = window.categoriesData[index];
        if (category.id && !category.id.toString().startsWith('new_')) {
            window.deletedCategories.add(category.id);
        }
        window.modifiedCategories.delete(category.id);
        window.categoriesData.splice(index, 1);
        window.renderCategories();
        window.saveCategoriesDraft();
    }
};

window.saveCategoryChanges = async function () {
    if (window.showLoading) window.showLoading();
    try {
        if (window.deletedCategories.size > 0) {
            const { error } = await window.supabase
                .from('expense_categories')
                .delete()
                .in('id', Array.from(window.deletedCategories));
            if (error) throw error;
        }

        const toSave = window.categoriesData
            .filter(c => window.modifiedCategories.has(c.id))
            .map(c => {
                const obj = { name: c.name, description: c.description };
                if (!c.id.toString().startsWith('new_')) obj.id = c.id;
                return obj;
            });

        if (toSave.length > 0) {
            const { error } = await window.supabase
                .from('expense_categories')
                .upsert(toSave);
            if (error) throw error;
        }

        alert('Saved successfully!');
        await window.loadCategories();

        // Notify parent to refresh expense selects if they are open
        if (window.parent && window.parent.postMessage) {
            window.parent.postMessage({ type: 'EXPENSE_CATS_UPDATED' }, '*');
        }

    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        if (window.hideLoading) window.hideLoading();
    }
};

window.executeBulkDelete = async function (ids) {
    if (!confirm(`Delete ${ids.length} items?`)) return;
    try {
        const { error } = await window.supabase.from('expense_categories').delete().in('id', ids);
        if (error) throw error;
        if (window.clearSelection) window.clearSelection();
        await window.loadCategories();
    } catch (e) {
        alert(e.message);
    }
};
