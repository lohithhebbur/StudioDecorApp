// ========================================
// Decor My Nest Studio App
// Reports module
// ========================================

(function () {

  const CUSTOMERS_KEY = "dmnCustomers";
  const PROJECTS_KEY = "dmnProjects";
  const QUOTATIONS_KEY = "dmnQuotations";
  const MEASUREMENTS_BY_CUSTOMER_KEY = "dmnMeasurementsByCustomer";

  function readList(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch {
      return [];
    }
  }
  function readMap(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || {};
    } catch {
      return {};
    }
  }

  const customers = readList(CUSTOMERS_KEY);
  const projects = readList(PROJECTS_KEY);
  const quotations = readList(QUOTATIONS_KEY);
  const measurementsByCustomer = readMap(MEASUREMENTS_BY_CUSTOMER_KEY);
  const estimates = Object.entries(measurementsByCustomer).map(([customerId, snapshot]) => ({ ...snapshot, customerId }));
  const invoices = quotations.filter(q => q.isInvoice);

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

  function goToModule(moduleName) {
    if (!moduleName || typeof window.loadModule !== "function") return;
    document.querySelectorAll(".menu").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.module === moduleName);
    });
    window.loadModule(moduleName);
  }

  function openQuotationInQuotations(id) {
    sessionStorage.setItem("dmnOpenQuotationId", id);
    goToModule("quotations");
  }

  function openCustomerInCrm(id) {
    sessionStorage.setItem("dmnOpenCustomerId", id);
    goToModule("crm");
  }

  function renderCustomersReport() {
    const wrap = document.getElementById("repCustomersList");
    if (!customers.length) {
      wrap.innerHTML = `<p class="dash-empty">No customers yet.</p>`;
      return;
    }

    wrap.innerHTML = `
      <table class="crm-table matorder-vendor-table">
        <thead><tr><th>Customer</th><th>Contact</th><th>Locality</th><th>Project type</th><th>Status</th></tr></thead>
        <tbody>${customers.map(c => `
          <tr class="crm-clickable-row" data-open-customer="${c.id}">
            <td><strong>${escapeHtml(c.name)}</strong></td>
            <td>${escapeHtml(c.mobile) || "—"}</td>
            <td>${escapeHtml(c.locality) || "—"}</td>
            <td>${escapeHtml(c.projectType) || "—"}</td>
            <td><span class="crm-badge ${statusClass(c.status)}">${escapeHtml(c.status) || "—"}</span></td>
          </tr>
        `).join("")}</tbody>
      </table>
    `;

    wrap.querySelectorAll("[data-open-customer]").forEach(row => {
      row.addEventListener("click", () => {
        const c = customers.find(x => x.id === row.dataset.openCustomer);
        if (c) showCustomerProfile(c);
      });
    });
  }

  function showCustomerProfile(c) {
    const details = [
      c.address || c.locality ? `<div>${escapeHtml(c.address || c.locality)}</div>` : "",
      c.mobile ? `<div>${escapeHtml(c.mobile)}</div>` : "",
      c.email ? `<div>${escapeHtml(c.email)}</div>` : "",
      c.gstin ? `<div>GSTIN: ${escapeHtml(c.gstin)}</div>` : ""
    ].filter(Boolean).join("");

    const content = `
      ${buildStatementHeader("CUSTOMER PROFILE", c.name, "", "")}
      <div class="report-customer"><div class="report-firm-details">${details}</div></div>
      <div class="report-table-wrap" style="margin-top:22px;">
        <table class="report-table">
          <thead><tr><th></th><th></th></tr></thead>
          <tbody>
            <tr><td>Project type</td><td>${escapeHtml(c.projectType) || "—"}</td></tr>
            <tr><td>Lead source</td><td>${escapeHtml(c.leadSource) || "—"}</td></tr>
            <tr><td>Budget estimate</td><td>${c.budget ? formatAmount(c.budget) : "—"}</td></tr>
            <tr><td>Status</td><td>${escapeHtml(c.status) || "—"}</td></tr>
          </tbody>
        </table>
      </div>
      ${c.notes ? `<p class="report-disclaimer">${escapeHtml(c.notes)}</p>` : ""}
    `;

    showDocumentPreview({
      title: c.name,
      contentHtml: content,
      fileName: `${c.name}-profile`,
      editAction: () => openCustomerInCrm(c.id)
    });
  }

  function renderRevenueWonReport() {
    const wrap = document.getElementById("repRevenueList");
    const NOT_WON_STATUSES = ["Draft", "Sent", "Rejected", "Expired", "Converted to Invoice"];
    const won = quotations.filter(q => q.status && !NOT_WON_STATUSES.includes(q.status));

    if (!won.length) {
      wrap.innerHTML = `<p class="dash-empty">No accepted or completed quotations yet.</p>`;
      return;
    }

    const sorted = [...won].sort((a, b) => new Date(b.issueDate || 0) - new Date(a.issueDate || 0));
    wrap.innerHTML = `
      <table class="crm-table matorder-vendor-table">
        <thead><tr><th>No.</th><th>Customer</th><th>Amount</th><th>Status</th></tr></thead>
        <tbody>${sorted.map(q => `
          <tr class="crm-clickable-row" data-open-won="${q.id}">
            <td><strong>${escapeHtml(q.invoiceNumber || q.quotationNumber)}</strong></td>
            <td>${escapeHtml(q.customerName) || "—"}</td>
            <td>${formatAmount(q.finalAmount)}</td>
            <td><span class="crm-badge ${statusClass(q.status)}">${escapeHtml(q.status)}</span></td>
          </tr>
        `).join("")}</tbody>
      </table>
    `;

    wrap.querySelectorAll("[data-open-won]").forEach(row => {
      const q = won.find(x => x.id === row.dataset.openWon);
      row.addEventListener("click", () => generateInvoicePdf(q));
    });
  }

  function readFirmForStatement() {
    try {
      return (JSON.parse(localStorage.getItem("coatState")) || {}).firm || {};
    } catch {
      return {};
    }
  }

  function buildStatementHeader(docType, partyName, partyLabel, subtitle) {
    const firm = readFirmForStatement();
    const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    const firmDetails = [firm.phone, firm.email].filter(Boolean).map(escapeHtml).join(" · ");
    return `
      <div class="report-doc-type">${escapeHtml(docType)}</div>
      <div class="report-header-row">
        <div class="report-company">
          <div>
            <div class="report-brand">${escapeHtml(firm.name || "Decor My Nest")}</div>
            ${firmDetails ? `<div class="report-firm-tagline">${firmDetails}</div>` : ""}
          </div>
        </div>
        <div class="report-date-block"><span>Date</span><strong>${today}</strong></div>
      </div>
      <div class="report-title">${escapeHtml(partyName)}</div>
      <div class="report-meta">${partyLabel}${subtitle ? ` · ${subtitle}` : ""}</div>
    `;
  }

  let currentDocFileName = "document";
  let currentDocEditAction = null;

  const repDocModal = document.getElementById("repDocModal");
  const repDocModalTitle = document.getElementById("repDocModalTitle");
  const repDocContent = document.getElementById("repDocContent");
  const repDocEditButton = document.getElementById("repDocEditButton");

  function showDocumentPreview({ title, contentHtml, fileName, editAction }) {
    repDocModalTitle.textContent = title;
    repDocContent.innerHTML = contentHtml;
    currentDocFileName = fileName;
    currentDocEditAction = editAction || null;
    repDocEditButton.classList.toggle("hidden", !editAction);
    repDocModal.classList.remove("hidden");
  }

  function closeRepDocModal() {
    repDocModal.classList.add("hidden");
    repDocContent.innerHTML = "";
  }

  async function saveCurrentDocAsPdf() {
    const button = document.getElementById("saveRepDocPdf");
    const originalLabel = button.textContent;
    button.textContent = "Generating PDF…";
    button.disabled = true;

    try {
      const canvas = await html2canvas(repDocContent, { scale: 2, useCORS: true, backgroundColor: "#fffdf8" });
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save(`${currentDocFileName.replace(/[^a-z0-9]+/gi, "-")}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Couldn't generate the PDF — please try again.");
    } finally {
      button.textContent = originalLabel;
      button.disabled = false;
    }
  }

  document.getElementById("closeRepDocModal").onclick = closeRepDocModal;
  document.getElementById("cancelRepDocModal").onclick = closeRepDocModal;
  document.getElementById("saveRepDocPdf").onclick = saveCurrentDocAsPdf;
  repDocEditButton.onclick = () => { if (currentDocEditAction) currentDocEditAction(); };
  repDocModal.addEventListener("click", (e) => { if (e.target === repDocModal) closeRepDocModal(); });

  function generateVendorStatementPdf(vendorName, allOrders) {
    const orders = allOrders
      .filter(o => (o.vendor || "Unspecified") === vendorName)
      .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
    const totalOrdered = orders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
    const totalPaid = orders.reduce((sum, o) => sum + (Number(o.paidAmount) || 0), 0);
    const outstanding = Math.max(0, totalOrdered - totalPaid);

    const content = `
      ${buildStatementHeader("PAYMENT STATEMENT", vendorName, "Vendor / Dealer", "All sites combined")}
      <div class="report-pricing" style="margin-top:16px;">
        <div><span>Total ordered (all sites)</span><strong>${formatAmount(totalOrdered)}</strong></div>
        <div><span>Total paid</span><strong>${formatAmount(totalPaid)}</strong></div>
      </div>
      <div class="report-total"><span>Outstanding balance</span><strong>${formatAmount(outstanding)}</strong></div>
      <div class="report-table-wrap" style="margin-top:22px;">
        <table class="report-table">
          <thead><tr><th>Date</th><th>Site</th><th>Category</th><th>Order value</th><th>Paid</th><th>Outstanding</th></tr></thead>
          <tbody>${orders.map(o => {
            const due = Math.max(0, (Number(o.amount) || 0) - (Number(o.paidAmount) || 0));
            return `<tr><td>${o.date ? new Date(o.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}</td><td>${escapeHtml(o.projectName) || "—"}</td><td>${escapeHtml(o.category) || "—"}</td><td>${formatAmount(o.amount)}</td><td>${formatAmount(o.paidAmount)}</td><td>${formatAmount(due)}</td></tr>`;
          }).join("")}</tbody>
        </table>
      </div>
      <p class="report-disclaimer">This statement combines every order and payment recorded for ${escapeHtml(vendorName)} across all sites.</p>
    `;
    const largestOrder = [...orders].sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0))[0];

    showDocumentPreview({
      title: `Statement — ${vendorName}`,
      contentHtml: content,
      fileName: `${vendorName}-payment-statement`,
      editAction: largestOrder && largestOrder.projectId ? () => {
        sessionStorage.setItem("dmnActiveProjectId", largestOrder.projectId);
        goToModule("project-detail");
      } : null
    });
  }

  function generateWorkerStatementPdf(workerName, allLabourPayments, totals) {
    const payments = allLabourPayments
      .filter(p => (p.worker || "Unspecified") === workerName)
      .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
    const due = Math.max(0, (totals.earned || 0) - (totals.paid || 0));

    const content = `
      ${buildStatementHeader("PAYMENT STATEMENT", workerName, "Worker / Contractor", "All sites combined")}
      <div class="report-pricing" style="margin-top:16px;">
        <div><span>Total earned (all sites)</span><strong>${formatAmount(totals.earned)}</strong></div>
        <div><span>Total paid</span><strong>${formatAmount(totals.paid)}</strong></div>
      </div>
      <div class="report-total"><span>Balance due</span><strong>${formatAmount(due)}</strong></div>
      <div class="report-table-wrap" style="margin-top:22px;">
        <table class="report-table">
          <thead><tr><th>Date</th><th>Site</th><th>Amount</th><th>Mode</th><th>Note</th></tr></thead>
          <tbody>${payments.length ? payments.map(p => `
            <tr>
              <td>${p.date ? new Date(p.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}</td>
              <td>${escapeHtml(p.projectName) || "—"}</td>
              <td>${formatAmount(p.amount)}</td>
              <td>${escapeHtml(p.mode) || "—"}</td>
              <td>${escapeHtml(p.note) || "—"}</td>
            </tr>
          `).join("") : `<tr><td colspan="5">No payments recorded yet.</td></tr>`}</tbody>
        </table>
      </div>
      <p class="report-disclaimer">This statement combines every payment recorded for ${escapeHtml(workerName)} across all sites.</p>
    `;
    const largestPayment = [...payments].sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0))[0];

    showDocumentPreview({
      title: `Statement — ${workerName}`,
      contentHtml: content,
      fileName: `${workerName}-payment-statement`,
      editAction: largestPayment && largestPayment.projectId ? () => {
        sessionStorage.setItem("dmnActiveProjectId", largestPayment.projectId);
        goToModule("project-detail");
      } : null
    });
  }

  // ---------- Business overview stats ----------

  function renderStats() {
    const NOT_WON_STATUSES = ["Draft", "Sent", "Rejected", "Expired", "Converted to Invoice"];
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
        scrollTo: "repCustomersPanel"
      },
      {
        label: "Revenue Won",
        value: formatAmount(revenue),
        sub: won.length ? `${won.length} quotation${won.length === 1 ? "" : "s"}` : "No accepted quotations yet",
        icon: `<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>`,
        color: "green",
        scrollTo: "repRevenuePanel"
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
      },
      {
        label: "Estimates",
        value: estimates.length,
        sub: "Saved from Measurements",
        icon: `<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3"/><path d="M9 12h6M9 16h6M9 8h2"/>`,
        color: "amber",
        scrollTo: "repEstimatesPanel"
      },
      {
        label: "Invoices",
        value: invoices.length,
        sub: invoices.length ? `${formatAmount(invoices.reduce((sum, q) => sum + (Number(q.finalAmount) || 0), 0))} invoiced` : "None raised yet",
        icon: `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 15h6M9 11h3"/>`,
        color: "blue",
        scrollTo: "repInvoicePanel"
      },
      {
        label: "Sites",
        value: projects.length,
        sub: "Material + labour cost, per site",
        icon: `<path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/><path d="M9 9v.01M9 12v.01M9 15v.01M9 18v.01"/>`,
        color: "green",
        scrollTo: "repSitesPanel"
      }
    ];

    document.getElementById("repStats").innerHTML = stats.map(s => `
      <div class="dash-stat dash-stat-${s.color}" ${s.navigateTo ? `data-nav-target="${s.navigateTo}"` : `data-scroll-target="${s.scrollTo}"`} role="button" tabindex="0">
        <span class="dash-stat-icon"><svg viewBox="0 0 24 24">${s.icon}</svg></span>
        <strong class="dash-stat-value">${s.value}</strong>
        <span class="dash-stat-label">${s.label}</span>
        <span class="dash-stat-sub">${s.sub}</span>
      </div>
    `).join("");

    document.querySelectorAll("[data-nav-target]").forEach(card => {
      card.onclick = () => goToModule(card.dataset.navTarget);
    });

    document.querySelectorAll("[data-scroll-target]").forEach(card => {
      card.onclick = () => {
        const target = document.getElementById(card.dataset.scrollTarget);
        if (!target) return;
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        target.classList.remove("report-panel-highlight");
        // Force reflow so the animation restarts even if clicked twice in a row
        void target.offsetWidth;
        target.classList.add("report-panel-highlight");
        setTimeout(() => target.classList.remove("report-panel-highlight"), 1600);
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
      (p.materialOrders || []).forEach(o => allOrders.push({ ...o, projectName: p.name, projectId: p.id }));
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
        <thead><tr><th>Vendor / Dealer</th><th>Ordered</th><th>Paid</th><th>Outstanding</th><th></th></tr></thead>
        <tbody>${vendorRows.map(([vendor, t]) => {
          const due = Math.max(0, t.ordered - t.paid);
          return `<tr class="crm-clickable-row" data-vendor-statement="${escapeHtml(vendor)}"><td><strong>${escapeHtml(vendor)}</strong></td><td>${formatAmount(t.ordered)}</td><td>${formatAmount(t.paid)}</td><td><strong style="color:${due > 0 ? "#ad614b" : "var(--green)"}">${formatAmount(due)}</strong></td><td class="crm-row-actions"><button class="crm-icon-btn" aria-label="Download statement">📄</button></td></tr>`;
        }).join("")}</tbody>
      </table>
    `;
    document.querySelectorAll("[data-vendor-statement]").forEach(row => {
      row.addEventListener("click", () => generateVendorStatementPdf(row.dataset.vendorStatement, allOrders));
    });

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
    const allLabourPayments = [];

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
        allLabourPayments.push({ ...pay, projectName: p.name, projectId: p.id });
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
        <thead><tr><th>Worker</th><th>Earned</th><th>Paid</th><th>Balance due</th><th></th></tr></thead>
        <tbody>${rows.map(([worker, t]) => {
          const due = Math.max(0, t.earned - t.paid);
          return `<tr class="crm-clickable-row" data-worker-statement="${escapeHtml(worker)}"><td><strong>${escapeHtml(worker)}</strong></td><td>${formatAmount(t.earned)}</td><td>${formatAmount(t.paid)}</td><td><strong style="color:${due > 0 ? "#ad614b" : "var(--green)"}">${formatAmount(due)}</strong></td><td class="crm-row-actions"><button class="crm-icon-btn" aria-label="Download statement">📄</button></td></tr>`;
        }).join("")}</tbody>
      </table>
    `;
    document.querySelectorAll("[data-worker-statement]").forEach(row => {
      row.addEventListener("click", () => generateWorkerStatementPdf(row.dataset.workerStatement, allLabourPayments, byWorker[row.dataset.workerStatement]));
    });
  }

  // ---------- Invoices ----------

  function renderInvoiceReport() {
    const totalInvoiced = invoices.reduce((sum, q) => sum + (Number(q.finalAmount) || 0), 0);
    const totalPaid = invoices.reduce((sum, q) => sum + (q.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0), 0);
    const totalDue = Math.max(0, totalInvoiced - totalPaid);

    document.getElementById("repInvoiceSummary").innerHTML = invoices.length ? `
      <div><span>Total invoiced</span><strong>${formatAmount(totalInvoiced)}</strong></div>
      <div><span>Total paid</span><strong class="paid">${formatAmount(totalPaid)}</strong></div>
      <div><span>Outstanding</span><strong class="due">${formatAmount(totalDue)}</strong></div>
    ` : "";

    const wrap = document.getElementById("repInvoiceList");
    if (!invoices.length) {
      wrap.innerHTML = `<p class="dash-empty">No invoices raised yet. Mark a quotation as an Invoice to see it here.</p>`;
      return;
    }

    const sorted = [...invoices].sort((a, b) => new Date(b.issueDate || 0) - new Date(a.issueDate || 0));
    wrap.innerHTML = `
      <table class="crm-table matorder-vendor-table">
        <thead><tr><th>Invoice No.</th><th>Customer</th><th>Amount</th><th>Paid</th><th>Balance due</th><th></th></tr></thead>
        <tbody>${sorted.map(q => {
          const paid = (q.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
          const due = Math.max(0, (Number(q.finalAmount) || 0) - paid);
          return `
            <tr class="crm-clickable-row" data-open-invoice="${q.id}">
              <td><strong>${escapeHtml(q.invoiceNumber || q.quotationNumber)}</strong></td>
              <td>${escapeHtml(q.customerName) || "—"}</td>
              <td>${formatAmount(q.finalAmount)}</td>
              <td>${formatAmount(paid)}</td>
              <td><strong style="color:${due > 0 ? "#ad614b" : "var(--green)"}">${formatAmount(due)}</strong></td>
              <td class="crm-row-actions"><button class="crm-icon-btn" aria-label="Open invoice">↗</button></td>
            </tr>
          `;
        }).join("")}</tbody>
      </table>
    `;

    wrap.querySelectorAll("[data-open-invoice]").forEach(row => {
      const q = invoices.find(x => x.id === row.dataset.openInvoice);
      row.addEventListener("click", () => generateInvoicePdf(q));
    });
  }

  function generateInvoicePdf(q) {
    if (!q) return;
    const paid = (q.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const due = Math.max(0, (Number(q.finalAmount) || 0) - paid);
    const items = q.roomsSummary || [];
    const customerDetails = [q.customerAddress || q.locality, q.customerMobile, q.customerEmail, q.customerGstin ? `GSTIN: ${q.customerGstin}` : ""]
      .filter(Boolean).map(v => `<div>${escapeHtml(v)}</div>`).join("");

    const content = `
      ${buildStatementHeader(q.isInvoice ? "INVOICE" : "QUOTATION", q.scope || q.customerName || "Document", `${q.isInvoice ? "Invoice No." : "Quotation No."} ${escapeHtml(q.invoiceNumber || q.quotationNumber)}`, "")}
      ${q.customerName ? `<div class="report-customer"><strong>${escapeHtml(q.customerName)}</strong><div class="report-firm-details">${customerDetails}</div></div>` : ""}
      <div class="report-table-wrap" style="margin-top:22px;">
        <table class="report-table">
          <thead><tr><th>Area / Work</th><th>Surface</th><th>Product</th><th>Net Area</th><th>Rate</th><th>Total</th></tr></thead>
          <tbody>${items.length ? items.map(r => `
            <tr>
              <td>${escapeHtml(r.lineName || r.roomName)}</td>
              <td>${escapeHtml(r.substrate) || "—"}</td>
              <td>${escapeHtml(r.product) || "—"}</td>
              <td>${Math.round(r.areaSqFt || 0)} sq ft</td>
              <td>${formatAmount(r.rate)}</td>
              <td>${formatAmount(r.total)}</td>
            </tr>
          `).join("") : `<tr><td colspan="6">No itemized breakdown available.</td></tr>`}</tbody>
        </table>
      </div>
      <div class="report-total"><span>Final ${q.isInvoice ? "invoiced" : "quoted"} value</span><strong>${formatAmount(q.finalAmount)}</strong></div>
      ${paid > 0 ? `
        <div class="report-pricing" style="margin-top:16px;">
          <div><span>Amount received</span><strong>${formatAmount(paid)}</strong></div>
          <div><span>Balance due</span><strong>${formatAmount(due)}</strong></div>
        </div>
        ${due <= 0 ? `<div style="margin-top:10px;color:var(--green);font-weight:800;font-size:13px;">✓ PAID IN FULL</div>` : ""}
      ` : ""}
      <p class="report-disclaimer">This document reflects the ${q.isInvoice ? "invoice" : "quotation"} as currently saved, including any payments recorded to date.</p>
    `;
    showDocumentPreview({
      title: `${q.isInvoice ? "Invoice" : "Quotation"} — ${q.invoiceNumber || q.quotationNumber}`,
      contentHtml: content,
      fileName: `${q.invoiceNumber || q.quotationNumber}`,
      editAction: () => openQuotationInQuotations(q.id)
    });
  }

  // ---------- Estimates ----------

  function renderEstimatesReport() {
    const wrap = document.getElementById("repEstimatesList");
    if (!estimates.length) {
      wrap.innerHTML = `<p class="dash-empty">No estimates saved yet from Measurements.</p>`;
      return;
    }

    const sorted = [...estimates].sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
    wrap.innerHTML = `
      <table class="crm-table matorder-vendor-table">
        <thead><tr><th>Project</th><th>Net area</th><th>Estimated value</th><th>Last updated</th><th></th></tr></thead>
        <tbody>${sorted.map(e => `
          <tr class="crm-clickable-row" data-open-estimate="${e.customerId}">
            <td><strong>${escapeHtml(e.projectName) || "—"}</strong></td>
            <td>${e.netAreaSqFt ? Math.round(e.netAreaSqFt) + " sq ft" : "—"}</td>
            <td>${formatAmount(e.total)}</td>
            <td>${e.updatedAt ? new Date(e.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}</td>
            <td class="crm-row-actions"><button class="crm-icon-btn" aria-label="Open estimate">↗</button></td>
          </tr>
        `).join("")}</tbody>
      </table>
    `;

    wrap.querySelectorAll("[data-open-estimate]").forEach(row => {
      row.addEventListener("click", () => {
        generateEstimateStatementPdf(measurementsByCustomer[row.dataset.openEstimate], row.dataset.openEstimate);
      });
    });
  }

  function generateEstimateStatementPdf(snapshot, customerId) {
    if (!snapshot) return;
    const customer = customers.find(c => c.id === customerId);
    const rows = snapshot.roomsSummary || [];

    const content = `
      ${buildStatementHeader("ESTIMATE", snapshot.projectName || "Estimate", customer ? escapeHtml(customer.name) : "Estimate", snapshot.address || "")}
      <div class="report-table-wrap" style="margin-top:22px;">
        <table class="report-table">
          <thead><tr><th>Area / Work</th><th>Surface</th><th>Product</th><th>Shade</th><th>Painting Type</th><th>Net Area</th><th>Rate</th><th>Total</th></tr></thead>
          <tbody>${rows.length ? rows.map(r => `
            <tr>
              <td>${escapeHtml(r.lineName || r.roomName)}</td>
              <td>${escapeHtml(r.substrate) || "—"}</td>
              <td>${escapeHtml(r.product) || "—"}</td>
              <td>${escapeHtml(r.shade) || "—"}</td>
              <td>${escapeHtml(r.paintingType) || "—"}</td>
              <td>${Math.round(r.areaSqFt || 0)} sq ft</td>
              <td>${formatAmount(r.rate)}</td>
              <td>${formatAmount(r.total)}</td>
            </tr>
          `).join("") : `<tr><td colspan="8">No itemized rooms recorded.</td></tr>`}</tbody>
        </table>
      </div>
      <div class="report-pricing" style="margin-top:16px;">
        <div><span>Subtotal</span><strong>${formatAmount(snapshot.subtotal)}</strong></div>
        <div><span>Discount (${snapshot.discountPercent || 0}%)</span><strong>—</strong></div>
        <div><span>GST (${snapshot.gstPercent || 0}%)</span><strong>—</strong></div>
      </div>
      <div class="report-total"><span>Final estimated value · ${Math.round(snapshot.netAreaSqFt || 0)} sq ft</span><strong>${formatAmount(snapshot.total)}</strong></div>
      <p class="report-disclaimer">This is a preliminary estimate based on site measurements. Final pricing may vary after surface inspection, product selection, scope confirmation, and actual site conditions.</p>
    `;
    showDocumentPreview({
      title: `Estimate — ${snapshot.projectName || "Estimate"}`,
      contentHtml: content,
      fileName: `${snapshot.projectName || "estimate"}-estimate`,
      editAction: () => { window.location.href = `estimator/index.html?customerId=${encodeURIComponent(customerId)}`; }
    });
  }

  // ---------- Site-wise summary ----------

  function renderSitesReport() {
    const wrap = document.getElementById("repSitesList");
    if (!projects.length) {
      wrap.innerHTML = `<p class="dash-empty">No projects yet.</p>`;
      return;
    }

    const rows = projects.map(p => {
      const materialTotal = (p.materialOrders || []).reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
      const materialPaid = (p.materialOrders || []).reduce((sum, o) => sum + (Number(o.paidAmount) || 0), 0);
      const materialDue = Math.max(0, materialTotal - materialPaid);

      const labourTotal = (p.labour || []).reduce((sum, l) => sum + (Number(l.days) || 0) * (Number(l.ratePerDay) || 0), 0);
      const labourPaid = (p.labourPayments || []).reduce((sum, pay) => sum + (Number(pay.amount) || 0), 0);
      const labourDue = Math.max(0, labourTotal - labourPaid);

      const totalCost = materialTotal + labourTotal;
      const totalDue = materialDue + labourDue;

      const EXCLUDED_FROM_REVENUE = ["Draft", "Rejected", "Expired", "Converted to Invoice"];
      const linkedQuotes = quotations.filter(q => q.projectId === p.id && !EXCLUDED_FROM_REVENUE.includes(q.status));
      const revenue = linkedQuotes.reduce((sum, q) => sum + (Number(q.finalAmount) || 0), 0);
      const margin = revenue - totalCost;

      return { id: p.id, name: p.name, customerName: p.customerName, materialTotal, labourTotal, totalCost, totalDue, revenue, margin };
    }).sort((a, b) => b.totalCost - a.totalCost);

    wrap.innerHTML = `
      <table class="crm-table matorder-vendor-table">
        <thead>
          <tr>
            <th>Site</th><th>Material cost</th><th>Labour cost</th><th>Total cost</th>
            <th>Outstanding</th><th>Quoted revenue</th><th>Margin</th>
          </tr>
        </thead>
        <tbody>${rows.map(r => `
          <tr class="crm-clickable-row" data-open-project="${r.id}">
            <td>
              <strong>${escapeHtml(r.name)}</strong>
              ${r.customerName ? `<div class="crm-muted">${escapeHtml(r.customerName)}</div>` : ""}
            </td>
            <td>${formatAmount(r.materialTotal)}</td>
            <td>${formatAmount(r.labourTotal)}</td>
            <td><strong>${formatAmount(r.totalCost)}</strong></td>
            <td>${r.totalDue > 0 ? `<strong style="color:#ad614b">${formatAmount(r.totalDue)}</strong>` : formatAmount(0)}</td>
            <td>${formatAmount(r.revenue)}</td>
            <td><strong style="color:${r.margin >= 0 ? "var(--green)" : "#ad614b"}">${formatAmount(r.margin)}</strong></td>
          </tr>
        `).join("")}</tbody>
      </table>
    `;

    wrap.querySelectorAll("[data-open-project]").forEach(row => {
      const r = rows.find(x => String(x.id) === row.dataset.openProject);
      row.addEventListener("click", () => generateSiteStatementPdf(r));
    });
  }

  function generateSiteStatementPdf(r) {
    if (!r) return;
    const content = `
      ${buildStatementHeader("SITE SUMMARY", r.name, r.customerName ? escapeHtml(r.customerName) : "Site summary", "")}
      <div class="report-table-wrap" style="margin-top:22px;">
        <table class="report-table">
          <thead><tr><th></th><th>Amount</th></tr></thead>
          <tbody>
            <tr><td>Material cost</td><td>${formatAmount(r.materialTotal)}</td></tr>
            <tr><td>Labour cost</td><td>${formatAmount(r.labourTotal)}</td></tr>
            <tr><td><strong>Total cost</strong></td><td><strong>${formatAmount(r.totalCost)}</strong></td></tr>
            <tr><td>Outstanding (material + labour)</td><td style="color:${r.totalDue > 0 ? "#ad614b" : "inherit"}">${formatAmount(r.totalDue)}</td></tr>
            <tr><td>Quoted revenue</td><td>${formatAmount(r.revenue)}</td></tr>
          </tbody>
        </table>
      </div>
      <div class="report-total"><span>Margin (revenue − total cost)</span><strong style="color:${r.margin >= 0 ? "var(--green)" : "#ad614b"}">${formatAmount(r.margin)}</strong></div>
      <p class="report-disclaimer">This summary combines all material orders and labour recorded for ${escapeHtml(r.name)}, against any quotations linked to this project.</p>
    `;
    showDocumentPreview({
      title: `Site summary — ${r.name}`,
      contentHtml: content,
      fileName: `${r.name}-site-summary`,
      editAction: () => {
        sessionStorage.setItem("dmnActiveProjectId", r.id);
        goToModule("project-detail");
      }
    });
  }

  renderStats();
  renderCustomersReport();
  renderRevenueWonReport();
  renderPipeline();
  renderBreakdown("repLeadSources", customers, "leadSource", "No customers yet.");
  renderBreakdown("repCustomerStatus", customers, "status", "No customers yet.");
  renderMaterialReport();
  renderLabourReport();
  renderInvoiceReport();
  renderEstimatesReport();
  renderSitesReport();

})();
