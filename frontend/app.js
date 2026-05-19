// Auto-detect API base URL: works on localhost AND on Vercel
const API_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? `http://${window.location.host}/api/v1`
    : `${window.location.origin}/api/v1`;

console.log("Aura AI App initialized with API:", API_URL);

// Global States
let isAuth = !!localStorage.getItem("token");
let userRole = localStorage.getItem("userRole"); // 'CLIENT' or 'ADMIN'
let loggedUserId = localStorage.getItem("userId");
let loggedUserName = localStorage.getItem("userName");
let currentProjectId = null;
let currentContractHash = null;
let currentPackage = "";
let currentPrice = 0;

// Global Projects Cache
let clientProjects = [];
let auditLogs = []; // Global mock logs for admin

// --- Auth Fetch Helper ---
async function authFetch(url, options = {}) {
    const token = localStorage.getItem("token");
    const headers = {
        ...options.headers,
        "Authorization": `Bearer ${token}`
    };
    
    const response = await fetch(url, { ...options, headers });
    
    if (response.status === 401) {
        // Token expired or invalid
        btnLogout.click();
        showToast("Sesi habis, silakan login kembali.", "error");
        throw new Error("Unauthorized");
    }
    
    return response;
}

// Navigation Nodes
const viewLanding = document.getElementById("view-landing");
const viewClientDashboard = document.getElementById("view-client-dashboard");
const viewAdminDashboard = document.getElementById("view-admin-dashboard");
const navDashboard = document.getElementById("nav-dashboard");
const btnOpenLogin = document.getElementById("btnOpenLogin");
const btnOpenAdmin = document.getElementById("btnOpenAdmin");
const btnOpenRegister = document.getElementById("btnOpenRegister");
const btnLogout = document.getElementById("btnLogout");

// Modal Nodes
const authModal = document.getElementById("auth-modal");
const registerModal = document.getElementById("register-modal");
const checkoutView = document.getElementById("view-checkout");

// Step Nodes
const step1 = document.getElementById("step1-card");
const step2 = document.getElementById("step2-card");
const step3 = document.getElementById("step3-card");
const ind1 = document.getElementById("indicator-1");
const ind2 = document.getElementById("indicator-2");
const ind3 = document.getElementById("indicator-3");

// Add initial seed mock data so dashboard isn't completely empty
clientProjects = [
    { id: 101, name: "Website Static", status: "ESCROW_FUNDED", hash: "6b7c9716c5921f3d8..." }
];
auditLogs = [
    { time: "2 Menit lalu", pid: 101, action: "PAYMENT_SETTLED", state: "ESCROW_FUNDED", ip: "Gateway" },
    { time: "10 Menit lalu", pid: 101, action: "CONTRACT_SIGNED", state: "CONTRACT_SIGNED", ip: "192.168.1.5" },
];

// --- Toast Notification System ---
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'fa-circle-info';
    if (type === 'error') icon = 'fa-circle-exclamation';
    if (type === 'success') icon = 'fa-circle-check';

    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-closing');
        setTimeout(() => toast.remove(), 400); // Wait for exit animation
    }, 4000);
}

// --- Custom Promise-based Dialog ---
function showCustomDialog({ title = "Konfirmasi", message, type = 'confirm', inputs = [] }) {
    return new Promise((resolve) => {
        const dialog = document.getElementById("custom-dialog");
        const titleEl = document.getElementById("dialogTitle");
        const msgEl = document.getElementById("dialogMessage");
        const iconEl = document.getElementById("dialogIcon");
        const inputsEl = document.getElementById("dialogInputs");

        const btnConfirm = document.getElementById("btnDialogConfirm");
        const btnCancel = document.getElementById("btnDialogCancel");

        // Reset and set content
        titleEl.textContent = title;
        msgEl.innerHTML = message;
        inputsEl.innerHTML = '';

        if (type === 'prompt' && inputs.length > 0) {
            inputsEl.classList.remove('hidden');
            inputs.forEach((inp, idx) => {
                inputsEl.innerHTML += `
                    <div style="margin-bottom: 10px;">
                        <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:5px;">${inp.label}</label>
                        <input type="text" id="dlgInp_${idx}" placeholder="${inp.placeholder}" value="${inp.value || ''}" style="width:100%; padding:10px; font-size:13px; border-radius:8px;">
                    </div>
                `;
            });
        } else {
            inputsEl.classList.add('hidden');
        }

        // Handle Button Visibility & Text
        if (type === 'info') {
            btnCancel.classList.add('hidden');
            btnConfirm.textContent = "Tutup";
        } else {
            btnCancel.classList.remove('hidden');
            btnConfirm.textContent = "Ya, Lanjutkan";
        }

        // Show Dialog
        dialog.classList.remove("hidden");
        document.body.style.overflow = "hidden";

        // Handlers
        const closeDialog = () => {
            dialog.classList.add("hidden");
            document.body.style.overflow = "auto";

            // Clean up listeners
            btnConfirm.replaceWith(btnConfirm.cloneNode(true));
            btnCancel.replaceWith(btnCancel.cloneNode(true));
        };

        document.getElementById("btnDialogConfirm").addEventListener("click", () => {
            if (type === 'prompt') {
                const results = inputs.map((_, idx) => document.getElementById(`dlgInp_${idx}`).value);
                closeDialog();
                resolve(results);
            } else {
                closeDialog();
                resolve(true);
            }
        });

        document.getElementById("btnDialogCancel").addEventListener("click", () => {
            closeDialog();
            resolve(type === 'prompt' ? null : false);
        });
    });
}


// --- Routing & Views ---
function switchView(viewId) {
    viewLanding.classList.add("hidden");
    viewClientDashboard.classList.add("hidden");
    viewAdminDashboard.classList.add("hidden");
    const ordView = document.getElementById("view-client-order");
    if (ordView) ordView.classList.add("hidden");
    const checkView = document.getElementById("view-checkout");
    if (checkView) checkView.classList.add("hidden");

    document.getElementById(viewId).classList.remove("hidden");

    // Ensure page can always scroll and jumps to top on view change
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
    window.scrollTo({ top: 0, behavior: "instant" });
}

function updateNavAuth() {
    if (isAuth) {
        if (btnOpenLogin) btnOpenLogin.classList.add("hidden");
        if (btnOpenAdmin) btnOpenAdmin.classList.add("hidden");
        if (btnOpenRegister) btnOpenRegister.classList.add("hidden");
        if (btnLogout) btnLogout.classList.remove("hidden");
        if (navDashboard) navDashboard.classList.remove("hidden");
        const navOrder = document.getElementById("nav-order");
        if (navOrder && userRole === "CLIENT") navOrder.classList.remove("hidden");
    } else {
        if (btnOpenLogin) btnOpenLogin.classList.remove("hidden");
        if (btnOpenAdmin) btnOpenAdmin.classList.remove("hidden");
        if (btnOpenRegister) btnOpenRegister.classList.remove("hidden");
        if (btnLogout) btnLogout.classList.add("hidden");
        if (navDashboard) navDashboard.classList.add("hidden");

        const navOrder = document.getElementById("nav-order");
        if (navOrder) navOrder.classList.add("hidden");

        switchView("view-landing");
    }
}

document.getElementById("nav-services").addEventListener("click", () => switchView("view-landing"));
document.getElementById("nav-workflow").addEventListener("click", () => switchView("view-landing"));

navDashboard.addEventListener("click", () => {
    if (userRole === "ADMIN") {
        switchView("view-admin-dashboard");
        renderAdminDashboard();
    } else {
        switchView("view-client-dashboard");
        renderClientDashboard();
    }
});

