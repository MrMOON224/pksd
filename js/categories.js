/**
 * Admin Dashboard - Categories & Variations Module
 */

// Utility: HTML Escaping
window.escapeHtml = function (text) {
    if (!text) return "";
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};

// --- Category Management State ---
window.categoriesData = [];
window.subcategoriesData = [];
window.modifiedCategories = new Set();
window.deletedCategories = new Set();
window.modifiedSubcategories = new Set();
window.deletedSubcategories = new Set();

// Switch between Main Categories and Subcategories tabs
window.switchCategoryTab = function (tab) {
    const mainTab = document.getElementById('mainCategoriesTab');
    const subTab = document.getElementById('subcategoriesTab');
    const mainView = document.getElementById('mainCategoriesView');
    const subView = document.getElementById('subcategoriesView');

    if (!mainTab || !subTab || !mainView || !subView) return;

    if (tab === 'main') {
        mainTab.style.borderBottom = '3px solid var(--primary)';
        subTab.style.borderBottom = 'none';
        mainView.classList.remove('hidden');
        subView.classList.add('hidden');
    } else {
        subTab.style.borderBottom = '3px solid var(--primary)';
        mainTab.style.borderBottom = 'none';
        subView.classList.remove('hidden');
        mainView.classList.add('hidden');
    }
};

window.saveCategoriesDraft = function () {
    try {
        const draft = {
            categoriesData: window.categoriesData,
            subcategoriesData: window.subcategoriesData,
            modifiedCategories: Array.from(window.modifiedCategories),
            deletedCategories: Array.from(window.deletedCategories),
            modifiedSubcategories: Array.from(window.modifiedSubcategories),
            deletedSubcategories: Array.from(window.deletedSubcategories)
        };
        localStorage.setItem('pos_draft_categories', JSON.stringify(draft));
        window.updateModuleSyncStatus('Categories', 'Unsaved Changes (Local)');
    } catch (e) {
        console.error('Failed to save categories draft:', e);
    }
};

window.clearCategoriesDraft = function () {
    localStorage.removeItem('pos_draft_categories');
    window.updateModuleSyncStatus('Categories', 'Synced to Supabase');
};

// Load all categories and subcategories
window.loadCategories = async function () {
    try {
        // Check for local draft first
        const localDraft = localStorage.getItem('pos_draft_categories');
        if (localDraft) {
            try {
                const draft = JSON.parse(localDraft);
                const hasMods = (draft.modifiedCategories && draft.modifiedCategories.length > 0) ||
                    (draft.deletedCategories && draft.deletedCategories.length > 0) ||
                    (draft.modifiedSubcategories && draft.modifiedSubcategories.length > 0) ||
                    (draft.deletedSubcategories && draft.deletedSubcategories.length > 0);

                if (hasMods) {
                    if (confirm('You have unsaved category changes. Would you like to resume?')) {
                        window.categoriesData = draft.categoriesData;
                        window.subcategoriesData = draft.subcategoriesData;
                        window.modifiedCategories = new Set(draft.modifiedCategories);
                        window.deletedCategories = new Set(draft.deletedCategories);
                        window.modifiedSubcategories = new Set(draft.modifiedSubcategories);
                        window.deletedSubcategories = new Set(draft.deletedSubcategories);
                        window.renderCategories();
                        window.renderSubcategories();
                        window.updateModuleSyncStatus('Categories', 'Unsaved Changes (Local)');
                        return;
                    } else {
                        localStorage.removeItem('pos_draft_categories');
                    }
                }
            } catch (e) {
                console.error('Error parsing categories draft:', e);
                localStorage.removeItem('pos_draft_categories');
            }
        }

        // Load main categories
        const { data: categories, error: catError } = await window.supabase
            .from('categories')
            .select('*')
            .order('name', { ascending: true });

        if (catError) throw catError;
        window.categoriesData = categories || [];

        // Load subcategories
        const { data: subcategories, error: subError } = await window.supabase
            .from('subcategories')
            .select(`
                *,
                categories (name)
            `)
            .order('name', { ascending: true });

        if (subError) throw subError;
        window.subcategoriesData = subcategories || [];

        window.renderCategories();
        window.renderSubcategories();

        // Reset tracking
        window.modifiedCategories.clear();
        window.deletedCategories.clear();
        window.modifiedSubcategories.clear();
        window.deletedSubcategories.clear();
        window.updateModuleSyncStatus('Categories', 'Synced to Supabase');

    } catch (error) {
        console.error('Error loading categories:', error);
        alert('Failed to load categories: ' + error.message);
    }
};

