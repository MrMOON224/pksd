/**
 * User Management Module Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    loadUsersList();
});

window.loadUsersList = async function () {
    const tbody = document.getElementById('usersBody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">Loading...</td></tr>';

    try {
        const { data: roles, error } = await window.supabase
            .from('user_roles')
            .select('user_id, role, created_at')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (roles.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">No users found</td></tr>';
            return;
        }

        tbody.innerHTML = roles.map((u, i) => `
            <tr>
                <td>${i + 1}</td>
                <td title="${u.user_id}">${u.user_id.substring(0, 8)}...</td>
                <td><span class="role-badge role-${u.role}">${u.role}</span></td>
                <td>-</td>
                <td>${new Date(u.created_at).toLocaleDateString()}</td>
                <td class="action-btns" style="justify-content: center;">
                    <button class="btn-icon" onclick="changeUserRole('${u.user_id}', '${u.role}')" title="Change Role">
                        <i class="fas fa-user-tag"></i>
                    </button>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error loading users:', error);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: #ef4444; padding: 20px;">Error loading users: ${error.message}</td></tr>`;
    }
};

window.showAddUserModal = function () {
    document.getElementById('addUserModal').classList.add('active');
};

window.closeAddUserModal = function () {
    document.getElementById('addUserModal').classList.remove('active');
    document.getElementById('addUserForm').reset();
};

window.handleCreateUser = async function (event) {
    if (event) event.preventDefault();

    const email = document.getElementById('newUserEmail').value;
    const password = document.getElementById('newUserPassword').value;
    const role = document.getElementById('newUserRole').value;
    const fullName = document.getElementById('newUserFullName').value;

    const btn = document.getElementById('createUserBtn');
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
    const newRole = prompt(`Enter new role for this user (admin, manager, cashier):`, currentRole);
    if (!newRole || newRole === currentRole) return;

    if (['admin', 'manager', 'cashier'].indexOf(newRole.toLowerCase()) === -1) {
        alert('Invalid role! functionality only supports: admin, manager, cashier');
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