btnLogout.addEventListener("click", () => {
    isAuth = false;
    userRole = null;
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userId");
    localStorage.removeItem("userName");
    updateNavAuth();
    showToast("Berhasil logout", "info");
});

// --- Modal Handlers ---
document.querySelectorAll(".close-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
        const modalId = e.target.getAttribute("data-close");
        document.getElementById(modalId).classList.add("hidden");
        document.body.style.overflow = "auto";
    });
});

btnOpenLogin.addEventListener("click", () => {
    document.getElementById("authTitle").innerText = "Client Portal Login";
    authModal.classList.remove("hidden");
});

if (btnOpenRegister) {
    btnOpenRegister.addEventListener("click", () => {
        registerModal.classList.remove("hidden");
    });
}

document.getElementById("linkToRegister").addEventListener("click", (e) => {
    e.preventDefault();
    authModal.classList.add("hidden");
    registerModal.classList.remove("hidden");
});

document.getElementById("linkToLogin").addEventListener("click", (e) => {
    e.preventDefault();
    registerModal.classList.add("hidden");
    authModal.classList.remove("hidden");
});

btnOpenAdmin.addEventListener("click", () => {
    document.getElementById("authTitle").innerHTML = "<i class='fa-solid fa-shield-halved'></i> Admin Gateway";
    authModal.classList.remove("hidden");
});

// --- Auth Submission ---
document.getElementById("authForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("authEmail").value;
    const password = document.getElementById("authPassword").value;
    const btn = document.getElementById("btnSubmitAuth");
    
    btn.disabled = true;
    btn.innerHTML = `<div class="loader" style="width:16px; height:16px; display:inline-block;"></div> Memproses...`;

    try {
        const formData = new FormData();
        formData.append("username", email);
        formData.append("password", password);

        const res = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            body: formData
        });

        if (!res.ok) {
            const errorText = await res.text();
            try {
                const errorData = JSON.parse(errorText);
                throw new Error(errorData.detail || "Login gagal");
            } catch (e) {
                throw new Error(`Server Error: ${res.status} - ${errorText.substring(0, 50)}...`);
            }
        }

        const data = await res.json();

        localStorage.setItem("token", data.access_token);
        
        isAuth = true;
        userRole = data.role; // Use role from server
        localStorage.setItem("userRole", userRole);
        
        loggedUserId = data.user_id; 
        loggedUserName = data.full_name;
        localStorage.setItem("userId", loggedUserId);
        localStorage.setItem("userName", loggedUserName);

        authModal.classList.add("hidden");
        updateNavAuth();
        showToast("Login Berhasil!", "success");

        if (userRole === "ADMIN") {
            switchView("view-admin-dashboard");
            renderAdminDashboard();
        } else if (userRole === "CLIENT") {
            if (document.getElementById("clientNameDisplay")) {
                document.getElementById("clientNameDisplay").innerText = loggedUserName;
            }
            switchView("view-client-dashboard");
            renderClientDashboard();
        } else {
            showToast("Role tidak dikenali.", "error");
        }
    } catch (err) {
        showToast(err.message, "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = `Masuk <i class="fa-solid fa-arrow-right-to-bracket"></i>`;
    }
});

// --- Register Submission ---
document.getElementById("registerForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fullName = document.getElementById("regFullName").value;
    const email = document.getElementById("regEmail").value;
    const password = document.getElementById("regPassword").value;
    const btn = document.getElementById("btnSubmitRegister");

    btn.disabled = true;
    btn.innerHTML = `<div class="loader" style="width:16px; height:16px; display:inline-block;"></div> Mendaftarkan...`;

    try {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                full_name: fullName,
                email: email,
                password: password,
                role: "CLIENT"
            })
        });

        if (!res.ok) {
            const errorText = await res.text();
            try {
                const errorData = JSON.parse(errorText);
                throw new Error(errorData.detail || "Registrasi gagal");
            } catch (e) {
                throw new Error(`Server Error: ${res.status} - ${errorText.substring(0, 50)}...`);
            }
        }

        const data = await res.json();

        showToast("Akun berhasil dibuat! Silakan login.", "success");
        registerModal.classList.add("hidden");
        authModal.classList.remove("hidden");
        document.getElementById("authEmail").value = email;
    } catch (err) {
        showToast(err.message, "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = `Daftar Sekarang <i class="fa-solid fa-user-plus"></i>`;
    }
});

// --- Dashboards Renders ---
function getStatusTag(status) {
    if (status.includes("DRAFT") || status.includes("PENDING")) return `<span class="tag draft">${status}</span>`;
    if (status.includes("SIGNED")) return `<span class="tag signed">${status}</span>`;
    if (status.includes("ESCROW")) return `<span class="tag escrow">${status}</span>`;
    if (status.includes("REVISION")) return `<span class="tag" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2);">${status}</span>`;
    return `<span class="tag">${status}</span>`;
}

