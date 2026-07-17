// ========================================
// Decor My Nest Studio App
// Dashboard module
// ========================================

(function () {

  const CUSTOMERS_KEY = "dmnCustomers";
  const PROJECTS_KEY = "dmnProjects";
  const QUOTATIONS_KEY = "dmnQuotations";

  function readList(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch {
      return [];
    }
  }

  const customers = readList(CUSTOMERS_KEY);
  const projects = readList(PROJECTS_KEY);
  const quotations = readList(QUOTATIONS_KEY);

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
    if (!moduleName || typeof window.loadModule !== "function") return;
    document.querySelectorAll(".menu").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.module === moduleName);
    });
    window.loadModule(moduleName);
  }

  function recentBy(list, dateKey, n) {
    return [...list]
      .sort((a, b) => new Date(b[dateKey] || 0) - new Date(a[dateKey] || 0))
      .slice(0, n);
  }

  // ---------- Stats ----------

  function renderStats() {
    const newLeads = customers.filter(c => c.status === "New Lead").length;
    const inProgress = projects.filter(p => p.status === "In Progress").length;
    const awaiting = quotations.filter(q => q.status === "Sent").length;
    const NOT_WON_STATUSES = ["Draft", "Sent", "Rejected", "Expired"];
    const accepted = quotations.filter(q => q.status && !NOT_WON_STATUSES.includes(q.status));
    const revenue = accepted.reduce((sum, q) => sum + (Number(q.finalAmount) || 0), 0);

    const stats = [
      {
        label: "Customers",
        value: customers.length,
        sub: newLeads ? `${newLeads} new lead${newLeads === 1 ? "" : "s"}` : "No new leads",
        module: "crm"
      },
      {
        label: "Projects",
        value: projects.length,
        sub: inProgress ? `${inProgress} in progress` : "None in progress",
        module: "projects"
      },
      {
        label: "Quotations",
        value: quotations.length,
        sub: awaiting ? `${awaiting} awaiting response` : "None awaiting response",
        module: "quotations"
      },
      {
        label: "Revenue won",
        value: formatAmount(revenue),
        sub: accepted.length ? `${accepted.length} accepted quotation${accepted.length === 1 ? "" : "s"}` : "No accepted quotations yet",
        module: "quotations"
      }
    ];

    document.getElementById("dashStats").innerHTML = stats.map(s => `
      <div class="dash-stat" data-goto-module="${s.module}" role="button" tabindex="0">
        <span class="dash-stat-label">${s.label}</span>
        <strong class="dash-stat-value">${s.value}</strong>
        <span class="dash-stat-sub">${s.sub}</span>
      </div>
    `).join("");

    document.querySelectorAll("[data-goto-module]").forEach(card => {
      card.onclick = () => goToModule(card.dataset.gotoModule);
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
    const recent = recentBy(quotations, "updatedAt", 5);

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

  // ---------- Nav shortcuts ----------

  document.querySelectorAll("[data-nav]").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.nav;
      document.querySelectorAll(".menu").forEach(m => m.classList.toggle("active", m.dataset.module === target));
      if (window.loadModule) window.loadModule(target);
    });
  });

  const dateLabel = document.getElementById("dashDate");
  if (dateLabel) {
    dateLabel.textContent = new Date().toLocaleDateString("en-IN", {
      weekday: "long", day: "numeric", month: "long", year: "numeric"
    });
  }

  // ---------- Startup ----------

  renderStats();
  renderProjectsList();
  renderQuotationsList();
  renderPipeline();

})();