// Render main categories table
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
            <td><input type="text" class="excel-input" value="${window.escapeHtml(category.name || '')}" data-field="name" oninput="window.markCategoryModified(this)"></td>
            <td><input type="text" class="excel-input" value="${window.escapeHtml(category.description || '')}" data-field="description" oninput="window.markCategoryModified(this)"></td>
            <td class="action-cell">
                <button class="btn-premium-danger" onclick="window.deleteCategory(${index})" title="Delete"><i class="fas fa-trash"></i></button>
            </td>
        `;

        tbody.appendChild(tr);
    });
};

// Render subcategories table
window.renderSubcategories = function () {
    const tbody = document.getElementById('subcategoriesBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    window.subcategoriesData.forEach((sub, index) => {
        const isSelected = window.selectedIds && window.selectedIds.has(sub.id);
        const tr = document.createElement('tr');
        tr.className = 'excel-tr';
        if (window.modifiedSubcategories.has(sub.id)) tr.classList.add('modified');
        if (sub.id && sub.id.toString().startsWith('new_')) tr.classList.add('new-row');
        tr.dataset.index = index;

        // Create category dropdown options
        const categoryOptions = window.categoriesData.map(cat =>
            `<option value="${cat.id}" ${sub.category_id === cat.id ? 'selected' : ''}>${window.escapeHtml(cat.name)}</option>`
        ).join('');

        tr.innerHTML = `
            <td style="text-align: center;"><input type="checkbox" class="selection-checkbox" data-id="${sub.id}" ${isSelected ? 'checked' : ''} onchange="window.handleSelectionChange(this)"></td>
            <td>${index + 1}</td>
            <td>
                <select class="excel-input" data-field="category_id" onchange="window.markSubcategoryModified(this)">
                    <option value="">Select Category</option>
                    ${categoryOptions}
                </select>
            </td>
            <td><input type="text" class="excel-input" value="${window.escapeHtml(sub.name || '')}" data-field="name" oninput="window.markSubcategoryModified(this)"></td>
            <td><input type="text" class="excel-input" value="${window.escapeHtml(sub.description || '')}" data-field="description" oninput="window.markSubcategoryModified(this)"></td>
            <td class="action-cell">
                <button class="btn-premium-danger" onclick="window.deleteSubcategory(${index})" title="Delete"><i class="fas fa-trash"></i></button>
            </td>
        `;

        tbody.appendChild(tr);
    });
};

// Mark category as modified
window.markCategoryModified = function (input) {
    const tr = input.closest('tr');
    const index = parseInt(tr.dataset.index);
    const category = window.categoriesData[index];
    const field = input.dataset.field;
    const value = input.value;

    category[field] = value;
    window.modifiedCategories.add(category.id);

    tr.classList.add('modified');
    window.saveCategoriesDraft();
};

// Mark subcategory as modified
window.markSubcategoryModified = function (input) {
    const tr = input.closest('tr');
    const index = parseInt(tr.dataset.index);
    const sub = window.subcategoriesData[index];
    const field = input.dataset.field;
    const value = input.value;

    sub[field] = value;
    window.modifiedSubcategories.add(sub.id);

    tr.classList.add('modified');
    window.saveCategoriesDraft();
};

// Add new category row
window.addNewCategory = function () {
    const newCategory = {
        id: crypto.randomUUID(),
        name: '',
        description: '',
        isNew: true
    };

    window.categoriesData.push(newCategory);
    window.modifiedCategories.add(newCategory.id);

    window.renderCategories();
    // Focus new row name input
    const lastTr = document.getElementById('categoriesBody').lastElementChild;
    if (lastTr) lastTr.querySelector('input[data-field="name"]').focus();
    window.saveCategoriesDraft();
};

// Add new subcategory row
window.addNewSubcategory = function () {
    const newSubcategory = {
        id: crypto.randomUUID(),
        category_id: '',
        name: '',
        description: '',
        isNew: true
    };

    window.subcategoriesData.push(newSubcategory);
    window.modifiedSubcategories.add(newSubcategory.id);

    window.renderSubcategories();
    // Focus new row name input
    const lastTr = document.getElementById('subcategoriesBody').lastElementChild;
    if (lastTr) lastTr.querySelector('input[data-field="name"]').focus();
    window.saveCategoriesDraft();
};

// Delete category
window.deleteCategory = function (index) {
    if (confirm('Are you sure you want to delete this category? This will also delete all its subcategories.')) {
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

window.deleteSubcategory = function (index) {
    if (confirm('Are you sure you want to delete this subcategory?')) {
        const subcategory = window.subcategoriesData[index];
        if (subcategory.id && !subcategory.id.toString().startsWith('new_')) {
            window.deletedSubcategories.add(subcategory.id);
        }
        window.modifiedSubcategories.delete(subcategory.id);
        window.subcategoriesData.splice(index, 1);
        window.renderSubcategories();
        window.saveCategoriesDraft();
    }
};

// Save all category changes
window.saveCategoryChanges = async function () {
    window.showLoading();
    try {
        const categoriesToSave = window.categoriesData.filter(c => window.modifiedCategories.has(c.id));
        const subcategoriesToSave = window.subcategoriesData.filter(s => window.modifiedSubcategories.has(s.id));

        // Delete categories
        if (window.deletedCategories.size > 0) {
            const { error: deleteError } = await window.supabase
                .from('categories')
                .delete()
                .in('id', Array.from(window.deletedCategories));

            if (deleteError) throw deleteError;
        }

        if (categoriesToSave.length > 0) {
            const { error: upsertError } = await window.supabase
                .from('categories')
                .upsert(categoriesToSave.map(cat => ({
                    id: cat.id,
                    name: cat.name,
                    description: cat.description
                })));

            if (upsertError) throw upsertError;
        }

        // Handle subcategory deletions
        if (window.deletedSubcategories.size > 0) {
            const { error: subDeleteError } = await window.supabase
                .from('subcategories')
                .delete()
                .in('id', Array.from(window.deletedSubcategories));
            if (subDeleteError) throw subDeleteError;
        }

        if (subcategoriesToSave.length > 0) {
            const { error: upsertError } = await window.supabase
                .from('subcategories')
                .upsert(subcategoriesToSave.map(sub => ({
                    id: sub.id,
                    category_id: sub.category_id,
                    name: sub.name,
                    description: sub.description
                })));

            if (upsertError) throw upsertError;
        }

        // Capture deletions and Clear tracking/draft
        const delCats = Array.from(window.deletedCategories);
        const delSubs = Array.from(window.deletedSubcategories);

        window.modifiedCategories.clear();
        window.deletedCategories.clear();
        window.modifiedSubcategories.clear();
        window.deletedSubcategories.clear();
        window.clearCategoriesDraft();

        alert('All changes saved successfully!');

        // Update UI locally
        if (delCats.length > 0) window.categoriesData = window.categoriesData.filter(c => !delCats.includes(c.id));
        if (delSubs.length > 0) window.subcategoriesData = window.subcategoriesData.filter(s => !delSubs.includes(s.id));

        window.categoriesData.forEach(c => { if (c.isNew) c.isNew = false; });
        window.subcategoriesData.forEach(s => { if (s.isNew) s.isNew = false; });

        window.renderCategories();
        window.renderSubcategories();

        // Sync reference data in core
        if (window.loadReferenceData) await window.loadReferenceData();

        // Update product grid if visible (checks parent if in iframe)
        const checkDoc = (window.parent && window.parent !== window) ? window.parent.document : document;
        const productsView = checkDoc.getElementById('view-products');
        if (productsView && !productsView.classList.contains('hidden') && window.renderGrid) {
            window.renderGrid();
        }
    } catch (error) {
        console.error('Error saving categories:', error);
        alert('Failed to save categories: ' + error.message);
    } finally {
        window.hideLoading();
    }
};

// --- Variation Management State ---
window.variationTypesData = [];
window.variationOptionsData = [];
window.modifiedVariationTypes = new Set();
window.deletedVariationTypes = new Set();
window.modifiedVariationOptions = new Set();
window.deletedVariationOptions = new Set();

// Switch between Variation Types and Options tabs
window.switchVariationTab = function (tab) {
    const typesTab = document.getElementById('variationTypesTab');
    const optionsTab = document.getElementById('variationOptionsTab');
    const typesView = document.getElementById('variationTypesView');
    const optionsView = document.getElementById('variationOptionsView');

    if (!typesTab || !optionsTab || !typesView || !optionsView) return;

    if (tab === 'types') {
        typesTab.style.borderBottom = '3px solid var(--primary)';
        optionsTab.style.borderBottom = 'none';
        typesView.classList.remove('hidden');
        optionsView.classList.add('hidden');
    } else {
        optionsTab.style.borderBottom = '3px solid var(--primary)';
        typesTab.style.borderBottom = 'none';
        optionsView.classList.remove('hidden');
        typesView.classList.add('hidden');
    }
};

window.saveVariationsDraft = function () {
    try {
        const draft = {
            variationTypesData: window.variationTypesData,
            variationOptionsData: window.variationOptionsData,
            modifiedVariationTypes: Array.from(window.modifiedVariationTypes),
            deletedVariationTypes: Array.from(window.deletedVariationTypes),
            modifiedVariationOptions: Array.from(window.modifiedVariationOptions),
            deletedVariationOptions: Array.from(window.deletedVariationOptions)
        };
        localStorage.setItem('pos_draft_variations', JSON.stringify(draft));
        window.updateModuleSyncStatus('Variations', 'Unsaved Changes (Local)');
    } catch (e) { console.error('Failed to save variations draft:', e); }
};

window.clearVariationsDraft = function () {
    localStorage.removeItem('pos_draft_variations');
    window.updateModuleSyncStatus('Variations', 'Synced to Supabase');
};

// Load all variations data
window.loadVariations = async function () {
    try {
        // Check draft
        const localDraft = localStorage.getItem('pos_draft_variations');
        if (localDraft) {
            try {
                const draft = JSON.parse(localDraft);
                const hasMods = (draft.modifiedVariationTypes && draft.modifiedVariationTypes.length > 0) ||
                    (draft.deletedVariationTypes && draft.deletedVariationTypes.length > 0) ||
                    (draft.modifiedVariationOptions && draft.modifiedVariationOptions.length > 0) ||
                    (draft.deletedVariationOptions && draft.deletedVariationOptions.length > 0);

                if (hasMods && confirm('Resume unsaved variation changes?')) {
                    window.variationTypesData = draft.variationTypesData;
                    window.variationOptionsData = draft.variationOptionsData;
                    window.modifiedVariationTypes = new Set(draft.modifiedVariationTypes);
                    window.deletedVariationTypes = new Set(draft.deletedVariationTypes);
                    window.modifiedVariationOptions = new Set(draft.modifiedVariationOptions);
                    window.deletedVariationOptions = new Set(draft.deletedVariationOptions);
                    window.renderVariationTypes();
                    window.renderVariationOptions();
                    window.updateModuleSyncStatus('Variations', 'Unsaved Changes (Local)');
                    return;
                }
            } catch (e) {
                localStorage.removeItem('pos_draft_variations');
            }
        }

        // Load variation types
        const { data: types, error: typesError } = await window.supabase
            .from('variation_types')
            .select('*')
            .order('name', { ascending: true });

        if (typesError) throw typesError;

        window.variationTypesData = types || [];
        window.renderVariationTypes();

        // Load variation options
        const { data: options, error: optionsError } = await window.supabase
            .from('variation_options')
            .select(`
                *,
                variation_types (name)
            `)
            .order('option_value', { ascending: true });

        if (optionsError) throw optionsError;

        window.variationOptionsData = options || [];
        window.renderVariationOptions();

        // Reset tracking
        window.modifiedVariationTypes.clear();
        window.deletedVariationTypes.clear();
        window.modifiedVariationOptions.clear();
        window.deletedVariationOptions.clear();
        window.updateModuleSyncStatus('Variations', 'Synced to Supabase');

    } catch (error) {
        console.error('Error loading variations:', error);
        alert('Failed to load variations: ' + error.message);
    }
};

// Render variation types table
window.renderVariationTypes = function () {
    const tbody = document.getElementById('variationTypesBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    window.variationTypesData.forEach((type, index) => {
        const isSelected = window.selectedIds && window.selectedIds.has(type.id);
        const tr = document.createElement('tr');
        tr.className = 'excel-tr';
        if (window.modifiedVariationTypes.has(type.id)) tr.classList.add('modified');
        if (type.id && type.id.toString().startsWith('new_')) tr.classList.add('new-row');
        tr.dataset.index = index;

        tr.innerHTML = `
            <td style="text-align: center;"><input type="checkbox" class="selection-checkbox" data-id="${type.id}" ${isSelected ? 'checked' : ''} onchange="window.handleSelectionChange(this)"></td>
            <td>${index + 1}</td>
            <td><input type="text" class="excel-input" value="${window.escapeHtml(type.name || '')}" data-field="name" oninput="window.markVariationTypeModified(this)"></td>
            <td><input type="text" class="excel-input" value="${window.escapeHtml(type.description || '')}" data-field="description" oninput="window.markVariationTypeModified(this)"></td>
            <td class="action-cell">
                <button class="btn-premium-danger" onclick="window.deleteVariationType(${index})" title="Delete"><i class="fas fa-trash"></i></button>
            </td>
        `;

        tbody.appendChild(tr);
    });
};

// Render variation options table
window.renderVariationOptions = function () {
    const tbody = document.getElementById('variationOptionsBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    window.variationOptionsData.forEach((opt, index) => {
        const isSelected = window.selectedIds && window.selectedIds.has(opt.id);
        const tr = document.createElement('tr');
        tr.className = 'excel-tr';
        if (window.modifiedVariationOptions.has(opt.id)) tr.classList.add('modified');
        if (opt.id && opt.id.toString().startsWith('new_')) tr.classList.add('new-row');
        tr.dataset.index = index;

        // Create type dropdown options
        const typeOptions = window.variationTypesData.map(type =>
            `<option value="${type.id}" ${opt.variation_type_id === type.id ? 'selected' : ''}>${window.escapeHtml(type.name)}</option>`
        ).join('');

        tr.innerHTML = `
            <td style="text-align: center;"><input type="checkbox" class="selection-checkbox" data-id="${opt.id}" ${isSelected ? 'checked' : ''} onchange="window.handleSelectionChange(this)"></td>
            <td>${index + 1}</td>
            <td>
                <select class="excel-input" data-field="variation_type_id" onchange="window.markVariationOptionModified(this)">
                    <option value="">Select Type</option>
                    ${typeOptions}
                </select>
            </td>
            <td><input type="text" class="excel-input" value="${window.escapeHtml(opt.option_value || '')}" data-field="option_value" oninput="window.markVariationOptionModified(this)"></td>
            <td class="action-cell">
                <button class="btn-premium-danger" onclick="window.deleteVariationOption(${index})" title="Delete"><i class="fas fa-trash"></i></button>
            </td>
        `;

        tbody.appendChild(tr);
    });
};

// Mark variation type as modified
window.markVariationTypeModified = function (input) {
    const tr = input.closest('tr');
    const index = parseInt(tr.dataset.index);
    const type = window.variationTypesData[index];
    const field = input.dataset.field;

    type[field] = input.value;
    window.modifiedVariationTypes.add(type.id);

    tr.classList.add('modified');
    window.saveVariationsDraft();
};

// Mark variation option as modified
window.markVariationOptionModified = function (input) {
    const tr = input.closest('tr');
    const index = parseInt(tr.dataset.index);
    const opt = window.variationOptionsData[index];
    const field = input.dataset.field;

    opt[field] = input.value;
    window.modifiedVariationOptions.add(opt.id);

    tr.classList.add('modified');
    window.saveVariationsDraft();
};

// Add new variation type row
window.addNewVariationType = function () {
    const newType = {
        id: crypto.randomUUID(),
        name: '',
        description: '',
        isNew: true
    };

    window.variationTypesData.push(newType);
    window.modifiedVariationTypes.add(newType.id);

    window.renderVariationTypes();
    const lastTr = document.getElementById('variationTypesBody').lastElementChild;
    if (lastTr) lastTr.querySelector('input[data-field="name"]').focus();
    window.saveVariationsDraft();
};

// Add new variation option row
window.addNewVariationOption = function () {
    const newOption = {
        id: crypto.randomUUID(),
        variation_type_id: '',
        option_value: '',
        isNew: true
    };

    window.variationOptionsData.push(newOption);
    window.modifiedVariationOptions.add(newOption.id);

    window.renderVariationOptions();
    const lastTr = document.getElementById('variationOptionsBody').lastElementChild;
    if (lastTr) lastTr.querySelector('input[data-field="option_value"]').focus();
    window.saveVariationsDraft();
};

// Delete variation type
window.deleteVariationType = function (index) {
    if (confirm('Are you sure you want to delete this variation type? This will also delete all its options.')) {
        const type = window.variationTypesData[index];
        if (type.id && !type.id.toString().startsWith('new_')) {
            window.deletedVariationTypes.add(type.id);
        }
        window.modifiedVariationTypes.delete(type.id);
        window.variationTypesData.splice(index, 1);
        window.renderVariationTypes();
        window.saveVariationsDraft();
    }
};

// Delete variation option
window.deleteVariationOption = function (index) {
    if (confirm('Are you sure you want to delete this option?')) {
        const option = window.variationOptionsData[index];
        if (option.id && !option.id.toString().startsWith('new_')) {
            window.deletedVariationOptions.add(option.id);
        }
        window.modifiedVariationOptions.delete(option.id);
        window.variationOptionsData.splice(index, 1);
        window.renderVariationOptions();
        window.saveVariationsDraft();
    }
};

// Save all variation changes
window.saveVariationChanges = async function () {
    window.showLoading();
    try {
        // Delete types
        if (window.deletedVariationTypes.size > 0) {
            const { error: deleteError } = await window.supabase
                .from('variation_types')
                .delete()
                .in('id', Array.from(window.deletedVariationTypes));

            if (deleteError) throw deleteError;
        }

        // Upsert types
        const typesToSave = Array.from(window.modifiedVariationTypes)
            .map(id => window.variationTypesData.find(t => t.id === id))
            .filter(type => type && type.name);

        if (typesToSave.length > 0) {
            const { error: upsertError } = await window.supabase
                .from('variation_types')
                .upsert(typesToSave.map(type => ({
                    id: type.id,
                    name: type.name,
                    description: type.description
                })));

            if (upsertError) throw upsertError;
        }

        // Delete options
        if (window.deletedVariationOptions.size > 0) {
            const { error: deleteError } = await window.supabase
                .from('variation_options')
                .delete()
                .in('id', Array.from(window.deletedVariationOptions));

            if (deleteError) throw deleteError;
        }

        // Upsert options
        const optionsToSave = Array.from(window.modifiedVariationOptions)
            .map(id => window.variationOptionsData.find(o => o.id === id))
            .filter(opt => opt && opt.option_value && opt.variation_type_id);

        if (optionsToSave.length > 0) {
            const { error: upsertError } = await window.supabase
                .from('variation_options')
                .upsert(optionsToSave.map(opt => ({
                    id: opt.id,
                    variation_type_id: opt.variation_type_id,
                    option_value: opt.option_value
                })));

            if (upsertError) throw upsertError;
        }

        // Capture and Clear
        const delTypes = Array.from(window.deletedVariationTypes);
        const delOpts = Array.from(window.deletedVariationOptions);

        window.modifiedVariationTypes.clear();
        window.deletedVariationTypes.clear();
        window.modifiedVariationOptions.clear();
        window.deletedVariationOptions.clear();
        window.clearVariationsDraft();

        alert('All changes saved successfully!');

        // Local UI Update
        if (delTypes.length > 0) window.variationTypesData = window.variationTypesData.filter(t => !delTypes.includes(t.id));
        if (delOpts.length > 0) window.variationOptionsData = window.variationOptionsData.filter(o => !delOpts.includes(o.id));

        window.variationTypesData.forEach(t => { if (t.isNew) t.isNew = false; });
        window.variationOptionsData.forEach(o => { if (o.isNew) o.isNew = false; });

        window.renderVariationTypes();
        window.renderVariationOptions();

        if (window.loadReferenceData) await window.loadReferenceData();

        // Update product grid if visible (checks parent if in iframe)
        const checkDoc = (window.parent && window.parent !== window) ? window.parent.document : document;
        const productsView = checkDoc.getElementById('view-products');
        if (productsView && !productsView.classList.contains('hidden') && window.parent.renderGrid) {
            window.parent.renderGrid();
        }
    } catch (error) {
        console.error('Error saving variations:', error);
        alert('Failed to save variations: ' + error.message);
    } finally {
        window.hideLoading();
    }
};

window.executeBulkDelete = async function (ids) {
    if (!ids || ids.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${ids.length} selected items?`)) return;

    window.showLoading();
    try {
        let table = '';
        if (document.getElementById('categoriesBody')) {
            // Check which tab is active in Category Manager
            const subView = document.getElementById('subcategoriesView');
            table = (subView && !subView.classList.contains('hidden')) ? 'subcategories' : 'categories';
        } else if (document.getElementById('variationTypesBody')) {
            // Check which tab is active in Variation Manager
            const optionsView = document.getElementById('variationOptionsView');
            table = (optionsView && !optionsView.classList.contains('hidden')) ? 'variation_options' : 'variation_types';
        }

        if (!table) throw new Error('Could not determine active table for deletion');

        const { error } = await window.supabase.from(table).delete().in('id', ids);
        if (error) throw error;

        // Clear local selection
        if (window.clearSelection) window.clearSelection();

        alert('Bulk deletion successful!');

        // Refresh data
        if (table.includes('variation')) {
            await window.loadVariations();
        } else {
            await window.loadCategories();
        }

        // Sync with parent grid if needed
        if (window.renderGrid) window.renderGrid();
        if (window.loadReferenceData) await window.loadReferenceData();

    } catch (e) {
        console.error('Bulk delete error:', e);
        alert('Failed to delete items: ' + e.message);
    } finally {
        window.hideLoading();
    }
};