async function renderClientDashboard() {
    const tbody = document.getElementById("clientProjectTableBody");
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px;"><div class="loader" style="margin: 0 auto; border-color: var(--accent);"></div></td></tr>`;

    try {
        const res = await authFetch(`${API_URL}/projects`);
        const projects = await res.json();
        clientProjects = projects; // Update global cache

        // Update KPIs
        document.getElementById("client-total-projects").textContent = projects.length;
        const pendingCount = projects.filter(p => ['PENDING_CONTRACT', 'COMPLETED', 'REVISION_REQUESTED'].includes(p.status)).length;
        document.getElementById("client-pending-action").textContent = pendingCount;

        // Calculate real escrow value
        const escrowTotal = projects.reduce((sum, p) => {
            const price = p.name.includes('Enterprise RAG') ? 45000000 : 100000;
            return sum + (p.status !== 'DRAFT' ? price : 0);
        }, 0);
        document.getElementById("client-active-escrow").textContent = `Rp ${escrowTotal.toLocaleString('id-ID')}`;

        if (projects.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 30px;" class="muted">Belum ada proyek aktif. Silakan buat proyek baru.</td></tr>`;
            return;
        }

        tbody.innerHTML = projects.map(p => {
            let actions = "";
            if (p.status === 'PENDING_CONTRACT') {
                actions = `<button class="btn-glow btn-sm" onclick="resumeContract(${p.id})">Review & Sign</button>`;
            } else if (p.status === 'CONTRACT_SIGNED') {
                actions = `
                    <div style="display:flex; gap:8px;">
                        <button class="btn-glow success btn-sm" onclick="openPaymentModal(${p.id})"><i class="fa-solid fa-credit-card"></i> Bayar Escrow</button>
                        <button class="btn-glow secondary btn-sm" onclick="printInvoiceById(${p.id})"><i class="fa-solid fa-file-invoice"></i> Inv</button>
                    </div>`;
            } else if (p.status === 'ESCROW_FUNDED') {
                actions = `
                    <div style="display:flex; gap:8px; align-items:center;">
                        <span style="color:#10b981; font-size:12px; font-weight:600;"><i class="fa-solid fa-shield"></i> Escrow Aman</span>
                        <button class="btn-glow secondary btn-sm" onclick="printReceiptById(${p.id})"><i class="fa-solid fa-receipt"></i> Kwitansi</button>
                    </div>`;
            } else if (p.status === 'COMPLETED') {
                actions = `
                    <div style="display:flex; gap:8px;">
                        <button class="btn-glow success btn-sm" onclick="acceptDelivery(${p.id})"><i class="fa-solid fa-check"></i> Accept</button>
                        <button class="btn-glow secondary btn-sm" onclick="printReceiptById(${p.id})"><i class="fa-solid fa-receipt"></i> Kwitansi</button>
                    </div>`;
            } else {
                actions = p.developer_notes ? `<span class="muted">${p.developer_notes}</span>` : `<button class="btn-glow secondary btn-sm" onclick="viewContract(${p.id})">Lihat Kontrak</button>`;
            }

            return `
                <tr>
                    <td>#${p.id}</td>
                    <td style="font-weight:600;">${p.name}</td>
                    <td>${getStatusTag(p.status)}</td>
                    <td>
                        ${p.deployment_link ? `<a href="${p.deployment_link}" target="_blank" class="accent-text"><i class="fa-solid fa-link"></i> Buka App</a>` : `<span class="muted"><i class="fa-solid fa-lock"></i> Menunggu...</span>`}
                    </td>
                    <td>${actions}</td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" class="muted">Failed to load projects: ${err.message}</td></tr>`;
    }
}

async function renderAdminDashboard() {
    const tbody = document.getElementById("adminAuditTableBody");
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px;"><div class="loader" style="margin: 0 auto; border-color: var(--admin-color);"></div></td></tr>`;

    try {
        // Fetch Projects for action buttons
        const projRes = await authFetch(`${API_URL}/projects`);
        const projects = await projRes.json();

        // Update Admin KPIs
        const activeCount = projects.filter(p => !['COMPLETED'].includes(p.status)).length;
        const revCount = projects.filter(p => p.status === 'REVISION_REQUESTED').length;
        const validValue = projects.filter(p => p.status !== 'DRAFT').length * 45000000;

        document.getElementById("admin-tvl").textContent = `Rp ${validValue.toLocaleString('id-ID')}`;
        document.getElementById("admin-active-pipelines").textContent = activeCount;
        document.getElementById("admin-pending-revisions").textContent = revCount;

        let allLogs = [];
        try {
            const auditRes = await authFetch(`${API_URL}/audit-logs`);
            allLogs = await auditRes.json();
        } catch (e) { } // Fallback if no logs

        // Show Projects at the top of the Admin dashboard instead of just Audit logs if we want to add buttons
        const thead = document.querySelector("#view-admin-dashboard .project-table thead tr");
        if (thead) thead.innerHTML = `<th>Project ID</th><th>Project Name</th><th>Status Transaksi</th><th>Aksi Admin</th>`;

        tbody.innerHTML = projects.map(p => `
        <tr>
            <td style="font-weight:bold;">#${p.id}</td>
            <td>${p.name}</td>
            <td>${getStatusTag(p.status)}</td>
            <td>
                ${p.developer_notes && p.developer_notes.includes('AWAITING_PHYSICAL_PAYMENT') && p.status === 'CONTRACT_SIGNED'
                ? `<button class="btn-glow warning btn-sm admin" style="background: #f59e0b; border-color: #f59e0b; color: white;" onclick="validatePhysicalPayment(${p.id}, '${p.developer_notes.split('|')[1].split(':')[1]}', '${p.developer_notes.split('URL:')[1]}')"><i class="fa-solid fa-money-bill-wave"></i> Validasi Tunai Rp ${p.developer_notes.split('|')[1].split(':')[1]}</button>`
                : p.status === 'ESCROW_FUNDED'
                ? `<div style="display:flex; flex-direction:column; gap:6px;">
                    <button class="btn-glow btn-sm admin" onclick="updateProjectStatus(${p.id}, 'IN_PROGRESS', false)"><i class="fa-solid fa-play"></i> Mulai Build AI</button>
                    <button class="btn-glow success btn-sm" style="background:#10b981;" onclick="updateProjectStatus(${p.id}, 'COMPLETED', true)"><i class="fa-solid fa-paper-plane"></i> Kirim Aplikasi Selesai</button>
                   </div>`
                : p.status === 'IN_PROGRESS'
                    ? `<button class="btn-glow success btn-sm" onclick="updateProjectStatus(${p.id}, 'COMPLETED', true)"><i class="fa-solid fa-paper-plane"></i> Delivered</button>`
                : p.status === 'REVISION_REQUESTED'
                    ? `<button class="btn-glow secondary btn-sm" style="margin-bottom:8px; border-color:#ef4444; color:#ef4444;" onclick="viewRevisionNotes(${p.id}, '${(p.client_revision_notes || '').replace(/'/g, "\\'")}')"><i class="fa-solid fa-note-sticky"></i> Lihat Catatan Revisi</button><br><button class="btn-glow success btn-sm" onclick="updateProjectStatus(${p.id}, 'COMPLETED', true)"><i class="fa-solid fa-paper-plane"></i> Deliver Revision</button>`
                : `<span class="muted">No Actions</span>`
            }
            </td>
        </tr>
    `).join('');

    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" class="muted">Failed to load data: ${err.message}</td></tr>`;
    }
}

async function updateProjectStatus(projectId, newStatus, isDeliveryPhase = false) {
    const isConfirmed = await showCustomDialog({
        title: "Konfirmasi Status",
        message: `Update Proyek #${projectId} menjadi <b>${newStatus}</b>?`,
        type: 'confirm'
    });

    if (!isConfirmed) return;

    let payload = { new_status: newStatus };

    // IF this is the delivery transition, prompt the admin for the link and notes!
    if (isDeliveryPhase) {
        const promptResult = await showCustomDialog({
            title: "Serah Terima (Handover)",
            message: "Opsional. Masukkan link dan catatan untuk sisi Klien.",
            type: 'prompt',
            inputs: [
                { label: "Link Deployment App", placeholder: "https://", value: "https://" },
                { label: "Catatan Developer", placeholder: "Aplikasi sudah siap dites!", value: "Aplikasi RAG sudah siap dites!" }
            ]
        });

        if (!promptResult) return; // Cancelled

        const [link, notes] = promptResult;
        if (link && link !== "https://") payload.deployment_link = link;
        if (notes) payload.developer_notes = notes;
    }

    try {
        const res = await authFetch(`${API_URL}/projects/${projectId}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error(await res.text());

        // Refresh Current View
        if (userRole === "ADMIN") renderAdminDashboard();
        else renderClientDashboard();

        showToast(`Berhasil update proyek #${projectId} ke status ${newStatus}`, 'success');

    } catch (err) {
        showToast("Gagal update status: " + err.message, 'error');
    }
}

async function validatePhysicalPayment(projectId, nominal, url) {
    const isConfirmed = await showCustomDialog({
        title: "Validasi Pembayaran Fisik",
        message: `Klien telah menyetorkan uang tunai yang terdeteksi AI sebesar <b>${nominal}</b>.<br>
                  <img src="${url}" style="width:100%; max-height:200px; object-fit:contain; background:#f1f5f9; border-radius:8px; margin: 15px 0;">
                  <br>Apakah Anda memvalidasi penerimaan fisik ini dan ingin mengubah statusnya menjadi ESCROW_FUNDED?`,
        type: 'confirm'
    });

    if (!isConfirmed) return;

    try {
        const payload = { new_status: 'ESCROW_FUNDED', developer_notes: "Validated by Admin" };
        const res = await authFetch(`${API_URL}/projects/${projectId}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error(await res.text());

        renderAdminDashboard();
        showToast(`Berhasil memvalidasi pembayaran fisik untuk proyek #${projectId}`, 'success');

    } catch (err) {
        showToast("Gagal memvalidasi: " + err.message, 'error');
    }
}


async function acceptDelivery(projectId) {
    // Dipanggil oleh Client Dashboard
    updateProjectStatus(projectId, 'FULLY_PAID');
    showToast("Terima kasih! Dana Escrow akan dicairkan. Hak Cipta (IP) App RAG kini sepenuhnya milik Anda.", 'success');
}

async function requestRevision(projectId) {
    const promptResult = await showCustomDialog({
        title: "Ajukan Revisi Aplikasi",
        message: "Fitur apa yang kurang sesuai dengan ekspektasi atau persyaratan kontrak awal?",
        type: 'prompt',
        inputs: [
            { label: "Catatan Revisi", placeholder: "Tolong perbaiki akurasi pada file X...", value: "" }
        ]
    });

    if (!promptResult || !promptResult[0].trim()) return;

    try {
        const payload = {
            new_status: 'REVISION_REQUESTED',
            client_revision_notes: promptResult[0]
        };

        const res = await authFetch(`${API_URL}/projects/${projectId}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error(await res.text());

        renderClientDashboard();
        showToast(`Revisi untuk proyek #${projectId} berhasil diajukan ke antrian Developer.`, 'info');

    } catch (err) {
        showToast("Gagal mengajukan revisi: " + err.message, 'error');
    }
}

function viewRevisionNotes(projectId, notes) {
    showCustomDialog({
        title: `Catatan Revisi Klien (Proyek #${projectId})`,
        message: notes || "Tidak ada catatan eksplisit.",
        type: 'info'
    });
}

// --- E-COMMERCE SHOP / CATALOG LOGIC ---
const productCatalog = {
    'Knowledge Bot (Basic)': {
        title: 'Knowledge Bot',
        badge: 'Basic',
        badgeClass: '',
        price: 'Rp 15.000.000',
        desc: 'Sistem Chatbot RAG pintar yang difokuskan pada pemrosesan dokumen statis seperti SOP, Panduan Karyawan, maupun Knowledge Base perusahaan. Memungkinkan karyawan bertanya jawab langsung dengan dokumen tanpa harus mencarinya manual.',
        features: [
            'Chatbot AI khusus Dokumen PDF / Word',
            'Sistem Retrieval LangChain & Vector DB (Chroma/FAISS)',
            'Kapasitas Indexing hingga 100 Dokumen',
            'Basic Access Control (1 Role)'
        ],
        image: 'assets/knowledge_bot.png'
    },
    'Enterprise RAG (Pro)': {
        title: 'Enterprise RAG',
        badge: 'Pro',
        badgeClass: 'pro',
        price: 'Rp 45.000.000',
        desc: 'Evolusi arsitektur Hybrid & Semantic Search yang terintegrasi langsung secara dinamis ke ekosistem Database SQL dan API internal perusahaan Anda, menghasilkan output yang divalidasi dengan Agentic Routing.',
        features: [
            'Integrasi Two-Way DB SQL & API Internal',
            'Hybrid Search (Vector + Keyword) terpadu',
            'Orkestrasi Multi-Agent (LangGraph)',
            'Immutable Audit Logging & Dashboard Kripto',
            'On-Premise / Private Cloud Deployment'
        ],
        image: 'assets/enterprise_rag.png'
    },
    'Custom Agent (NLP)': {
        title: 'Custom AI Agent',
        badge: 'NLP',
        badgeClass: 'nlp',
        price: 'Mulai Rp 60.000.000',
        desc: 'Pengembangan arsitektur AI *tailor-made* untuk alur kerja perusahaan yang sangat rumit. Model ini mampu membuat keputusan berlapis dan mengambil tindakan (tool-call) ke sistem eksternal secara leluasa.',
        features: [
            'Alur Kerja Custom Multi-Agent (HR, Finance, Operasional)',
            'Fine-Tuning SLM / LLM On-Premise',
            'Deep API Integrations & Webhooks',
            'Full IP Ownership & Custom Vector Parameter',
            'Dedicated 24/7 Support selama 6 Bulan'
        ],
        image: 'assets/custom_agent.png'
    },
    'Money Detector': {
        title: 'Deteksi Uang Fisik',
        badge: 'Lite',
        badgeClass: '',
        price: 'Rp 100.000',
        desc: 'Aplikasi AI Computer Vision untuk mendeteksi nominal dan keaslian uang fisik dengan cepat dan akurat.',
        features: [
            'Model Computer Vision AI Terkini',
            'Deteksi Nominal & Keaslian (Rupiah)',
            'Kecepatan Inferensi Tinggi (<1 detik)',
            'Siap Pakai Tanpa Training Tambahan'
        ],
        image: 'assets/knowledge_bot.png'
    }
};

const pdModal = document.getElementById("product-details-modal");

function openProductDetails(productId) {
    const item = productCatalog[productId];
    if (!item) return;

    // Populate Modal
    document.getElementById("pd-image").src = item.image;

    // Badge
    const badgeEl = document.getElementById("pd-badge");
    badgeEl.textContent = item.badge;
    badgeEl.className = `badge-sm ${item.badgeClass}`;
    if (!item.badgeClass) badgeEl.className = 'badge-sm';

    document.getElementById("pd-title").textContent = item.title;
    document.getElementById("pd-price").textContent = item.price;
    document.getElementById("pd-desc").innerHTML = item.desc;

    // Features List
    const featUl = document.getElementById("pd-features");
    featUl.innerHTML = "";
    item.features.forEach(f => {
        const li = document.createElement("li");
        li.innerHTML = `<i class="fa-solid fa-check"></i> ${f}`;
        featUl.appendChild(li);
    });

    // Wire up Order button
    const orderBtn = document.getElementById("pd-order-btn");
    orderBtn.onclick = () => {
        pdModal.classList.add("hidden");
        openCheckout(productId);
    };

    pdModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
}

function openCheckout(packageTitle) {
    if (!isAuth || userRole !== 'CLIENT') {
        showToast("Pendirian Sistem AI Membutuhkan Akun Korporat. Silakan Login.", "error");
        btnOpenLogin.click();
        return;
    }

    currentProjectId = null; // Reset for new order
    currentPackage = packageTitle;
    let fallbackPrice = 15000000;
    if (currentPackage.includes('Pro')) fallbackPrice = 45000000;
    if (currentPackage.includes('Money Detector')) fallbackPrice = 100000;
    currentPrice = productCatalog[currentPackage] ? parseInt(productCatalog[currentPackage].price.replace(/[^0-9]/g, '')) || fallbackPrice : fallbackPrice;

    document.getElementById("selected-package-text").textContent = currentPackage;
    document.getElementById("tagihan-display").textContent = `Rp ${currentPrice.toLocaleString('id-ID')}`;

    // Reset steps
    step1.classList.remove("hidden");
    step2.classList.add("hidden");
    step3.classList.add("hidden");
    ind1.classList.add("active");
    ind2.classList.remove("active");
    ind3.classList.remove("active");

    document.getElementById("btnSubmitBrief").disabled = false;
    document.getElementById("btnSubmitBrief").innerHTML = `<span>Sintesis Kontrak Legal (AI Agent)</span> <div class="loader hidden" id="briefLoader"></div>`;

    switchView("view-checkout");
    document.body.scrollIntoView();
}

document.querySelectorAll('.order-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        openCheckout(e.target.getAttribute('data-package'));
    });
});

document.getElementById("btnNewProject").addEventListener("click", () => {
    switchView("view-client-order");
});

const navOrder = document.getElementById("nav-order");
if (navOrder) {
    navOrder.addEventListener("click", () => {
        switchView("view-client-order");
    });
}


// --- E-CONTRACT TRANSACTION FLOW (API CALLS) ---

// STEP 1: SUBMIT BRIEF TO AI
document.getElementById("briefForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("btnSubmitBrief");
    const loader = document.getElementById("briefLoader");

    btn.disabled = true;
    loader.classList.remove("hidden");
    btn.querySelector("span").textContent = "AI LangGraph mengekstraksi klausul dari brief Anda...";

    const projectName = document.getElementById("projectName").value;
    const brief = document.getElementById("briefText").value;
    const fullBrief = `[Paket: ${currentPackage}] Kebutuhan: ${brief}`;

    try {
        const payload = {
            client_id: loggedUserId,
            project_name: projectName,
            client_brief: fullBrief
        };

        const res = await authFetch(`${API_URL}/projects/submit-brief`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();

        currentProjectId = data.project_id; // Set ID dari DB asli

        // Simpan ke array Dashboard secara optimistik
        clientProjects.unshift({ id: currentProjectId, name: projectName, status: "PENDING_CONTRACT", hash: "generating..." });

        // Track log
        auditLogs.unshift({ time: "Baru saja", pid: currentProjectId, action: "PROJECT_CREATED_DRAFT", state: "DRAFT", ip: "127.0.0.1" });

        // Tunggu AI Backend kelar (Simulasi 2.5s)
        setTimeout(fetchGeneratedContract, 2500);

    } catch (err) {
        showToast("Error API Endpoint: " + err.message, 'error');
        btn.disabled = false;
        loader.classList.add("hidden");
        btn.querySelector("span").textContent = "Coba Lagi";
    }
});

// Helper for UI Draft transition
async function fetchGeneratedContract() {
    const briefRaw = document.getElementById("briefText").value;
    const today = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
    const draftText = `
        <div class="contract-inner-document">
            <div class="contract-header-doc">
                <p class="doc-label">DOKUMEN PERJANJIAN KERJASAMA RESMI</p>
                <h1 class="doc-title">PERJANJIAN KERJASAMA PENGEMBANGAN SISTEM<br>RETRIEVAL-AUGMENTED GENERATION (RAG)</h1>
                <p class="doc-number">Nomor: AURA/RAG/${new Date().getFullYear()}/${currentProjectId || 1}</p>
            </div>
            
            <p class="doc-intro">Pada hari ini, tanggal <strong>${today}</strong>, dibuat dan ditandatangani perjanjian secara kriptografik (selanjutnya disebut <em>"Perjanjian"</em>) antara para pihak berikut:</p>
            
            <table class="doc-parties-table">
                <tr>
                    <td class="party-col">Pihak I</td>
                    <td><strong>PT. AURA AI LABS</strong> &mdash; sebagai Pihak Pertama (Pengembang)</td>
                </tr>
                <tr>
                    <td class="party-col">Pihak II</td>
                    <td><strong>PT. MAJU MUNDUR</strong> &mdash; sebagai Pihak Kedua (Pengguna Jasa / Klien)</td>
                </tr>
            </table>
            
            <h2 class="doc-pasal">Pasal 1 &mdash; Ruang Lingkup Kerja</h2>
            <p>PIHAK PERTAMA sepakat untuk merancang, mengimplementasikan, dan melakukan <em>deployment</em> Sistem AI RAG dengan paket: <strong class="doc-highlight">${currentPackage}</strong>. Sistem dirancang khusus untuk memenuhi ekstraksi data sebagaimana dijabarkan pada brief berikut:</p>
            <div class="doc-brief-box">
                &ldquo;${briefRaw}&rdquo;
            </div>
            
            <h2 class="doc-pasal">Pasal 2 &mdash; Keamanan Data &amp; Zero Leak Policy</h2>
            <p>Seluruh basis data, dokumen PDF/Word, dan parameter SQL yang diproses (<em>"Corpus"</em>) akan dikelola melalui infrastruktur terisolasi sepenuhnya di lingkungan <em>on-premise</em> atau <em>private cloud</em> milik klien. Algoritma menggunakan model <em>Large Language Models</em> (Llama / Mistral) yang di-<em>host</em> secara privat. PIHAK PERTAMA bertanggung jawab mutlak atas setiap kebocoran data ke <em>public cloud</em> pihak ketiga.</p>
            
            <h2 class="doc-pasal">Pasal 3 &mdash; Penahanan Dana (Escrow) dan Pembayaran</h2>
            <p>Pembayaran senilai <strong class="doc-highlight">Rp ${currentPrice.toLocaleString('id-ID')}</strong> diikat menggunakan skema penahanan keamanan (<em>Escrow Webhook</em>). Pengembangan sistem RAG tidak akan dimulai sebelum Dana Escrow terverifikasi oleh sistem. PIHAK KEDUA berhak menolak hasil penyelesaian bila tidak sesuai <em>brief</em> yang disepakati, dan berhak mengajukan revisi.</p>
            <h2 class="doc-pasal">Pasal 4 &mdash; Kepemilikan Hak Kekayaan Intelektual (HAKI)</h2>
            <p>Kecuali komponen Open Source (LangChain, LangGraph, ChromaDB), seluruh Source Code, skema basis data Vektor, API Endpoints, dan parameter yang dipersonalisasi sepenuhnya beralih kepemilikannya (100% IP Transfer) ke PIHAK KEDUA setelah sistem diserahkan dan diterima (Delivered & Accepted).</p>

            <div style="margin-top: 50px; padding-top: 20px; border-top: 2px dashed #cbd5e1; text-align: center; position: relative;">
                <p style="color: #2563eb; font-size: 13px; font-weight: 700; font-family: monospace;">&#128274; Dokumen ini dibuat dan dilindungi secara hukum menggunakan tanda tangan Hash Kriptografik SHA-256.</p>
                
                ${(function() {
                    const p = clientProjects.find(x => x.id === currentProjectId);
                    if (p && p.status === 'FULLY_PAID') {
                        return `
                            <div style="position: absolute; top: -30px; right: 20px; border: 4px double #10b981; color: #10b981; padding: 10px 20px; transform: rotate(-15deg); font-weight: 900; font-size: 20px; background: rgba(16, 185, 129, 0.05); pointer-events: none;">
                                PROJECT COMPLETED<br>
                                <span style="font-size: 12px;">ASSET TRANSFERRED & ACCEPTED</span>
                            </div>
                        `;
                    }
                    return "";
                })()}
            </div>
        </div>
    `;

    document.getElementById("contractContent").innerHTML = draftText;

    // Kalkulasi Kriptografik SHA-256 Otentik dari JS
    const encoder = new TextEncoder();
    const data = encoder.encode(draftText);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    currentContractHash = hashHex;
    document.getElementById("contractHashDisplay").textContent = hashHex;

    // Update Array untuk dashboard
    if (clientProjects.length > 0) {
        clientProjects[0].hash = hashHex.substring(0, 15) + "...";
    }

    // Transition UI -> Step 2
    step1.classList.add("hidden");
    step2.classList.remove("hidden");
    ind1.classList.remove("active");
    ind2.classList.add("active");
}

async function fetchContractFromServer(projectId) {
    try {
        const res = await authFetch(`${API_URL}/projects/${projectId}/contract`);
        if (!res.ok) throw new Error("Gagal mengambil histori kontrak");
        const data = await res.json();

        currentProjectId = projectId;
        currentContractHash = data.contract.hash;

        document.getElementById("contractContent").innerHTML = data.contract.terms_text;
        document.getElementById("contractHashDisplay").textContent = currentContractHash;

        return true;
    } catch (err) {
        showToast(err.message, "error");
        return false;
    }
}

async function resumeContract(projectId) {
    showToast("Mengambil draft kontrak dari blockchain/database...", "info");
    const success = await fetchContractFromServer(projectId);
    if (!success) return;

    // Switch view ke Contract Modal (Step 2)
    step1.classList.add("hidden");
    step2.classList.remove("hidden");
    step3.classList.add("hidden");
    ind1.classList.remove("active");
    ind2.classList.add("active");
    ind3.classList.remove("active");

    switchView("view-checkout");
    document.body.scrollIntoView();
}

async function viewContract(projectId) {
    const success = await fetchContractFromServer(projectId);
    if (!success) return;

    // Sembunyikan tombol agree jika View Only
    const agreeBtn = document.getElementById("btnAgreeContract");
    if (agreeBtn) {
        // Simpan button state aslinya di dataset kalau belum ada
        if (!agreeBtn.dataset.originalOnclick) {
            agreeBtn.dataset.originalOnclick = agreeBtn.getAttribute("onclick") || "";
        }
        agreeBtn.innerHTML = "<i class='fa-solid fa-lock'></i> Kontrak Terkunci (Read Only)";
        agreeBtn.onclick = null;
        agreeBtn.style.cursor = "not-allowed";
        agreeBtn.classList.remove("btn-glow");
        agreeBtn.classList.add("secondary");
    }

    // Show View
    step1.classList.add("hidden");
    step2.classList.remove("hidden");
    step3.classList.add("hidden");

    // Hide progress indikator karena cuma view only
    const progressEl = document.querySelector(".checkout-steps");
    if (progressEl) progressEl.style.display = "none";

    switchView("view-checkout");
    document.body.scrollIntoView();

    // Cleanup event handler agar form tidak rusak jika di-navigate kembali
    // (Dalam aplikasi riil, lebih baik gunakan modal terpisah untuk View Kontrak)
}

// STEP 2: SIGNATURE
document.getElementById("btnSignContract").addEventListener("click", async () => {
    const btn = document.getElementById("btnSignContract");
    btn.disabled = true;
    btn.innerHTML = `<div class="loader"></div> <span>Menulis hash kontrak ke Immutable Log (DB)...</span>`;

    try {
        const payload = {
            project_id: parseInt(currentProjectId),
            client_contract_hash: currentContractHash
        };

        const res = await authFetch(`${API_URL}/contracts/accept-contract`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Verifikasi Hash Signature Gagal - Data termanipulasi!");

        // Update Dashboard
        clientProjects[0].status = "CONTRACT_SIGNED";
        auditLogs.unshift({ time: "Baru saja", pid: currentProjectId, action: "CONTRACT_DIGITALLY_SIGNED", state: "CONTRACT_SIGNED", ip: "127.0.0.1" });

        // Transition UI -> Step 3
        step2.classList.add("hidden");
        step3.classList.remove("hidden");
        ind2.classList.remove("active");
        ind3.classList.add("active");

    } catch (err) {
        showToast("Integritas Gagal (Error API): " + err.message, 'error');
        btn.disabled = false;
        btn.innerHTML = `<span>Saya Setuju & Mengikat Tanda Tangan Digital</span>`;
    }
});

// STEP 3: PAYMENT — Stripe Checkout Integration
document.getElementById("btnSimulatePayment").addEventListener("click", async () => {
    const btn = document.getElementById("btnSimulatePayment");
    const statusInfo = document.getElementById("paymentStatusInfo");
    
    btn.disabled = true;
    btn.innerHTML = `<div class="loader" style="display:inline-block; width:16px; height:16px; border-width:2px; vertical-align:middle;"></div> <span style="vertical-align:middle;">Menghubungkan ke Stripe...</span>`;
    if (statusInfo) statusInfo.textContent = "";

    try {
        // 1. Minta Checkout Session dari Backend
        const res = await authFetch(`${API_URL}/payments/checkout`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                project_id: parseInt(currentProjectId),
                client_name: loggedUserName
            })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.detail || "Gagal membuat sesi Stripe. Cek kunci di backend.");
        }

        if (!data.url) throw new Error("URL Pembayaran tidak diterima dari server.");

        // 2. Redirect ke Stripe hosted Checkout
        showToast("Mengarahkan ke pembayaran aman Stripe...", "info");
        setTimeout(() => {
            window.location.href = data.url;
        }, 800);

    } catch (err) {
        showToast("Stripe Error: " + err.message, "error");
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-shield-halved"></i> Bayar Sekarang via Stripe`;
    }
});

