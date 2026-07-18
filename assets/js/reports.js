// ========================================
// Decor My Nest Studio App
// Reports module
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

  function escapeHtml(str) {
    if (str === undefined || str === null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function formatAmount(v) {
    return "₹" + Math.round(Number(v) || 0).toLocaleString("en-IN");
  }
  function statusClass(status) {
    return "status-" + String(status || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  // ---------- Business overview stats ----------

  function renderStats() {
    const NOT_WON_STATUSES = ["Draft", "Sent", "Rejected", "Expired"];
    const won = quotations.filter(q => q.status && !NOT_WON_STATUSES.includes(q.status));
    const revenue = won.reduce((sum, q) => sum + (Number(q.finalAmount) || 0), 0);

    let materialOutstanding = 0;
    let labourOutstanding = 0;
    projects.forEach(p => {
      (p.materialOrders || []).forEach(o => {
        materialOutstanding += Math.max(0, (Number(o.amount) || 0) - (Number(o.paidAmount) || 0));
      });
      const earnedByWorker = {};
      (p.labour || []).forEach(l => {
        earnedByWorker[l.worker] = (earnedByWorker[l.worker] || 0) + (Number(l.days) || 0) * (Number(l.ratePerDay) || 0);
      });
      const paidByWorker = {};
      (p.labourPayments || []).forEach(pay => {
        paidByWorker[pay.worker] = (paidByWorker[pay.worker] || 0) + (Number(pay.amount) || 0);
      });
      Object.keys(earnedByWorker).forEach(w => {
        labourOutstanding += Math.max(0, (earnedByWorker[w] || 0) - (paidByWorker[w] || 0));
      });
    });

    const stats = [
      {
        label: "Total Customers",
        value: customers.length,
        sub: `${quotations.length} quotation${quotations.length === 1 ? "" : "s"} total`,
        icon: `<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>`,
        color: "blue",
        scrollTo: "repCustomerStatusPanel"
      },
      {
        label: "Revenue Won",
        value: formatAmount(revenue),
        sub: won.length ? `${won.length} quotation${won.length === 1 ? "" : "s"}` : "No accepted quotations yet",
        icon: `<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>`,
        color: "green",
        scrollTo: "repPipelinePanel"
      },
      {
        label: "Material Outstanding",
        value: formatAmount(materialOutstanding),
        sub: "Owed to vendors, all sites",
        icon: `<path d="m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2a2 2 0 0 0 2.8 0L19 11Z"/><path d="M3 21h18"/><path d="m5 2 5 5"/>`,
        color: "amber",
        scrollTo: "repMaterialPanel"
      },
      {
        label: "Labour Outstanding",
        value: formatAmount(labourOutstanding),
        sub: "Owed to workers, all sites",
        icon: `<circle cx="12" cy="12" r="10"/><path d="m8 12 2.5 2.5L16 9"/>`,
        color: "purple",
        scrollTo: "repLabourPanel"
      }
    ];

    document.getElementById("repStats").innerHTML = stats.map(s => `
      <div class="dash-stat dash-stat-${s.color}" data-scroll-target="${s.scrollTo}" role="button" tabindex="0">
        <span class="dash-stat-icon"><svg viewBox="0 0 24 24">${s.icon}</svg></span>
        <strong class="dash-stat-value">${s.value}</strong>
        <span class="dash-stat-label">${s.label}</span>
        <span class="dash-stat-sub">${s.sub}</span>
      </div>
    `).join("");

    document.querySelectorAll("[data-scroll-target]").forEach(card => {
      card.onclick = () => {
        const target = document.getElementById(card.dataset.scrollTarget);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      };
    });
  }

  // ---------- Quotation pipeline ----------

  function renderPipeline() {
    const wrap = document.getElementById("repPipeline");
    const knownStages = ["Draft", "Sent", "Accepted", "WIP (Work in Progress)", "Completed", "Rejected", "Expired"];
    const usedStages = [...new Set(quotations.map(q => q.status).filter(Boolean))];
    const stages = [...new Set([...knownStages, ...usedStages])];

    if (!quotations.length) {
      wrap.innerHTML = `<p class="dash-empty">No quotations yet.</p>`;
      return;
    }

    const counts = stages.map(s => quotations.filter(q => q.status === s));
    const max = Math.max(1, ...counts.map(c => c.length));

    wrap.innerHTML = stages.map((s, i) => {
      const list = counts[i];
      const total = list.reduce((sum, q) => sum + (Number(q.finalAmount) || 0), 0);
      const pct = Math.round((list.length / max) * 100);
      return `
        <div class="dash-pipeline-row">
          <span class="dash-pipeline-label">${s}</span>
          <div class="dash-pipeline-bar"><div class="dash-pipeline-fill ${statusClass(s)}" style="width:${pct}%"></div></div>
          <span class="dash-pipeline-count">${list.length} · ${formatAmount(total)}</span>
        </div>
      `;
    }).join("");
  }

  // ---------- Lead sources & customer status ----------

  function renderBreakdown(elementId, list, field, emptyMessage) {
    const wrap = document.getElementById(elementId);
    if (!list.length) {
      wrap.innerHTML = `<p class="dash-empty">${emptyMessage}</p>`;
      return;
    }
    const counts = {};
    list.forEach(item => {
      const key = item[field] || "Unspecified";
      counts[key] = (counts[key] || 0) + 1;
    });
    const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const max = Math.max(1, ...rows.map(r => r[1]));

    wrap.innerHTML = rows.map(([label, count]) => {
      const pct = Math.round((count / max) * 100);
      return `
        <div class="dash-pipeline-row">
          <span class="dash-pipeline-label">${escapeHtml(label)}</span>
          <div class="dash-pipeline-bar"><div class="dash-pipeline-fill status-approved" style="width:${pct}%"></div></div>
          <span class="dash-pipeline-count">${count}</span>
        </div>
      `;
    }).join("");
  }

  // ---------- Material procurement across all sites ----------

  function renderMaterialReport() {
    const allOrders = [];
    projects.forEach(p => {
      (p.materialOrders || []).forEach(o => allOrders.push({ ...o, projectName: p.name }));
    });

    const totalOrdered = allOrders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
    const totalPaid = allOrders.reduce((sum, o) => sum + (Number(o.paidAmount) || 0), 0);
    const totalOutstanding = Math.max(0, totalOrdered - totalPaid);

    document.getElementById("repMaterialSummary").innerHTML = allOrders.length ? `
      <div><span>Total ordered</span><strong>${formatAmount(totalOrdered)}</strong></div>
      <div><span>Total paid</span><strong class="paid">${formatAmount(totalPaid)}</strong></div>
      <div><span>Outstanding</span><strong class="due">${formatAmount(totalOutstanding)}</strong></div>
    ` : "";

    if (!allOrders.length) {
      document.getElementById("repMaterialByVendor").innerHTML = `<p class="dash-empty">No material orders logged yet across any project.</p>`;
      document.getElementById("repMaterialByCategory").innerHTML = "";
      return;
    }

    const byVendor = {};
    const byCategory = {};
    allOrders.forEach(o => {
      const vKey = o.vendor || "Unspecified";
      if (!byVendor[vKey]) byVendor[vKey] = { ordered: 0, paid: 0 };
      byVendor[vKey].ordered += Number(o.amount) || 0;
      byVendor[vKey].paid += Number(o.paidAmount) || 0;

      const cKey = o.category || "Unspecified";
      byCategory[cKey] = (byCategory[cKey] || 0) + (Number(o.amount) || 0);
    });

    const vendorRows = Object.entries(byVendor).sort((a, b) => b[1].ordered - a[1].ordered);
    document.getElementById("repMaterialByVendor").innerHTML = `
      <h3 class="matorder-vendor-summary-title">By vendor</h3>
      <table class="crm-table matorder-vendor-table">
        <thead><tr><th>Vendor / Dealer</th><th>Ordered</th><th>Paid</th><th>Outstanding</th></tr></thead>
        <tbody>${vendorRows.map(([vendor, t]) => {
          const due = Math.max(0, t.ordered - t.paid);
          return `<tr><td><strong>${escapeHtml(vendor)}</strong></td><td>${formatAmount(t.ordered)}</td><td>${formatAmount(t.paid)}</td><td><strong style="color:${due > 0 ? "#ad614b" : "var(--green)"}">${formatAmount(due)}</strong></td></tr>`;
        }).join("")}</tbody>
      </table>
    `;

    const categoryRows = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
    document.getElementById("repMaterialByCategory").innerHTML = `
      <h3 class="matorder-vendor-summary-title">By category</h3>
      <table class="crm-table matorder-vendor-table">
        <thead><tr><th>Category</th><th>Total ordered</th></tr></thead>
        <tbody>${categoryRows.map(([cat, total]) => `<tr><td><span class="crm-badge status-draft">${escapeHtml(cat)}</span></td><td>${formatAmount(total)}</td></tr>`).join("")}</tbody>
      </table>
    `;
  }

  // ---------- Labour across all sites ----------

  function renderLabourReport() {
    const byWorker = {};
    let totalEarned = 0;
    let totalPaid = 0;

    projects.forEach(p => {
      (p.labour || []).forEach(l => {
        const key = l.worker || "Unspecified";
        if (!byWorker[key]) byWorker[key] = { earned: 0, paid: 0 };
        const amount = (Number(l.days) || 0) * (Number(l.ratePerDay) || 0);
        byWorker[key].earned += amount;
        totalEarned += amount;
      });
      (p.labourPayments || []).forEach(pay => {
        const key = pay.worker || "Unspecified";
        if (!byWorker[key]) byWorker[key] = { earned: 0, paid: 0 };
        const amount = Number(pay.amount) || 0;
        byWorker[key].paid += amount;
        totalPaid += amount;
      });
    });

    const totalOutstanding = Math.max(0, totalEarned - totalPaid);
    const hasData = Object.keys(byWorker).length > 0;

    document.getElementById("repLabourSummary").innerHTML = hasData ? `
      <div><span>Total earned</span><strong>${formatAmount(totalEarned)}</strong></div>
      <div><span>Total paid</span><strong class="paid">${formatAmount(totalPaid)}</strong></div>
      <div><span>Outstanding</span><strong class="due">${formatAmount(totalOutstanding)}</strong></div>
    ` : "";

    if (!hasData) {
      document.getElementById("repLabourByWorker").innerHTML = `<p class="dash-empty">No labour entries logged yet across any project.</p>`;
      return;
    }

    const rows = Object.entries(byWorker).sort((a, b) => b[1].earned - a[1].earned);
    document.getElementById("repLabourByWorker").innerHTML = `
      <h3 class="matorder-vendor-summary-title">By worker</h3>
      <table class="crm-table matorder-vendor-table">
        <thead><tr><th>Worker</th><th>Earned</th><th>Paid</th><th>Balance due</th></tr></thead>
        <tbody>${rows.map(([worker, t]) => {
          const due = Math.max(0, t.earned - t.paid);
          return `<tr><td><strong>${escapeHtml(worker)}</strong></td><td>${formatAmount(t.earned)}</td><td>${formatAmount(t.paid)}</td><td><strong style="color:${due > 0 ? "#ad614b" : "var(--green)"}">${formatAmount(due)}</strong></td></tr>`;
        }).join("")}</tbody>
      </table>
    `;
  }

  renderStats();
  renderPipeline();
  renderBreakdown("repLeadSources", customers, "leadSource", "No customers yet.");
  renderBreakdown("repCustomerStatus", customers, "status", "No customers yet.");
  renderMaterialReport();
  renderLabourReport();

})();
