const { createClient } = supabase;
const supabaseUrl = 'https://jjjdzpmxyifubbnvktwn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqamR6cG14eWlmdWJibnZrdHduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg0OTI3NTksImV4cCI6MjA1NDA2ODc1OX0.v_ch7jHEKYLa5KN-lqkBqJVLAXjpvmVhKGi_FmxkVhI';
const db = createClient(supabaseUrl, supabaseKey);

let settingsId = null;

async function init() {
    if (window.location.search.includes('mode=embedded')) {
        document.body.classList.add('embedded');
    }
    await loadSettings();
}

async function loadSettings() {
    const { data } = await db.from('api_settings').select('*').limit(1).single();
    if (data) {
        settingsId = data.id;
        document.getElementById('smsProvider').value = data.sms_provider || 'twilio';
        document.getElementById('smsApiKey').value = data.sms_api_key || '';
        document.getElementById('smsApiSecret').value = data.sms_api_secret || '';
        document.getElementById('smsSenderId').value = data.sms_sender_id || '';
        document.getElementById('paymentGateway').value = data.payment_gateway || 'stripe';
        document.getElementById('paymentPublicKey').value = data.payment_public_key || '';
        document.getElementById('paymentSecretKey').value = data.payment_secret_key || '';
        document.getElementById('webhookUrl').textContent = data.webhook_url || 'https://yourapp.com/api/webhook';
    }
}

document.getElementById('smsApiForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        sms_provider: document.getElementById('smsProvider').value,
        sms_api_key: document.getElementById('smsApiKey').value,
        sms_api_secret: document.getElementById('smsApiSecret').value,
        sms_sender_id: document.getElementById('smsSenderId').value,
        updated_at: new Date().toISOString()
    };

    if (settingsId) {
        await db.from('api_settings').update(payload).eq('id', settingsId);
    } else {
        const { data } = await db.from('api_settings').insert(payload).select().single();
        settingsId = data.id;
    }
    alert('SMS API settings saved!');
});

document.getElementById('paymentApiForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        payment_gateway: document.getElementById('paymentGateway').value,
        payment_public_key: document.getElementById('paymentPublicKey').value,
        payment_secret_key: document.getElementById('paymentSecretKey').value,
        updated_at: new Date().toISOString()
    };

    if (settingsId) {
        await db.from('api_settings').update(payload).eq('id', settingsId);
    } else {
        const { data } = await db.from('api_settings').insert(payload).select().single();
        settingsId = data.id;
    }
    alert('Payment API settings saved!');
});

function copyWebhook() {
    const url = document.getElementById('webhookUrl').textContent;
    navigator.clipboard.writeText(url);
    alert('Webhook URL copied!');
}

document.addEventListener('DOMContentLoaded', init);