// Tambahkan Handler untuk menangani kembalinya user dari Stripe (Success/Cancel)
window.addEventListener('load', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const projectId = urlParams.get('project_id');

    if (paymentStatus === 'success' && projectId) {
        showToast("Menverifikasi pembayaran...", "info");
        
        try {
            // Panggil backend untuk update status di DB
            const res = await authFetch(`${API_URL}/payments/verify-session?project_id=${projectId}`);
            const data = await res.json();
            
            if (res.ok) {
                showToast("Pembayaran Berhasil! Dana Escrow Anda telah diamankan.", "success");
                // Hapus query params agar tidak muncul berulang saat refresh
                window.history.replaceState({}, document.title, window.location.pathname);
                
                // Berpindah ke dashboard client dan muat ulang data
                currentProjectId = projectId;
                await renderClientDashboard();
                switchView("view-client-dashboard");
            } else {
                showToast("Gagal memverifikasi: " + data.detail, "error");
            }
        } catch (err) {
            console.error("Verification Error:", err);
            showToast("Terjadi kesalahan saat verifikasi.", "error");
        }
    } else if (paymentStatus === 'cancel') {
        showToast("Pembayaran dibatalkan. Dana belum didepositkan.", "info");
        window.history.replaceState({}, document.title, window.location.pathname);
    }
});

