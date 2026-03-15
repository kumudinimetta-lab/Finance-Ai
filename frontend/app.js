const API_BASE_URL = "https://finance-ai.onrender.com/api";

function getToken() {
    return localStorage.getItem('token');
}

function authHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
    };
}

function handleApiError(res) {
    if (res.status === 401) {
        localStorage.removeItem('token');
        window.location.href = 'index.html';
        throw new Error("Unauthorized");
    }
}

// Authentication
if (document.getElementById('login-form')) {
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            const formData = new URLSearchParams();
            formData.append('username', email);
            formData.append('password', password);

            const res = await fetch(`${API_BASE_URL}/users/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData
            });
            const data = await res.json();

            if (res.ok) {
                localStorage.setItem('token', data.access_token);
                window.location.href = 'dashboard.html';
            } else {
                showAuthError(data.detail);
            }
        } catch (error) {
            showAuthError("Connection error.");
        }
    });
}

if (document.getElementById('register-form')) {
    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fullName = document.getElementById('reg-name').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;

        try {
            const res = await fetch(`${API_BASE_URL}/users/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, full_name: fullName, password })
            });
            const data = await res.json();

            if (res.ok) {
                document.getElementById('show-login').click();
                showAuthError("Registration successful. Please login.", "success");
            } else {
                showAuthError(data.detail);
            }
        } catch (error) {
            showAuthError("Connection error.");
        }
    });
}

function showAuthError(msg, type = "error") {
    const el = document.getElementById('auth-error');
    el.textContent = msg;
    el.style.color = type === "success" ? "var(--success)" : "var(--danger)";
    el.classList.remove('hidden');
}

// Dashboard Functions
let spendingChartInst = null;

async function initDashboard() {
    if (!getToken()) {
        window.location.href = 'index.html';
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/users/me`, { headers: authHeaders() });
        handleApiError(res);
        const user = await res.json();
        document.getElementById('user-name').textContent = user.full_name || user.email;
    } catch { }

    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = 'index.html';
    });

    const txModal = document.getElementById('tx-modal');
    document.getElementById('add-tx-btn').addEventListener('click', () => txModal.classList.remove('hidden'));
    document.querySelector('.close-btn').addEventListener('click', () => txModal.classList.add('hidden'));

    document.getElementById('tx-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount = parseFloat(document.getElementById('tx-amount').value);
        const desc = document.getElementById('tx-desc').value;
        const cat = document.getElementById('tx-cat').value;

        try {
            const res = await fetch(`${API_BASE_URL}/finance/transactions`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({ amount, description: desc, category: cat })
            });
            handleApiError(res);
            if (res.ok) {
                txModal.classList.add('hidden');
                document.getElementById('tx-form').reset();
                loadDashboardData();
            } else {
                const data = await res.json();
                document.getElementById('tx-error').textContent = data.detail || "Error adding transaction";
                document.getElementById('tx-error').classList.remove('hidden');
            }
        } catch (e) { console.error(e); }
    });

    loadDashboardData();
}

async function loadDashboardData() {
    try {
        const repRes = await fetch(`${API_BASE_URL}/ai/report/monthly`, { headers: authHeaders() });
        handleApiError(repRes);
        const report = await repRes.json();

        document.getElementById('total-income').textContent = `$${report.total_income.toFixed(2)}`;
        document.getElementById('total-spent').textContent = `$${report.total_spent.toFixed(2)}`;
        const net = report.total_income - report.total_spent;
        const netEl = document.getElementById('net-balance');
        netEl.textContent = `$${net.toFixed(2)}`;
        netEl.className = `amount ${net >= 0 ? 'success' : 'danger'}`;

        updateChart(report.category_breakdown);

        const txRes = await fetch(`${API_BASE_URL}/finance/transactions?limit=10`, { headers: authHeaders() });
        const transactions = await txRes.json();
        const tbody = document.getElementById('tx-body');
        tbody.innerHTML = '';
        transactions.forEach(tx => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${new Date(tx.date).toLocaleDateString()}</td>
                <td>${tx.description}</td>
                <td style="text-transform: capitalize;">${tx.category}</td>
                <td style="color: ${tx.category === 'salary' ? 'var(--success)' : 'var(--text-main)'}">
                   ${tx.category !== 'salary' ? '-' : '+'}$${tx.amount.toFixed(2)}
                </td>
                <td><button class="delete-btn" onclick="deleteTx(${tx.id})">Delete</button></td>
            `;
            tbody.appendChild(tr);
        });

    } catch (e) { console.error(e); }
}

function updateChart(data) {
    const ctx = document.getElementById('spendingChart');
    if (!ctx) return;

    if (spendingChartInst) {
        spendingChartInst.destroy();
    }

    const labels = Object.keys(data).map(k => k.charAt(0).toUpperCase() + k.slice(1));
    const values = Object.values(data);

    if (values.length === 0) {
        labels.push("No Data");
        values.push(1);
    }

    spendingChartInst = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: [
                    '#ff7b72', '#79c0ff', '#d2a8ff', '#a5d6ff', '#ffa657', '#3fb950', '#8b949e'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { color: '#c9d1d9' } }
            }
        }
    });
}

window.deleteTx = async function (id) {
    if (!confirm("Are you sure you want to delete this transaction?")) return;
    try {
        const res = await fetch(`${API_BASE_URL}/finance/transactions/${id}`, {
            method: 'DELETE',
            headers: authHeaders()
        });
        handleApiError(res);
        if (res.ok) {
            loadDashboardData();
        }
    } catch (e) { console.error(e); }
}

// Chat Functions
async function initChat() {
    if (!getToken()) {
        window.location.href = 'index.html';
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/users/me`, { headers: authHeaders() });
        handleApiError(res);
        const user = await res.json();
        document.getElementById('user-name').textContent = user.full_name || user.email;
    } catch { }

    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = 'index.html';
    });

    const chatForm = document.getElementById('chat-form');
    const input = document.getElementById('chat-input');
    const messagesArea = document.getElementById('chat-messages');

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = input.value.trim();
        if (!msg) return;

        appendMessage('user', msg);
        input.value = '';

        const loadingId = appendMessage('assistant', 'Thinking...');

        try {
            const res = await fetch(`${API_BASE_URL}/ai/chat`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({ message: msg })
            });
            handleApiError(res);
            const data = await res.json();

            updateMessage(loadingId, data.message || "Error processing request.");
        } catch (err) {
            updateMessage(loadingId, "Connection error.");
        }
    });

    let msgCounter = 0;
    function appendMessage(role, text) {
        msgCounter++;
        const id = `msg-${msgCounter}`;
        const div = document.createElement('div');
        div.className = `message ${role}`;
        div.id = id;
        div.innerHTML = `<div class="msg-content">${escapeHTML(text)}</div>`;
        messagesArea.appendChild(div);
        messagesArea.scrollTop = messagesArea.scrollHeight;
        return id;
    }

    function updateMessage(id, text) {
        const el = document.getElementById(id);
        if (el) {
            el.querySelector('.msg-content').textContent = text;
            messagesArea.scrollTop = messagesArea.scrollHeight;
        }
    }

    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g,
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag));
    }
}
