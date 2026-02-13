/**
 * Admin Dashboard - User Management Module
 */

window.loadUsersList = async function () {
    const tbody = document.getElementById('usersBody');
    if (!tbody) return;

    try {
        const { data: roles, error } = await window.supabase
            .from('user_roles')
            .select('user_id, role, created_at');

        if (error) throw error;

        tbody.innerHTML = roles.map((u, i) => `
            <tr class="excel-tr">
                <td>${i + 1}</td>
                <td title="${u.user_id}">${u.user_id.substring(0, 8)}...</td>
                <td><span style="padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; background: ${window.getRoleBg(u.role)}">${u.role}</span></td>
                <td>-</td>
                <td>${new Date(u.created_at).toLocaleDateString()}</td>
                <td class="action-cell">
                    <button class="btn-icon" onclick="changeUserRole('${u.user_id}', '${u.role}')" title="Change Role">
                        <i class="fas fa-user-tag"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        if (roles.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding: 20px;">No users found</td></tr>';
        }

    } catch (error) {
        console.error('Error loading users:', error);
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-error" style="padding: 20px;">Error loading users: ${error.message}</td></tr>`;
    }
};

window.getRoleBg = function (role) {
    if (role === 'admin') return 'rgba(239, 68, 68, 0.2)';
    if (role === 'manager') return 'rgba(245, 158, 11, 0.2)';
    return 'rgba(16, 185, 129, 0.2)';
};

window.showAddUserModal = function () {
    const modal = document.getElementById('addUserModal');
    if (modal) modal.classList.remove('hidden');
};

window.closeAddUserModal = function () {
    const modal = document.getElementById('addUserModal');
    if (modal) modal.classList.add('hidden');

    const form = document.getElementById('addUserForm');
    if (form) form.reset();
};

window.handleCreateUser = async function (event) {
    if (event) event.preventDefault();

    const email = document.getElementById('newUserEmail').value;
    const password = document.getElementById('newUserPassword').value;
    const role = document.getElementById('newUserRole').value;
    const fullName = document.getElementById('newUserFullName').value;

    const btn = document.getElementById('createUserBtn');
    if (!btn) return;

    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
    btn.disabled = true;

    try {
        // Call the admin-create-user Edge Function
        const { data, error } = await window.supabase.functions.invoke('admin-create-user', {
            body: { email, password, role, fullName }
        });

        if (error) throw error;
        if (data && data.error) throw new Error(data.error);

        alert('User created successfully!');
        window.closeAddUserModal();
        window.loadUsersList();
    } catch (error) {
        console.error('Error creating user:', error);
        alert('Error creating user: ' + error.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
};

window.changeUserRole = async function (userId, currentRole) {
    const newRole = prompt(`Enter new role for user (admin, manager, cashier):`, currentRole);
    if (!newRole || newRole === currentRole) return;

    if (['admin', 'manager', 'cashier'].indexOf(newRole.toLowerCase()) === -1) {
        alert('Invalid role');
        return;
    }

    try {
        const { error } = await window.supabase
            .from('user_roles')
            .update({ role: newRole.toLowerCase() })
            .eq('user_id', userId);

        if (error) throw error;
        alert('Role updated successfully');
        window.loadUsersList();
    } catch (error) {
        console.error('Error updating role:', error);
        alert('Error updating role: ' + error.message);
    }
};