// PHYSICAL PAYMENT UPLOAD
const fileInput = document.getElementById('physicalPaymentFile');
let currentPreviewUrl = null;
if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const btn = document.getElementById("btnPhysicalPayment");
        const resultDiv = document.getElementById("physicalPaymentResult");
        const previewBox = document.getElementById("physicalPaymentPreview");
        const previewImg = document.getElementById("physicalPaymentPreviewImg");
        const fileMeta = document.getElementById("physicalPaymentFileMeta");
        const apiStatus = document.getElementById("physicalPaymentApiStatus");
        const loadingBox = document.getElementById("physicalPaymentLoading");

        if (!file.type.startsWith("image/")) {
            resultDiv.style.color = "#ef4444";
            resultDiv.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> File harus berupa gambar.`;
            fileInput.value = "";
            return;
        }

        if (currentPreviewUrl) {
            URL.revokeObjectURL(currentPreviewUrl);
        }

        currentPreviewUrl = URL.createObjectURL(file);
        previewImg.src = currentPreviewUrl;
        fileMeta.textContent = `${file.name} • ${(file.size / 1024).toFixed(1)} KB`;
        previewBox.classList.remove("hidden");
        apiStatus.innerHTML = `<i class="fa-solid fa-circle-info"></i> Siap memanggil <strong>POST /api/v1/payments/upload-physical?project_id=${currentProjectId}</strong>`;
        loadingBox.classList.remove("hidden");
        
        btn.disabled = true;
        btn.innerHTML = `<div class="loader" style="border-top-color:transparent; display:inline-block; vertical-align:middle; width:15px; height:15px; border-width:2px;"></div> <span style="vertical-align:middle;">Mendeteksi Nominal AI...</span>`;
        resultDiv.textContent = "";

        const formData = new FormData();
        formData.append("file", file);

        try {
            apiStatus.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Memanggil <strong>POST /api/v1/payments/upload-physical?project_id=${currentProjectId}</strong>...`;
            const res = await authFetch(`${API_URL}/payments/upload-physical?project_id=${currentProjectId}`, {
                method: "POST",
                body: formData
            });

            const data = await res.json();
            
            if (res.ok && data.status === "success") {
                resultDiv.style.color = "#10b981";
                resultDiv.innerHTML = `<i class="fa-solid fa-check"></i> ${data.message}<br><span class="muted" style="color:#94a3b8">${data.instructions}</span>`;

                if (data.source || data.confidence) {
                    const sourceLabel = data.source ? `<span class="payment-detail-pill">Source: ${data.source}</span>` : "";
                    const confidenceLabel = typeof data.confidence === "number" ? `<span class="payment-detail-pill">Confidence: ${(data.confidence * 100).toFixed(1)}%</span>` : "";
                    resultDiv.innerHTML += `<div class="payment-result-row">${sourceLabel}${confidenceLabel}</div>`;
                }

                if (Array.isArray(data.predictions) && data.predictions.length) {
                    const topPrediction = data.predictions[0];
                    resultDiv.innerHTML += `<div class="payment-result-sub">Top class: <strong>${topPrediction.class}</strong> • nominal: <strong>${topPrediction.nominal}</strong></div>`;
                }
                
                document.getElementById("finalStatus").textContent = "AWAITING_ADMIN_VALIDATION";
                document.getElementById("finalStatus").style.color = "#f59e0b";
                
                // Refresh Dashboard tables in background
                if (isAuth && userRole === "client") renderClientDashboard();
                apiStatus.innerHTML = `<i class="fa-solid fa-circle-check"></i> Request selesai. Backend merespons sukses.`;
                
                setTimeout(() => {
                    switchView("view-client-dashboard");
                    window.scrollTo(0, 0);
                }, 4000);
            } else if (res.ok && data.status === "warning") {
                resultDiv.style.color = "#f59e0b";
                const fallbackReason = data.fallback_reason ? `<div class="payment-result-sub">Fallback: ${data.fallback_reason}</div>` : "";
                const roboflowError = data.roboflow_error ? `<div class="payment-result-sub">Roboflow: ${data.roboflow_error.status_code || "-"} • ${data.roboflow_error.api_message || data.roboflow_error.description || "unknown"}</div>` : "";
                resultDiv.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${data.message || "Deteksi tunai belum pasti."}<br><span class="muted" style="color:#94a3b8">Silakan cek manual oleh admin.</span>${fallbackReason}${roboflowError}`;
                apiStatus.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> Roboflow gagal, backend memakai fallback lokal.`;
            } else {
                resultDiv.style.color = "#ef4444";
                resultDiv.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${data.message || data.detail}`;
                apiStatus.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> Request gagal. Backend mengembalikan error.`;
            }
        } catch (err) {
            resultDiv.style.color = "#ef4444";
            resultDiv.innerHTML = `<i class="fa-solid fa-xmark"></i> Koneksi ke AI backend gagal: ${err.message}`;
            apiStatus.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Gagal memanggil API.`;
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-camera"></i> Ambil Foto / Buka Kamera`;
            loadingBox.classList.add("hidden");
            fileInput.value = ""; // reset
        }
    });
}

