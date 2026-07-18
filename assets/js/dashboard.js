// ========================================
// Decor My Nest Studio App
// Dashboard module
// ========================================

(function () {

  const CUSTOMERS_KEY = "dmnCustomers";
  const PROJECTS_KEY = "dmnProjects";
  const QUOTATIONS_KEY = "dmnQuotations";
  const ESTIMATOR_STATE_KEY = "coatState";

  function readList(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch {
      return [];
    }
  }
  function readFirmState() {
    try {
      return JSON.parse(localStorage.getItem(ESTIMATOR_STATE_KEY)) || {};
    } catch {
      return {};
    }
  }

  const customers = readList(CUSTOMERS_KEY);
  const projects = readList(PROJECTS_KEY);
  const quotations = readList(QUOTATIONS_KEY);
  const firmState = readFirmState();
  const firm = firmState.firm || {};

  function formatAmount(value) {
    return "₹" + Math.round(Number(value) || 0).toLocaleString("en-IN");
  }

  function statusClass(status) {
    return "status-" + String(status || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  function escapeHtml(str) {
    if (str === undefined || str === null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function goToModule(moduleName) {
    if (!moduleName || typeof window.loadModule !== "function") return Promise.resolve();
    document.querySelectorAll(".menu").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.module === moduleName);
    });
    return window.loadModule(moduleName);
  }

  function goToModuleAndClick(moduleName, buttonId) {
    goToModule(moduleName).then(() => {
      const btn = document.getElementById(buttonId);
      if (btn) btn.click();
    });
  }

  function showComingSoon(label) {
    alert(`${label} isn't built yet — coming soon!`);
  }

  function recentBy(list, dateKey, n) {
    return [...list]
      .sort((a, b) => new Date(b[dateKey] || 0) - new Date(a[dateKey] || 0))
      .slice(0, n);
  }

  // ---------- Welcome header ----------

  function renderWelcome() {
    let name = "";
    if (firm.preparedByBlock) {
      const lines = firm.preparedByBlock.split("\n").map(l => l.trim()).filter(Boolean);
      name = lines.find(l => !/^prepared by:?$/i.test(l)) || "";
    }
    const el = document.getElementById("dashWelcome");
    el.innerHTML = name
      ? `Welcome back, ${escapeHtml(name.split(" ")[0])} <span class="dash-wave">👋</span>`
      : `Welcome back <span class="dash-wave">👋</span>`;
  }

  document.getElementById("dashNewProjectButton").onclick = () => goToModuleAndClick("projects", "btnAddProject");
  document.getElementById("dashQuickEstimateButton").onclick = () => { window.location.href = "estimator/index.html?fresh=1"; };
  document.getElementById("dashAddProductButton").onclick = () => goToModuleAndClick("products", "btnAddProduct");

  // ---------- Stats ----------

  function renderStats() {
    const quotesSent = quotations.filter(q => q.status === "Sent").length;
    const ongoing = projects.filter(p => p.status === "In Progress").length;
    const completedProjects = projects.filter(p => p.status === "Completed").length;

    const stats = [
      {
        label: "Total Projects",
        value: projects.length,
        sub: customers.length ? `${customers.length} customer${customers.length === 1 ? "" : "s"}` : "No customers yet",
        icon: `<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3"/><path d="M9 12h6M9 16h6M9 8h2"/>`,
        color: "amber",
        module: "projects"
      },
      {
        label: "Quotes Sent",
        value: quotesSent,
        sub: quotations.length ? `${quotations.length} total quotation${quotations.length === 1 ? "" : "s"}` : "None yet",
        icon: `<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>`,
        color: "green",
        module: "quotations"
      },
      {
        label: "Ongoing Projects",
        value: ongoing,
        sub: "In Progress",
        icon: `<rect x="2" y="4" width="13" height="6" rx="1.5"/><path d="M6 10v3a2 2 0 0 0 2 2h1a2 2 0 0 1 2 2v3"/><rect x="9" y="18" width="4" height="4" rx="1"/>`,
        color: "blue",
        module: "projects"
      },
      {
        label: "Completed Projects",
        value: completedProjects,
        sub: completedProjects ? "Great work!" : "None yet",
        icon: `<circle cx="12" cy="12" r="10"/><path d="m8 12 2.5 2.5L16 9"/>`,
        color: "purple",
        module: "projects"
      }
    ];

    document.getElementById("dashStats").innerHTML = stats.map(s => `
      <div class="dash-stat dash-stat-${s.color}" data-goto-module="${s.module}" role="button" tabindex="0">
        <span class="dash-stat-icon"><svg viewBox="0 0 24 24">${s.icon}</svg></span>
        <strong class="dash-stat-value">${s.value}</strong>
        <span class="dash-stat-label">${s.label}</span>
        <span class="dash-stat-sub">${s.sub}</span>
      </div>
    `).join("");

    document.querySelectorAll("[data-goto-module]").forEach(card => {
      card.onclick = () => goToModule(card.dataset.gotoModule);
    });
  }

  // ---------- Nav tile grid ----------

  function renderTileGrid() {
    const tiles = [
      {
        title: "New Measurement",
        sub: "Measure area & calculate paintable area",
        icon: `<path d="M21.3 8.7 15.3 2.7a1 1 0 0 0-1.4 0L2.7 13.9a1 1 0 0 0 0 1.4l6 6a1 1 0 0 0 1.4 0L21.3 10.1a1 1 0 0 0 0-1.4Z"/><path d="m14.5 4.5 2 2M11 8l1.5 1.5M8 11l1.5 1.5M4.5 14.5l2 2"/>`,
        action: () => { window.location.href = "estimator/index.html?fresh=1"; }
      },
      {
        title: "New Estimate / Quote",
        sub: "Create a detailed estimate & send quote",
        icon: `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 15h6M9 11h3"/>`,
        action: () => goToModuleAndClick("quotations", "btnAddQuotation")
      },
      {
        title: "Paint Systems",
        sub: "Browse painting systems & solutions",
        icon: `<path d="m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2a2 2 0 0 0 2.8 0L19 11Z"/><path d="M3 21h18"/><path d="m5 2 5 5"/>`,
        action: () => { window.location.href = "estimator/index.html?scrollTo=rateSheet"; }
      },
      {
        title: "Products",
        sub: "Explore products & pricing",
        icon: `<rect x="3" y="9" width="7" height="12" rx="1"/><rect x="14" y="9" width="7" height="12" rx="1"/><path d="M4 9c0-2.2 1.8-4 4-4M17 9c0-2.2-1.8-4-4-4"/>`,
        action: () => { window.loadModule("products"); }
      },
      {
        title: "Clients",
        sub: "Manage client information",
        icon: `<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>`,
        action: () => goToModule("crm")
      },
      {
        title: "Reports",
        sub: "View reports & project summary",
        icon: `<path d="M3 3v18h18"/><path d="M7 13v5M12 9v9M17 5v13"/>`,
        action: () => goToModule("reports")
      },
      {
        title: "Gallery",
        sub: "Site photos & project gallery",
        icon: `<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>`,
        action: () => showComingSoon("Gallery")
      },
      {
        title: "Schedule",
        sub: "Work schedule & reminders",
        icon: `<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>`,
        action: () => showComingSoon("Schedule")
      }
    ];

    document.getElementById("dashTileGrid").innerHTML = tiles.map((t, i) => `
      <button class="dash-tile" data-tile-index="${i}">
        <span class="dash-tile-icon"><svg viewBox="0 0 24 24">${t.icon}</svg></span>
        <strong>${t.title}</strong>
        <span>${t.sub}</span>
      </button>
    `).join("");

    document.querySelectorAll("[data-tile-index]").forEach(btn => {
      btn.onclick = () => tiles[Number(btn.dataset.tileIndex)].action();
    });
  }

  // ---------- Recent lists ----------

  function renderProjectsList() {
    const wrap = document.getElementById("dashProjectsList");
    const recent = recentBy(projects, "updatedAt", 5);

    if (!recent.length) {
      wrap.innerHTML = `<p class="dash-empty">No projects yet. <button class="dash-inline-link" data-nav="projects">Add your first project</button></p>`;
      return;
    }

    wrap.innerHTML = recent.map(p => `
      <div class="dash-row">
        <div>
          <strong>${escapeHtml(p.name)}</strong>
          <div class="crm-muted">${escapeHtml(p.customerName) || "No customer linked"}</div>
        </div>
        <span class="crm-badge ${statusClass(p.status)}">${escapeHtml(p.status)}</span>
      </div>
    `).join("");
  }

  function renderQuotationsList() {
    const wrap = document.getElementById("dashQuotationsList");
    const pending = quotations.filter(q => q.status !== "Rejected" && q.status !== "Expired");
    const recent = recentBy(pending.length ? pending : quotations, "updatedAt", 5);

    if (!recent.length) {
      wrap.innerHTML = `<p class="dash-empty">No quotations yet. <button class="dash-inline-link" data-nav="quotations">Create your first quotation</button></p>`;
      return;
    }

    wrap.innerHTML = recent.map(q => `
      <div class="dash-row">
        <div>
          <strong>${escapeHtml(q.quotationNumber)}</strong>
          <div class="crm-muted">${escapeHtml(q.customerName) || "Not linked"} · ${formatAmount(q.finalAmount)}</div>
        </div>
        <span class="crm-badge ${statusClass(q.status)}">${escapeHtml(q.status)}</span>
      </div>
    `).join("");
  }

  // ---------- Pipeline ----------

  function renderPipeline() {
    const wrap = document.getElementById("dashPipeline");
    const knownStages = ["Draft", "Sent", "Accepted", "WIP (Work in Progress)", "Completed", "Rejected", "Expired"];
    const usedStages = [...new Set(quotations.map(q => q.status).filter(Boolean))];
    const stages = [...new Set([...knownStages, ...usedStages])];

    if (!quotations.length) {
      wrap.innerHTML = `<p class="dash-empty">No quotations yet.</p>`;
      return;
    }

    const counts = stages.map(s => quotations.filter(q => q.status === s).length);
    const max = Math.max(1, ...counts);

    wrap.innerHTML = stages.map((s, i) => {
      const pct = Math.round((counts[i] / max) * 100);
      return `
        <div class="dash-pipeline-row">
          <span class="dash-pipeline-label">${s}</span>
          <div class="dash-pipeline-bar"><div class="dash-pipeline-fill ${statusClass(s)}" style="width:${pct}%"></div></div>
          <span class="dash-pipeline-count">${counts[i]}</span>
        </div>
      `;
    }).join("");
  }

  // ---------- Footer bar ----------

  function renderFooterBar() {
    const items = [
      [firm.phone, `<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z"/>`],
      [firm.email, `<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/>`],
      [firm.address, `<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>`]
    ].filter(([value]) => value);

    const wrap = document.getElementById("dashFooterBar");
    if (!items.length) {
      wrap.classList.add("hidden");
      return;
    }
    wrap.innerHTML = items.map(([value, icon]) => `
      <span><svg viewBox="0 0 24 24">${icon}</svg>${escapeHtml(value)}</span>
    `).join("");
  }

  // ---------- Nav shortcuts ----------

  document.querySelectorAll("[data-nav]").forEach(btn => {
    btn.addEventListener("click", () => goToModule(btn.dataset.nav));
  });

  // ---------- Startup ----------

  renderWelcome();
  renderStats();
  renderTileGrid();
  renderProjectsList();
  renderQuotationsList();
  renderPipeline();
  renderFooterBar();

})();
