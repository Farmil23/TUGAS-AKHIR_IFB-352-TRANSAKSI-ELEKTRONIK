// Auto-detect API base URL: works on localhost AND on Vercel
const API_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? `http://${window.location.host}/api/v1`
    : `${window.location.origin}/api/v1`;

// Global States
let isAuth = false;
let userRole = null; // 'client' or 'admin'
let loggedUserId = 1; // Default mock ID
let currentProjectId = null;
let currentContractHash = null;
let currentPackage = "";
let currentPrice = 0;

// Global Projects Cache
let clientProjects = [];
let auditLogs = []; // Global mock logs for admin

// Navigation Nodes
const viewLanding = document.getElementById("view-landing");
const viewClientDashboard = document.getElementById("view-client-dashboard");
const viewAdminDashboard = document.getElementById("view-admin-dashboard");
const navDashboard = document.getElementById("nav-dashboard");
const btnOpenLogin = document.getElementById("btnOpenLogin");
const btnOpenAdmin = document.getElementById("btnOpenAdmin");
const btnLogout = document.getElementById("btnLogout");

// Modal Nodes
const authModal = document.getElementById("auth-modal");
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
    { id: 101, name: "AI RAG Document Analyzer", status: "ESCROW_FUNDED", hash: "6b7c9716c5921f3d8..." }
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
    const orderView = document.getElementById("view-client-order");
    if (orderView) orderView.classList.add("hidden");
    const checkoutView = document.getElementById("view-checkout");
    if (checkoutView) checkoutView.classList.add("hidden");

    document.getElementById(viewId).classList.remove("hidden");

    // Ensure page can always scroll and jumps to top on view change
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
    window.scrollTo({ top: 0, behavior: "instant" });
}

function updateNavAuth() {
    if (isAuth) {
        btnOpenLogin.classList.add("hidden");
        btnOpenAdmin.classList.add("hidden");
        btnLogout.classList.remove("hidden");
        navDashboard.classList.remove("hidden");
        const navOrder = document.getElementById("nav-order");
        if (navOrder && userRole === "client") navOrder.classList.remove("hidden");
    } else {
        btnOpenLogin.classList.remove("hidden");
        btnOpenAdmin.classList.remove("hidden");
        btnLogout.classList.add("hidden");
        navDashboard.classList.add("hidden");

        const navOrder = document.getElementById("nav-order");
        if (navOrder) navOrder.classList.add("hidden");

        switchView("view-landing");
    }
}