// --- Initial Startup ---
async function resumeContract(projectId) {
    currentProjectId = projectId;
    const p = clientProjects.find(x => x.id === projectId);
    if (p) {
        currentPackage = p.name;
        currentPrice = p.name.includes('Enterprise RAG') ? 45000000 : 100000;
    }
    
    // checkoutView is an overlay, no need to switch away from dashboard
    checkoutView.classList.remove("hidden");
    showStep(2);
    document.getElementById("btnSignContract").classList.remove("hidden");
    fetchGeneratedContract();
}

async function viewContract(projectId) {
    currentProjectId = projectId;
    checkoutView.classList.remove("hidden");
    showStep(2);
    // Hide sign button for already signed/processed contracts
    document.getElementById("btnSignContract").classList.add("hidden");
    fetchGeneratedContract();
}

async function openPaymentModal(projectId) {
    currentProjectId = projectId;
    const p = clientProjects.find(x => x.id === projectId);
    if (p) {
        currentPackage = p.name;
        currentPrice = p.name.includes('Enterprise RAG') ? 45000000 : 100000;
    }
    checkoutView.classList.remove("hidden");
    showStep(3);
}

function showStep(stepNum) {
    step1.classList.add("hidden");
    step2.classList.add("hidden");
    step3.classList.add("hidden");
    ind1.classList.remove("active");
    ind2.classList.remove("active");
    ind3.classList.remove("active");

    if (stepNum === 1) { step1.classList.remove("hidden"); ind1.classList.add("active"); }
    if (stepNum === 2) { step2.classList.remove("hidden"); ind2.classList.add("active"); }
    if (stepNum === 3) { step3.classList.remove("hidden"); ind3.classList.add("active"); }
}

