// Settings Module JavaScript
const { createClient } = supabase;
const supabaseUrl = 'https://jjjdzpmxyifubbnvktwn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqamR6cG14eWlmdWJibnZrdHduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg0OTI3NTksImV4cCI6MjA1NDA2ODc1OX0.v_ch7jHEKYLa5KN-lqkBqJVLAXjpvmVhKGi_FmxkVhI';
const db = createClient(supabaseUrl, supabaseKey);

let settingsId = null;

// Tab switching
document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
        const tabName = button.dataset.tab;

        document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        button.classList.add('active');
        document.getElementById(`tab-${tabName}`).classList.add('active');
    });
});

// Load settings on init
async function init() {
    if (window.location.search.includes('mode=embedded')) {
        document.body.classList.add('embedded');
    }

    await loadCurrencies();
    await loadWarehouses();
    await loadSettings();
}

async function loadCurrencies() {
    const { data } = await db.from('currencies').select('*');
    const select = document.getElementById('defaultCurrency');
    data?.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.code;
        opt.textContent = `${c.name} (${c.symbol})`;
        select.appendChild(opt);
    });
}

async function loadWarehouses() {
    const { data } = await db.from('warehouses').select('*');
    const select = document.getElementById('defaultWarehouse');
    data?.forEach(w => {
        const opt = document.createElement('option');
        opt.value = w.id;
        opt.textContent = w.name;
        select.appendChild(opt);
    });
}

async function loadSettings() {
    const { data } = await db.from('settings').select('*').limit(1).single();
    if (data) {
        settingsId = data.id;
        document.getElementById('defaultCurrency').value = data.default_currency || '';
        document.getElementById('defaultEmail').value = data.default_email || '';
        document.getElementById('companyName').value = data.store_name || '';
        document.getElementById('companyPhone').value = data.store_phone || '';
        document.getElementById('footer').value = data.footer || '';
        document.getElementById('defaultCustomer').value = data.default_customer || 'walk-in-customer';
        document.getElementById('defaultWarehouse').value = data.default_warehouse || '';
        document.getElementById('country').value = data.country || '';
        document.getElementById('state').value = data.state || '';
        document.getElementById('city').value = data.city || '';
        document.getElementById('postalCode').value = data.postal_code || '';
        document.getElementById('dateFormat').value = data.date_format || 'YYYY-MM-DD';
        document.getElementById('currencyIconRight').checked = data.currency_icon_right || false;
        document.getElementById('developedBy').value = data.developed_by || '';

        // Prefixes
        document.getElementById('purchasePrefix').value = data.purchase_prefix || 'PU';
        document.getElementById('purchaseReturnPrefix').value = data.purchase_return_prefix || 'PR';
        document.getElementById('salesPrefix').value = data.sales_prefix || 'SA';
        document.getElementById('salesReturnPrefix').value = data.sales_return_prefix || 'SR';
        document.getElementById('expensePrefix').value = data.expense_prefix || 'EX';

        // Mail
        document.getElementById('mailMailer').value = data.mail_mailer || 'smtp';
        document.getElementById('mailHost').value = data.mail_host || '';
        document.getElementById('mailPort').value = data.mail_port || '1025';
        document.getElementById('senderName').value = data.sender_name || '';
        document.getElementById('mailUsername').value = data.mail_username || '';
        document.getElementById('mailPassword').value = data.mail_password || '';
        document.getElementById('mailEncryption').value = data.mail_encryption || '';

        // Receipt
        document.getElementById('showNote').checked = data.show_note ?? true;
        document.getElementById('showPhone').checked = data.show_phone ?? true;
        document.getElementById('showCustomer').checked = data.show_customer ?? true;
        document.getElementById('showAddress').checked = data.show_address ?? true;
        document.getElementById('showEmail').checked = data.show_email ?? false;
        document.getElementById('showTaxDiscount').checked = data.show_tax_discount ?? true;
        document.getElementById('showBarcode').checked = data.show_barcode ?? true;
        document.getElementById('showLogoPayment').checked = data.show_logo_payment ?? false;
        document.getElementById('showProductCode').checked = data.show_product_code ?? false;
        document.getElementById('receiptNote').value = data.receipt_note || '';

        if (data.store_logo) {
            document.getElementById('logoPreview').src = data.store_logo;
            document.getElementById('logoPreview').style.display = 'block';
        }
    }
}

// Save handlers
document.getElementById('settingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        default_currency: document.getElementById('defaultCurrency').value,
        default_email: document.getElementById('defaultEmail').value,
        store_name: document.getElementById('companyName').value,
        store_phone: document.getElementById('companyPhone').value,
        footer: document.getElementById('footer').value,
        default_customer: document.getElementById('defaultCustomer').value,
        default_warehouse: document.getElementById('defaultWarehouse').value,
        country: document.getElementById('country').value,
        state: document.getElementById('state').value,
        city: document.getElementById('city').value,
        postal_code: document.getElementById('postalCode').value,
        date_format: document.getElementById('dateFormat').value,
        currency_icon_right: document.getElementById('currencyIconRight').checked,
        developed_by: document.getElementById('developedBy').value,
        updated_at: new Date().toISOString()
    };

    if (settingsId) {
        await db.from('settings').update(payload).eq('id', settingsId);
    } else {
        const { data } = await db.from('settings').insert(payload).select().single();
        settingsId = data.id;
    }
    alert('Settings saved successfully!');
});

document.getElementById('prefixesForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        purchase_prefix: document.getElementById('purchasePrefix').value,
        purchase_return_prefix: document.getElementById('purchaseReturnPrefix').value,
        sales_prefix: document.getElementById('salesPrefix').value,
        sales_return_prefix: document.getElementById('salesReturnPrefix').value,
        expense_prefix: document.getElementById('expensePrefix').value,
        updated_at: new Date().toISOString()
    };

    if (settingsId) {
        await db.from('settings').update(payload).eq('id', settingsId);
        alert('Prefixes saved!');
    }
});

document.getElementById('mailForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        mail_mailer: document.getElementById('mailMailer').value,
        mail_host: document.getElementById('mailHost').value,
        mail_port: document.getElementById('mailPort').value,
        sender_name: document.getElementById('senderName').value,
        mail_username: document.getElementById('mailUsername').value,
        mail_password: document.getElementById('mailPassword').value,
        mail_encryption: document.getElementById('mailEncryption').value,
        updated_at: new Date().toISOString()
    };

    if (settingsId) {
        await db.from('settings').update(payload).eq('id', settingsId);
        alert('Mail settings saved!');
    }
});

document.getElementById('receiptForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        show_note: document.getElementById('showNote').checked,
        show_phone: document.getElementById('showPhone').checked,
        show_customer: document.getElementById('showCustomer').checked,
        show_address: document.getElementById('showAddress').checked,
        show_email: document.getElementById('showEmail').checked,
        show_tax_discount: document.getElementById('showTaxDiscount').checked,
        show_barcode: document.getElementById('showBarcode').checked,
        show_logo_payment: document.getElementById('showLogoPayment').checked,
        show_product_code: document.getElementById('showProductCode').checked,
        receipt_note: document.getElementById('receiptNote').value,
        updated_at: new Date().toISOString()
    };

    if (settingsId) {
        await db.from('settings').update(payload).eq('id', settingsId);
        alert('Receipt settings saved!');
    }
});

document.addEventListener('DOMContentLoaded', init);