navDashboard.addEventListener("click", () => {
    if (userRole === "admin") {
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
    updateNavAuth();
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
    document.getElementById("authRole").value = "client";
    authModal.classList.remove("hidden");
});

btnOpenAdmin.addEventListener("click", () => {
    document.getElementById("authTitle").innerHTML = "<i class='fa-solid fa-shield-halved'></i> Admin Gateway";
    document.getElementById("authRole").value = "admin";
    authModal.classList.remove("hidden");
});

// --- Auth Submission ---
document.getElementById("authForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const role = document.getElementById("authRole").value;
    isAuth = true;
    userRole = role;

    authModal.classList.add("hidden");
    updateNavAuth();

    if (role === "admin") {
        switchView("view-admin-dashboard");
        renderAdminDashboard();
    } else {
        document.getElementById("clientNameDisplay").innerText = "PT. Maju Mundur";
        switchView("view-client-dashboard");
        renderClientDashboard();
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
        const res = await fetch(`${API_URL}/projects?client_id=${loggedUserId}`);
        const projects = await res.json();

        // Update KPIs
        document.getElementById("client-total-projects").textContent = projects.length;
        const pendingCount = projects.filter(p => ['PENDING_CONTRACT', 'COMPLETED', 'REVISION_REQUESTED'].includes(p.status)).length;
        document.getElementById("client-pending-action").textContent = pendingCount;

        // Mock Escrow Value (Asumsi rata-rata Rp 45.000.000 per Active Project)
        const activeEscrowCount = projects.filter(p => p.status !== 'DRAFT').length;
        document.getElementById("client-active-escrow").textContent = `Rp ${(activeEscrowCount * 45000000).toLocaleString('id-ID')}`;

        if (projects.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 30px;" class="muted">Belum ada proyek aktif. Silakan buat proyek baru.</td></tr>`;
            return;
        }

        tbody.innerHTML = projects.map(p => `
        <tr>
            <td>#${p.id}</td>
            <td style="font-weight:600;">${p.name}</td>
            <td>${getStatusTag(p.status)}</td>
            <td>
                ${p.deployment_link ? `<a href="${p.deployment_link}" target="_blank" class="accent-text"><i class="fa-solid fa-link"></i> Buka Aplikasi RAG</a>` : `<span class="muted"><i class="fa-solid fa-lock"></i> Menunggu...</span>`}
            </td>
            <td>
                ${p.status === 'PENDING_CONTRACT'
                ? `<button class="btn-glow btn-sm" onclick="resumeContract(${p.id})">Review & Sign</button>`
                : p.status === 'COMPLETED'
                    ? `<div style="display:flex; gap:10px;"><button class="btn-glow success btn-sm" onclick="acceptDelivery(${p.id})"><i class="fa-solid fa-check"></i> Accept App</button> <button class="btn-glow secondary btn-sm" onclick="requestRevision(${p.id}); return false;"><i class="fa-solid fa-rotate-left"></i> Ajukan Revisi</button></div>`
                    : p.status === 'REVISION_REQUESTED'
                        ? `<span class="muted"><i class="fa-solid fa-clock-rotate-left"></i> Sedang direvisi tim...</span>`
                        : p.developer_notes ? `<span class="muted"><i class="fa-regular fa-message"></i> ${p.developer_notes}</span>` : `<button class="btn-glow secondary btn-sm" onclick="viewContract(${p.id})">Lihat Kontrak</button>`
            }
            </td>
        </tr>
    `).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" class="muted">Failed to load projects: ${err.message}</td></tr>`;
    }
}

async function renderAdminDashboard() {
    const tbody = document.getElementById("adminAuditTableBody");
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px;"><div class="loader" style="margin: 0 auto; border-color: var(--admin-color);"></div></td></tr>`;

    try {
        // Fetch Projects for action buttons
        const projRes = await fetch(`${API_URL}/projects`);
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
            const auditRes = await fetch(`${API_URL}/audit-logs`);
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
                ${p.status === 'ESCROW_FUNDED'
                ? `<button class="btn-glow btn-sm admin" onclick="updateProjectStatus(${p.id}, 'IN_PROGRESS', false)"><i class="fa-solid fa-play"></i> Mulai Build AI</button>`
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
        const res = await fetch(`${API_URL}/projects/${projectId}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error(await res.text());

        // Refresh Current View
        if (userRole === "admin") renderAdminDashboard();
        else renderClientDashboard();

        showToast(`Berhasil update proyek #${projectId} ke status ${newStatus}`, 'success');

    } catch (err) {
        showToast("Gagal update status: " + err.message, 'error');
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

        const res = await fetch(`${API_URL}/projects/${projectId}/status`, {
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
    'Knowledge Bot': {
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
    if (!isAuth || userRole !== 'client') {
        showToast("Pendirian Sistem AI Membutuhkan Akun Korporat. Silakan Login.", "error");
        btnOpenLogin.click();
        return;
    }

    currentPackage = packageTitle;
    currentPrice = currentPackage.includes('Pro') ? 45000000 : 15000000;

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

        const res = await fetch(`${API_URL}/projects/submit-brief`, {
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
        <div style="font-family: 'Georgia', serif; color: #1e293b; background: #ffffff; padding: 40px 50px; text-align: justify; line-height: 1.9; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; max-width: 800px; margin: 0 auto; overflow-wrap: break-word;">
            <div style="text-align: center; margin-bottom: 35px; border-bottom: 3px solid #0f172a; padding-bottom: 25px;">
                <p style="font-size: 11px; color: #64748b; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 10px;">DOKUMEN PERJANJIAN KERJASAMA RESMI</p>
                <h1 style="font-size: 20px; color: #0f172a; margin-bottom: 12px; font-family: 'Arial', sans-serif; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 900; line-height: 1.4;">PERJANJIAN KERJASAMA PENGEMBANGAN SISTEM<br>RETRIEVAL-AUGMENTED GENERATION (RAG)</h1>
                <p style="font-size: 13px; color: #475569; font-weight: 700; font-family: monospace;">Nomor: AURA/RAG/${new Date().getFullYear()}/${currentProjectId}</p>
            </div>
            
            <p style="margin-bottom: 20px; font-size: 14.5px;">Pada hari ini, tanggal <strong>${today}</strong>, dibuat dan ditandatangani perjanjian secara kriptografik (selanjutnya disebut <em>"Perjanjian"</em>) antara para pihak berikut:</p>
            
            <table style="width: 100%; margin-bottom: 30px; border-collapse: collapse; border: 1px solid #e2e8f0; font-size: 14px;">
                <tr style="background: #f8fafc;">
                    <td style="padding: 12px 15px; width: 100px; vertical-align: top; border: 1px solid #e2e8f0; font-weight: 700; color: #475569; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Pihak I</td>
                    <td style="padding: 12px 15px; vertical-align: top; border: 1px solid #e2e8f0;"><strong>PT. AURA AI LABS</strong> &mdash; sebagai Pihak Pertama (Pengembang)</td>
                </tr>
                <tr>
                    <td style="padding: 12px 15px; width: 100px; vertical-align: top; border: 1px solid #e2e8f0; font-weight: 700; color: #475569; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Pihak II</td>
                    <td style="padding: 12px 15px; vertical-align: top; border: 1px solid #e2e8f0;"><strong>PT. MAJU MUNDUR</strong> &mdash; sebagai Pihak Kedua (Pengguna Jasa / Klien)</td>
                </tr>
            </table>
            
            <h2 style="font-size: 14px; color: #0f172a; margin-top: 30px; border-bottom: 2px solid #cbd5e1; padding-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; font-family: Arial, sans-serif;">Pasal 1 &mdash; Ruang Lingkup Kerja</h2>
            <p style="font-size: 14.5px;">PIHAK PERTAMA sepakat untuk merancang, mengimplementasikan, dan melakukan <em>deployment</em> Sistem AI RAG dengan paket: <strong style="color: #1d4ed8;">${currentPackage}</strong>. Sistem dirancang khusus untuk memenuhi ekstraksi data sebagaimana dijabarkan pada brief berikut:</p>
            <div style="background: #eff6ff; padding: 15px 20px; border-left: 5px solid #2563eb; font-style: italic; margin: 15px 0; color: #1e40af; border-radius: 0 6px 6px 0; font-size: 14px;">
                &ldquo;${briefRaw}&rdquo;
            </div>
            
            <h2 style="font-size: 14px; color: #0f172a; margin-top: 30px; border-bottom: 2px solid #cbd5e1; padding-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; font-family: Arial, sans-serif;">Pasal 2 &mdash; Keamanan Data &amp; Zero Leak Policy</h2>
            <p style="font-size: 14.5px;">Seluruh basis data, dokumen PDF/Word, dan parameter SQL yang diproses (<em>"Corpus"</em>) akan dikelola melalui infrastruktur terisolasi sepenuhnya di lingkungan <em>on-premise</em> atau <em>private cloud</em> milik klien. Algoritma menggunakan model <em>Large Language Models</em> (Llama / Mistral) yang di-<em>host</em> secara privat. PIHAK PERTAMA bertanggung jawab mutlak atas setiap kebocoran data ke <em>public cloud</em> pihak ketiga.</p>
            
            <h2 style="font-size: 14px; color: #0f172a; margin-top: 30px; border-bottom: 2px solid #cbd5e1; padding-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; font-family: Arial, sans-serif;">Pasal 3 &mdash; Penahanan Dana (Escrow) dan Pembayaran</h2>
            <p style="font-size: 14.5px;">Pembayaran senilai <strong style="color: #1d4ed8;">Rp ${currentPrice.toLocaleString('id-ID')}</strong> diikat menggunakan skema penahanan keamanan (<em>Escrow Webhook</em>). Pengembangan sistem RAG tidak akan dimulai sebelum Dana Escrow terverifikasi oleh sistem. PIHAK KEDUA berhak menolak hasil penyelesaian bila tidak sesuai <em>brief</em> yang disepakati, dan berhak mengajukan revisi.</p>

            <h2 style="font-size: 14px; color: #0f172a; margin-top: 30px; border-bottom: 2px solid #cbd5e1; padding-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; font-family: Arial, sans-serif;">Pasal 4 &mdash; Kepemilikan Hak Kekayaan Intelektual (HAKI)</h2>
            <p style="font-size: 14.5px;">Kecuali komponen Open Source (LangChain, LangGraph, ChromaDB), seluruh <em>Source Code</em>, skema basis data Vektor, API <em>Endpoints</em>, dan parameter yang dipersonalisasi sepenuhnya beralih kepemilikannya (100% IP Transfer) ke PIHAK KEDUA setelah sistem diserahkan dan diterima (<em>Delivered &amp; Accepted</em>).</p>

            <div style="margin-top: 50px; padding-top: 20px; border-top: 2px dashed #cbd5e1; text-align: center;">
                <p style="color: #2563eb; font-size: 13px; font-weight: 700; font-family: monospace;">&#128274; Dokumen ini dibuat dan dilindungi secara hukum menggunakan tanda tangan Hash Kriptografik SHA-256.</p>
            </div>
        </div>`;

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
        const res = await fetch(`${API_URL}/projects/${projectId}/contract`);
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

        const res = await fetch(`${API_URL}/contracts/accept-contract`, {
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

// STEP 3: PAYMENT
document.getElementById("btnSimulatePayment").addEventListener("click", async () => {
    const btn = document.getElementById("btnSimulatePayment");
    btn.disabled = true;
    btn.textContent = "Mengirim Webhook Enkripsi Midtrans...";

    try {
        const orderId = `PROJ-${currentProjectId}-MIL-1`;
        const statusCode = "settlement";
        const amount = currentPrice.toFixed(2);
        const serverKey = "SB-Mid-server-YOUR_SERVER_KEY";

        // Local HMAC SHA-512 Generator for Gateway bypass simulation
        const payloadStr = `${orderId}${statusCode}${amount}${serverKey}`;
        const encoder = new TextEncoder();
        const data = encoder.encode(payloadStr);
        const hashBuffer = await crypto.subtle.digest('SHA-512', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const signatureKey = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        const webhookPayload = {
            transaction_id: `MDTRNS_${Date.now()}`,
            order_id: orderId,
            gross_amount: currentPrice,
            payment_type: "bca_va",
            transaction_status: "settlement",
            signature_key: signatureKey,
            fraud_status: "accept"
        };

        const res = await fetch(`${API_URL}/payments/webhook`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(webhookPayload)
        });

        if (!res.ok) throw new Error(await res.text());

        // Update Dashboard
        clientProjects[0].status = "ESCROW_FUNDED";
        auditLogs.unshift({ time: "Baru saja", pid: currentProjectId, action: "PAYMENT_SETTLED_ESCROW_FUNDED", state: "ESCROW_FUNDED", ip: "Gateway IP" });

        // UI Transition Finale
        document.getElementById("finalStatus").textContent = "ESCROW_FUNDED";
        document.getElementById("finalStatus").style.color = "var(--success)";
        btn.textContent = "Verifikasi Webhook Berhasil. Proyek Aktif!";
        btn.className = "btn-glow success";

        // Refresh Dashboard tables in background
        if (isAuth && userRole === "client") renderClientDashboard();

        setTimeout(() => {
            switchView("view-client-dashboard");
            window.scrollTo(0, 0);
        }, 3000);

    } catch (err) {
        showToast("Gateway Webhook Error: " + err.message, 'error');
        btn.disabled = false;
        btn.textContent = "Debit Escrow Funds (Simulasi Webhook)";
    }
});