async function initApp() {
    if (isAuth) {
        updateNavAuth();
        
        // Recovery if role is missing
        if (!userRole) {
            try {
                const res = await authFetch(`${API_URL}/auth/me`);
                const data = await res.json();
                userRole = data.role;
                localStorage.setItem("userRole", userRole);
                localStorage.setItem("userName", data.full_name);
            } catch (e) {
                console.error("Session recovery failed:", e);
                btnLogout.click();
                return;
            }
        }

        if (userRole === "ADMIN") {
            switchView("view-admin-dashboard");
            renderAdminDashboard();
        } else {
            if (document.getElementById("clientNameDisplay")) {
                document.getElementById("clientNameDisplay").innerText = localStorage.getItem("userName") || "Klien";
            }
            switchView("view-client-dashboard");
            renderClientDashboard();
        }
    } else {
        updateNavAuth();
    }
}

initApp();

function printContract() {
    const content = document.getElementById("contractContent").innerHTML;
    const hash = document.querySelector(".hash-display") ? document.querySelector(".hash-display").outerHTML : "";
    
    openPrintWindow("Kontrak Perjanjian", content + hash);
}

function printInvoiceById(id) {
    const p = clientProjects.find(x => x.id === id);
    if (!p) return;
    
    const invoiceHtml = `
        <div style="border: 1px solid #000; padding: 40px;">
            <div style="display:flex; justify-content:space-between; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px;">
                <h1 style="margin:0;">INVOICE</h1>
                <div style="text-align:right;">
                    <p style="margin:0; font-weight:bold;">Aura AI Labs</p>
                    <p style="margin:0; font-size:12px;">invoice@auraai.com</p>
                </div>
            </div>
            
            <table style="width:100%; margin-bottom: 30px;">
                <tr>
                    <td><strong>Bill To:</strong><br>${loggedUserName}<br>Client ID: ${loggedUserId}</td>
                    <td style="text-align:right;"><strong>Invoice #:</strong> INV/AURA/${id}<br><strong>Date:</strong> ${new Date().toLocaleDateString('id-ID')}</td>
                </tr>
            </table>
            
            <table style="width:100%; border-collapse: collapse; margin-bottom: 30px;">
                <thead>
                    <tr style="background:#eee;">
                        <th style="border:1px solid #000; padding:10px; text-align:left;">Description</th>
                        <th style="border:1px solid #000; padding:10px; text-align:right;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="border:1px solid #000; padding:10px;">Pengembangan Sistem AI: ${p.name}</td>
                        <td style="border:1px solid #000; padding:10px; text-align:right;">Rp ${(p.name.includes('Enterprise RAG') ? 45000000 : 100000).toLocaleString('id-ID')}</td>
                    </tr>
                </tbody>
            </table>
            
            <div style="text-align:right; font-size:18px; font-weight:bold;">Total Tagihan: Rp ${(p.name.includes('Enterprise RAG') ? 45000000 : 100000).toLocaleString('id-ID')}</div>
            
            <div style="margin-top:50px; border-top: 1px dashed #ccc; padding-top:20px; font-size:12px; color:#666;">
                *Invoice ini diterbitkan secara otomatis oleh sistem Aura AI Labs. Status: <strong>BELUM DIBAYAR</strong>
            </div>
        </div>
    `;
    openPrintWindow("Invoice", invoiceHtml);
}

