const { createClient } = supabase;
const supabaseUrl = 'https://jjjdzpmxyifubbnvktwn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqamR6cG14eWlmdWJibnZrdHduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg0OTI3NTksImV4cCI6MjA1NDA2ODc1OX0.v_ch7jHEKYLa5KN-lqkBqJVLAXjpvmVhKGi_FmxkVhI';
const db = createClient(supabaseUrl, supabaseKey);

let editingId = null;

async function init() {
    if (window.location.search.includes('mode=embedded')) {
        document.body.classList.add('embedded');
    }
    await loadTemplates();
}

async function loadTemplates() {
    const { data } = await db.from('sms_templates').select('*').order('created_at', { ascending: false });
    const grid = document.getElementById('templatesGrid');
    grid.innerHTML = '';

    data?.forEach(template => {
        const card = document.createElement('div');
        card.className = 'template-card';
        card.innerHTML = `
            <div class="template-header">
                <div class="template-name">${template.name}</div>
                <div class="template-actions">
                    <button class="btn-icon" onclick="editTemplate('${template.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon" onclick="deleteTemplate('${template.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            <div class="template-content">${template.message}</div>
        `;
        grid.appendChild(card);
    });
}

function openModal() {
    editingId = null;
    document.getElementById('templateForm').reset();
    document.getElementById('templateModal').classList.add('active');
}

function closeModal() {
    document.getElementById('templateModal').classList.remove('active');
}

async function editTemplate(id) {
    editingId = id;
    const { data } = await db.from('sms_templates').select('*').eq('id', id).single();
    document.getElementById('templateName').value = data.name;
    document.getElementById('templateMessage').value = data.message;
    document.getElementById('templateModal').classList.add('active');
}

async function deleteTemplate(id) {
    if (confirm('Delete this template?')) {
        await db.from('sms_templates').delete().eq('id', id);
        await loadTemplates();
    }
}

document.getElementById('templateForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        name: document.getElementById('templateName').value,
        message: document.getElementById('templateMessage').value
    };

    if (editingId) {
        await db.from('sms_templates').update(payload).eq('id', editingId);
    } else {
        await db.from('sms_templates').insert(payload);
    }

    closeModal();
    await loadTemplates();
});

document.addEventListener('DOMContentLoaded', init);