function terbilang(nominal) {
    const bilangan = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
    let temp = "";
    if (nominal < 12) {
        temp = " " + bilangan[nominal];
    } else if (nominal < 20) {
        temp = terbilang(nominal - 10) + " Belas";
    } else if (nominal < 100) {
        temp = terbilang(Math.floor(nominal / 10)) + " Puluh" + terbilang(nominal % 10);
    } else if (nominal < 200) {
        temp = " Seratus" + terbilang(nominal - 100);
    } else if (nominal < 1000) {
        temp = terbilang(Math.floor(nominal / 100)) + " Ratus" + terbilang(nominal % 100);
    } else if (nominal < 2000) {
        temp = " Seribu" + terbilang(nominal - 1000);
    } else if (nominal < 1000000) {
        temp = terbilang(Math.floor(nominal / 1000)) + " Ribu" + terbilang(nominal % 1000);
    } else if (nominal < 1000000000) {
        temp = terbilang(Math.floor(nominal / 1000000)) + " Juta" + terbilang(nominal % 1000000);
    }
    return temp;
}

function printReceiptById(id) {
    const p = clientProjects.find(x => x.id === id);
    if (!p) return;
    
    const price = p.name.includes('Enterprise RAG') ? 45000000 : 100000;
    const terbilangText = terbilang(price) + " Rupiah";

    const receiptHtml = `
        <div style="border: 4px double #000; padding: 40px; background: #fff; max-width: 800px; margin: auto;">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px;">
                <div>
                    <h1 style="margin:0; color: #000; font-size: 28px;">AURA AI LABS</h1>
                    <p style="margin:0; font-size: 12px;">The Future of Agentic RAG Systems</p>
                </div>
                <div style="text-align:right;">
                    <h2 style="margin:0; letter-spacing:2px;">KWITANSI</h2>
                    <p style="margin:0; font-family:monospace; font-weight:bold;">No: REC/AURA/${id}/${new Date().getFullYear()}</p>
                </div>
            </div>
            
            <div style="font-size:16px; line-height:2.5;">
                <div style="display:flex; border-bottom: 1px dotted #ccc;">
                    <div style="width:200px;">Telah terima dari</div>
                    <div style="flex:1; font-weight:bold; text-transform:uppercase;">: ${loggedUserName}</div>
                </div>
                <div style="display:flex; border-bottom: 1px dotted #ccc;">
                    <div style="width:200px;">Uang sejumlah</div>
                    <div style="flex:1; font-style:italic; background:#f0f0f0; padding-left:10px;">: ### ${terbilangText.toUpperCase()} ###</div>
                </div>
                <div style="display:flex; border-bottom: 1px dotted #ccc;">
                    <div style="width:200px;">Untuk pembayaran</div>
                    <div style="flex:1;">: Pengembangan Sistem AI - <strong>${p.name}</strong></div>
                </div>
                <div style="display:flex;">
                    <div style="width:200px;">Status Dana</div>
                    <div style="flex:1; color:#10b981; font-weight:bold;">: TERVERIFIKASI & DIAMANKAN DI ESCROW</div>
                </div>
            </div>
            
            <div style="display:flex; justify-content:space-between; margin-top:50px; align-items:flex-end;">
                <div style="border: 3px solid #000; padding: 15px 40px; font-size:28px; font-weight:bold; background:#eee; position:relative;">
                    <span style="font-size:16px; position:absolute; top:5px; left:10px;">Rp</span>
                    ${price.toLocaleString('id-ID')} ,-
                </div>
                
                <div style="text-align:center; width:250px;">
                    <p style="margin:0;">Bandung, ${new Date().toLocaleDateString('id-ID')}</p>
                    <div style="height:80px; position:relative;">
                        <div style="position:absolute; top:10px; left:50%; transform:translateX(-50%); border: 2px solid #10b981; color:#10b981; padding:5px; border-radius:5px; font-size:10px; transform: rotate(-15deg); opacity:0.6; font-weight:bold;">
                            ELECTRONICALLY VERIFIED<br>AURA AI FINANCE
                        </div>
                    </div>
                    <p style="margin:0; font-weight:bold; text-decoration:underline;">SITI AISYAH, S.T.</p>
                    <p style="margin:0; font-size:11px;">Head of Finance Aura AI Labs</p>
                </div>
            </div>

            <div style="margin-top:40px; font-size:10px; color:#666; border-top: 1px solid #eee; padding-top:10px;">
                * Kwitansi ini sah dan diterbitkan secara elektronik. Seluruh transaksi dicatat dalam Immutable Audit Log perusahaan.
                <br>Nomor Hash Referensi: ${p.hash || 'GEN-SHA256-AUTO'}
            </div>
        </div>
    `;
    openPrintWindow("Kwitansi Resmi", receiptHtml);
}

function openPrintWindow(title, htmlContent) {
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    printWindow.document.write(`
        <html>
            <head>
                <title>${title}</title>
                <style>
                    body { font-family: 'Times New Roman', serif; padding: 50px; line-height: 1.6; color: #000; }
                    .contract-inner-document { text-align: justify; }
                    .contract-header-doc { text-align: center; border-bottom: 2px solid #000; margin-bottom: 30px; padding-bottom: 20px; }
                    .doc-label { font-size: 10pt; color: #666; text-transform: uppercase; margin-bottom: 5px; }
                    .doc-title { font-size: 16pt; font-weight: bold; margin-bottom: 10px; }
                    .doc-number { font-size: 11pt; font-family: monospace; font-weight: bold; }
                    .doc-parties-table { width: 100%; border-collapse: collapse; border: 1px solid #000; margin: 20px 0; }
                    .doc-parties-table td { padding: 10px; border: 1px solid #000; vertical-align: top; font-size: 11pt; }
                    .party-col { width: 100px; font-weight: bold; background: #eee; }
                    .doc-pasal { font-size: 12pt; font-weight: bold; border-bottom: 1px solid #ccc; margin-top: 25px; padding-bottom: 5px; text-transform: uppercase; }
                    .doc-highlight { font-weight: bold; color: #000; }
                    .doc-brief-box { background: #f9f9f9; padding: 15px; border-left: 4px solid #000; font-style: italic; margin: 15px 0; }
                    .hash-display { margin-top: 50px; border: 1px solid #000; padding: 15px; font-size: 10pt; background: #f0f0f0; }
                    .hash-display code { display: block; word-break: break-all; margin-top: 10px; font-family: monospace; }
                </style>
            </head>
            <body>
                ${htmlContent}
                <script>
                    window.onload = function() {
                        window.print();
                        window.onafterprint = function() { window.close(); };
                    };
                </script>
            </body>
        </html>
    `);
    printWindow.document.close();
}
