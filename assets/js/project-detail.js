// ========================================
// Decor My Nest Studio App
// Project detail — schedule, material usage, labour tracking
// ========================================

(function () {

  const PROJECTS_KEY = "dmnProjects";
  const QUOTATIONS_KEY = "dmnQuotations";

  let projects = [];
  try {
    projects = JSON.parse(localStorage.getItem(PROJECTS_KEY)) || [];
  } catch {
    projects = [];
  }

  let quotations = [];
  try {
    quotations = JSON.parse(localStorage.getItem(QUOTATIONS_KEY)) || [];
  } catch {
    quotations = [];
  }

  const activeId = sessionStorage.getItem("dmnActiveProjectId");
  const project = projects.find(p => p.id === activeId);

  function goToProjects() {
    document.querySelectorAll(".menu").forEach(m => m.classList.toggle("active", m.dataset.module === "projects"));
    if (window.loadModule) window.loadModule("projects");
  }

  if (!project) {
    document.getElementById("pdRoot").innerHTML = `
      <button class="crm-link-btn pd-back" id="pdBackEmpty">← Back to Projects</button>
      <div class="pd-empty">Project not found. It may have been deleted.</div>
    `;
    document.getElementById("pdBackEmpty").onclick = goToProjects;
    return;
  }

  project.timeline = project.timeline || [];
  project.materials = project.materials || [];
  project.materialOrders = project.materialOrders || [];
  project.labour = project.labour || [];
  project.labourPayments = project.labourPayments || [];

  function persistProjects() {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  }

  function escapeHtml(str) {
    if (str === undefined || str === null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function statusClass(status) {
    return "status-" + String(status || "").toLowerCase().replace(/\s+/g, "-");
  }

  function formatAmount(value) {
    if (value === null || value === undefined || value === "") return "—";
    return "₹" + Number(value).toLocaleString("en-IN");
  }

  function formatDateShort(value) {
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d)) return "";
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  function formatDateRange(start, end) {
    const s = formatDateShort(start);
    const e = formatDateShort(end);
    if (!s && !e) return "No dates set";
    if (s && e) return `${s} → ${e}`;
    return s || e;
  }

  function formatTimeline(p) {
    const s = formatDateShort(p.startDate);
    const e = formatDateShort(p.targetEndDate);
    if (!s && !e) return "—";
    if (s && e) return `${s} → ${e}`;
    return s || e;
  }

  // ---------- Quotations ----------

  function renderQuotations() {
    const linked = quotations.filter(q =>
      q.projectId === project.id ||
      (project.customerId && q.customerId === project.customerId)
    );

    const empty = document.getElementById("quoEmptyPd");
    const wrap = document.getElementById("pdQuoTableWrap");
    const rows = document.getElementById("pdQuoRows");

    empty.classList.toggle("hidden", linked.length > 0);
    wrap.classList.toggle("hidden", linked.length === 0);
    rows.innerHTML = "";

    linked.forEach(q => {
      const paid = (q.payments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const due = Math.max(0, (q.finalAmount || 0) - paid);
      const payStatus = paid <= 0 ? "Unpaid" : due <= 0 ? "Paid" : "Partially Paid";
      const payClass = payStatus === "Paid" ? "status-approved" : payStatus === "Partially Paid" ? "status-sent" : "status-draft";
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${escapeHtml(q.quotationNumber)}</strong></td>
        <td>${escapeHtml(q.scope)}</td>
        <td>${formatAmount(q.finalAmount)}</td>
        <td><span class="crm-badge ${statusClass(q.status)}">${escapeHtml(q.status)}</span></td>
        <td><span class="crm-badge ${payClass}" title="Paid ${formatAmount(paid)} · Due ${formatAmount(due)}">${payStatus}</span></td>
        <td class="crm-row-actions">
          <button class="crm-icon-btn" data-open-quo="${q.id}" aria-label="Open in Quotations" title="Open in Quotations">↗</button>
        </td>
      `;
      rows.appendChild(tr);
    });

    document.querySelectorAll("[data-open-quo]").forEach(btn => {
      btn.addEventListener("click", () => goToQuotations());
    });
  }

  function goToQuotations() {
    document.querySelectorAll(".menu").forEach(m => m.classList.toggle("active", m.dataset.module === "crm"));
    if (window.loadModule) window.loadModule("quotations");
  }

  document.getElementById("btnNewQuotation").onclick = goToQuotations;



  function renderHead() {
    document.getElementById("pdName").textContent = project.name;
    document.getElementById("pdCustomer").textContent = project.customerName || "No customer linked";
    const badge = document.getElementById("pdStatusBadge");
    badge.textContent = project.status;
    badge.className = "crm-badge " + statusClass(project.status);
  }

  function renderOverview() {
    const items = [
      { label: "Locality", value: project.locality || "—" },
      { label: "Project type", value: project.projectType || "—" },
      { label: "Timeline", value: formatTimeline(project) },
      { label: "Estimate", value: formatAmount(project.estimateAmount) }
    ];
    document.getElementById("pdOverview").innerHTML = items.map(i => `
      <div class="pd-overview-item">
        <span>${escapeHtml(i.label)}</span>
        <strong>${escapeHtml(String(i.value))}</strong>
      </div>
    `).join("");
  }

  // ---------- Budget ----------

  function calcTotals() {
    const materialTotal = project.materials.reduce((sum, m) => sum + (Number(m.usedQty) || 0) * (Number(m.unitCost) || 0), 0);
    const labourTotal = project.labour.reduce((sum, l) => sum + (Number(l.days) || 0) * (Number(l.ratePerDay) || 0), 0);
    const actualTotal = materialTotal + labourTotal;
    const estimate = Number(project.estimateAmount) || 0;
    return { materialTotal, labourTotal, actualTotal, estimate, diff: estimate - actualTotal };
  }

  function renderBudget() {
    const t = calcTotals();
    const hasEstimate = t.estimate > 0;
    const diffClass = hasEstimate ? (t.diff < 0 ? "over" : "under") : "";
    const diffLabel = hasEstimate ? (t.diff < 0 ? "Over estimate" : "Under estimate") : "Actual spend";
    const diffValue = hasEstimate ? formatAmount(Math.abs(t.diff)) : formatAmount(t.actualTotal);

    document.getElementById("pdBudget").innerHTML = `
      <div class="pd-budget-item"><span>Estimate</span><strong>${formatAmount(t.estimate)}</strong></div>
      <div class="pd-budget-item"><span>Material cost</span><strong>${formatAmount(t.materialTotal)}</strong></div>
      <div class="pd-budget-item"><span>Labour cost</span><strong>${formatAmount(t.labourTotal)}</strong></div>
      <div class="pd-budget-item ${diffClass}"><span>${diffLabel}</span><strong>${diffValue}</strong></div>
    `;
  }

  // ---------- Schedule / timeline ----------

  function renderTimeline() {
    const wrap = document.getElementById("pdTimeline");
    const empty = document.getElementById("phaseEmpty");
    const phases = [...project.timeline].sort((a, b) => new Date(a.startDate || 0) - new Date(b.startDate || 0));

    empty.classList.toggle("hidden", phases.length > 0);

    wrap.innerHTML = phases.map(ph => `
      <div class="pd-phase ${statusClass(ph.status)}">
        <span class="pd-phase-dot"></span>
        <div class="pd-phase-body">
          <strong>${escapeHtml(ph.phase)}</strong>
          <span class="crm-badge ${statusClass(ph.status)}">${escapeHtml(ph.status)}</span>
          <div class="crm-muted">${formatDateRange(ph.startDate, ph.endDate)}</div>
          ${ph.notes ? `<div class="crm-muted">${escapeHtml(ph.notes)}</div>` : ""}
        </div>
        <div class="pd-phase-actions">
          <button class="crm-icon-btn" data-edit-phase="${ph.id}" aria-label="Edit">✎</button>
        </div>
      </div>
    `).join("");

    wrap.querySelectorAll("[data-edit-phase]").forEach(btn => {
      btn.addEventListener("click", () => openEditPhase(btn.dataset.editPhase));
    });
  }

  let editingPhaseId = null;
  const phaseModal = document.getElementById("phaseModal");
  const phaseModalTitle = document.getElementById("phaseModalTitle");
  const phaseName = document.getElementById("phaseName");
  const phaseStart = document.getElementById("phaseStart");
  const phaseEnd = document.getElementById("phaseEnd");
  const phaseStatus = document.getElementById("phaseStatus");
  const phaseNotes = document.getElementById("phaseNotes");
  const deletePhaseBtn = document.getElementById("deletePhase");

  function openNewPhase() {
    editingPhaseId = null;
    phaseModalTitle.textContent = "Add phase";
    deletePhaseBtn.hidden = true;
    phaseName.value = "";
    phaseStart.value = "";
    phaseEnd.value = "";
    phaseStatus.selectedIndex = 0;
    phaseNotes.value = "";
    phaseModal.classList.remove("hidden");
    phaseName.focus();
  }

  function openEditPhase(id) {
    const ph = project.timeline.find(x => x.id === id);
    if (!ph) return;
    editingPhaseId = id;
    phaseModalTitle.textContent = "Edit phase";
    deletePhaseBtn.hidden = false;
    phaseName.value = ph.phase || "";
    phaseStart.value = ph.startDate || "";
    phaseEnd.value = ph.endDate || "";
    phaseStatus.value = ph.status || phaseStatus.options[0].value;
    phaseNotes.value = ph.notes || "";
    phaseModal.classList.remove("hidden");
  }

  function closePhaseModal() {
    phaseModal.classList.add("hidden");
  }

  function savePhase() {
    if (phaseName.value.trim() === "") {
      alert("Phase name is required.");
      phaseName.focus();
      return;
    }

    const record = {
      id: editingPhaseId || "PH" + String(Date.now()).slice(-8),
      phase: phaseName.value.trim(),
      startDate: phaseStart.value || null,
      endDate: phaseEnd.value || null,
      status: phaseStatus.value,
      notes: phaseNotes.value.trim()
    };

    if (editingPhaseId) {
      const idx = project.timeline.findIndex(x => x.id === editingPhaseId);
      project.timeline[idx] = record;
    } else {
      project.timeline.push(record);
    }

    persistProjects();
    closePhaseModal();
    renderTimeline();
  }

  function deletePhase() {
    if (!editingPhaseId) return;
    if (!confirm("Delete this phase? This cannot be undone.")) return;
    project.timeline = project.timeline.filter(x => x.id !== editingPhaseId);
    persistProjects();
    closePhaseModal();
    renderTimeline();
  }

  // ---------- Material usage ----------

  function renderMaterials() {
    const body = document.getElementById("materialRows");
    const empty = document.getElementById("materialEmpty");
    const wrap = document.getElementById("materialTableWrap");
    const items = project.materials;

    empty.classList.toggle("hidden", items.length > 0);
    wrap.classList.toggle("hidden", items.length === 0);

    body.innerHTML = items.map(m => {
      const total = (Number(m.usedQty) || 0) * (Number(m.unitCost) || 0);
      const unit = escapeHtml(m.unit || "");
      return `
        <tr>
          <td>
            <strong>${escapeHtml(m.item)}</strong>
            ${m.notes ? `<div class="crm-muted">${escapeHtml(m.notes)}</div>` : ""}
          </td>
          <td>${m.plannedQty ?? "—"} ${m.plannedQty ? unit : ""}</td>
          <td>${m.usedQty ?? "—"} ${m.usedQty ? unit : ""}</td>
          <td>${formatAmount(m.unitCost)}</td>
          <td><strong>${formatAmount(total)}</strong></td>
          <td>${formatDateShort(m.date) || "—"}</td>
          <td class="crm-row-actions"><button class="crm-icon-btn" data-edit-material="${m.id}" aria-label="Edit">✎</button></td>
        </tr>
      `;
    }).join("");

    body.querySelectorAll("[data-edit-material]").forEach(btn => {
      btn.addEventListener("click", () => openEditMaterial(btn.dataset.editMaterial));
    });
  }

  // ---------- Material Orders (vendor/dealer tracking) ----------

  function getCustomList(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; }
  }
  function addToCustomList(key, value) {
    if (!value) return;
    const list = getCustomList(key);
    if (!list.some(item => item.toLowerCase() === value.toLowerCase())) {
      list.push(value);
      localStorage.setItem(key, JSON.stringify(list));
    }
  }
  function matOrderCategoryOptionsHtml(selected) {
    const presets = ["Wallpaper", "Electrical", "Carpentry", "Paint", "Hardware", "Plumbing", "Flooring", ...getCustomList("dmnCustomMaterialCategories")];
    const isCustomExisting = selected && !presets.includes(selected);
    return `<option value="" ${!selected ? "selected" : ""} disabled>Select category</option>${
      presets.map(p => `<option value="${escapeHtml(p)}" ${p === selected ? "selected" : ""}>${escapeHtml(p)}</option>`).join("")
    }${isCustomExisting ? `<option value="${escapeHtml(selected)}" selected>${escapeHtml(selected)}</option>` : ""}<option value="__custom__">Other (type manually)…</option>`;
  }

  function vendorOptionsHtml(selected) {
    const presets = getCustomList("dmnCustomVendors");
    const isCustomExisting = selected && !presets.includes(selected);
    return `<option value="" ${!selected ? "selected" : ""} disabled>Select vendor / dealer</option>${
      presets.map(p => `<option value="${escapeHtml(p)}" ${p === selected ? "selected" : ""}>${escapeHtml(p)}</option>`).join("")
    }${isCustomExisting ? `<option value="${escapeHtml(selected)}" selected>${escapeHtml(selected)}</option>` : ""}<option value="__custom__">+ New vendor / dealer…</option>`;
  }

  function packSizeOptionsHtml(selected) {
    const presets = ["1 L", "4 L", "10 L", "20 L", "1 kg", "5 kg", "10 kg", "25 kg", "50 kg", ...getCustomList("dmnCustomPackSizes")];
    const isCustomExisting = selected && !presets.includes(selected);
    return `<option value="" ${!selected ? "selected" : ""} disabled>Pack size</option>${
      presets.map(p => `<option value="${escapeHtml(p)}" ${p === selected ? "selected" : ""}>${escapeHtml(p)}</option>`).join("")
    }${isCustomExisting ? `<option value="${escapeHtml(selected)}" selected>${escapeHtml(selected)}</option>` : ""}<option value="__custom__">Other (type manually)…</option>`;
  }

  let currentOrderItems = [];

  function renderMatOrderItemsList() {
    const wrap = document.getElementById("matOrderItemsList");
    if (!currentOrderItems.length) {
      wrap.innerHTML = `<p class="crm-muted matorder-items-empty">No items added yet.</p>`;
      return;
    }
    wrap.innerHTML = currentOrderItems.map((item, i) => `
      <div class="matorder-item-row" data-item-index="${i}">
        <input type="text" class="mo-item-name" placeholder="e.g. Textured wallpaper" value="${escapeHtml(item.name)}">
        <select class="mo-item-pack">${packSizeOptionsHtml(item.packSize)}</select>
        <input type="number" class="mo-item-qty" min="0" step="0.1" placeholder="Qty" value="${item.qty ?? ""}">
        <button type="button" class="crm-icon-btn mo-item-remove" aria-label="Remove item">×</button>
      </div>
    `).join("");

    wrap.querySelectorAll(".matorder-item-row").forEach(row => {
      const i = Number(row.dataset.itemIndex);
      row.querySelector(".mo-item-name").addEventListener("input", e => { currentOrderItems[i].name = e.target.value; });
      row.querySelector(".mo-item-qty").addEventListener("input", e => { currentOrderItems[i].qty = e.target.value; });
      row.querySelector(".mo-item-pack").addEventListener("change", e => {
        if (e.target.value === "__custom__") {
          const custom = prompt("Enter a custom pack size (e.g. '2 L', '15 kg')", "");
          if (custom && custom.trim()) {
            addToCustomList("dmnCustomPackSizes", custom.trim());
            currentOrderItems[i].packSize = custom.trim();
          } else {
            currentOrderItems[i].packSize = "";
          }
          renderMatOrderItemsList();
        } else {
          currentOrderItems[i].packSize = e.target.value;
        }
      });
      row.querySelector(".mo-item-remove").addEventListener("click", () => {
        currentOrderItems.splice(i, 1);
        renderMatOrderItemsList();
      });
    });
  }

  document.getElementById("btnAddMatOrderItem").onclick = () => {
    currentOrderItems.push({ name: "", packSize: "", qty: "" });
    renderMatOrderItemsList();
  };

  function renderMaterialOrders() {
    const body = document.getElementById("matOrderRows");
    const empty = document.getElementById("matOrderEmpty");
    const wrap = document.getElementById("matOrderTableWrap");
    const summaryWrap = document.getElementById("matOrderSummary");
    const orders = project.materialOrders;

    empty.classList.toggle("hidden", orders.length > 0);
    wrap.classList.toggle("hidden", orders.length === 0);

    const totalOrdered = orders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
    const totalPaid = orders.reduce((sum, o) => sum + (Number(o.paidAmount) || 0), 0);
    const totalOutstanding = Math.max(0, totalOrdered - totalPaid);

    summaryWrap.innerHTML = orders.length ? `
      <div><span>Total ordered</span><strong>${formatAmount(totalOrdered)}</strong></div>
      <div><span>Total paid</span><strong class="paid">${formatAmount(totalPaid)}</strong></div>
      <div><span>Outstanding</span><strong class="due">${formatAmount(totalOutstanding)}</strong></div>
    ` : "";

    body.innerHTML = orders.map(o => {
      const outstanding = Math.max(0, (Number(o.amount) || 0) - (Number(o.paidAmount) || 0));
      const itemsDisplay = Array.isArray(o.lineItems) && o.lineItems.length
        ? `<table class="matorder-items-table">
            <thead><tr><th>Product</th><th>Size</th><th>Qty</th></tr></thead>
            <tbody>${o.lineItems.map(item => `
              <tr>
                <td>${escapeHtml(item.name)}</td>
                <td>${escapeHtml(item.packSize) || "—"}</td>
                <td>${item.qty ?? "—"}</td>
              </tr>
            `).join("")}</tbody>
          </table>`
        : (o.items ? escapeHtml(o.items) : "—");
      return `
        <tr>
          <td>${formatDateShort(o.date) || "—"}</td>
          <td>
            <strong>${escapeHtml(o.vendor)}</strong>
            ${o.notes ? `<div class="crm-muted">${escapeHtml(o.notes)}</div>` : ""}
          </td>
          <td><span class="crm-badge status-draft">${escapeHtml(o.category) || "—"}</span></td>
          <td class="matorder-items-cell">${itemsDisplay}</td>
          <td>${formatAmount(o.amount)}</td>
          <td>${formatAmount(o.paidAmount)}</td>
          <td><strong style="color:${outstanding > 0 ? "#ad614b" : "var(--green)"}">${formatAmount(outstanding)}</strong></td>
          <td class="crm-row-actions"><button class="crm-icon-btn" data-edit-mat-order="${o.id}" aria-label="Edit">✎</button></td>
        </tr>
      `;
    }).join("");

    body.querySelectorAll("[data-edit-mat-order]").forEach(btn => {
      btn.addEventListener("click", () => openEditMatOrder(btn.dataset.editMatOrder));
    });

    renderVendorWiseSummary(orders);
  }

  function renderVendorWiseSummary(orders) {
    const wrap = document.getElementById("matOrderVendorSummary");
    if (!wrap) return;

    if (!orders.length) {
      wrap.innerHTML = "";
      return;
    }

    const byVendor = {};
    orders.forEach(o => {
      const key = o.vendor || "Unspecified";
      if (!byVendor[key]) byVendor[key] = { ordered: 0, paid: 0 };
      byVendor[key].ordered += Number(o.amount) || 0;
      byVendor[key].paid += Number(o.paidAmount) || 0;
    });

    const rows = Object.entries(byVendor).sort((a, b) => b[1].ordered - a[1].ordered);

    wrap.innerHTML = `
      <h3 class="matorder-vendor-summary-title">Vendor-wise totals</h3>
      <table class="crm-table matorder-vendor-table">
        <thead><tr><th>Vendor / Dealer</th><th>Ordered</th><th>Paid</th><th>Outstanding</th><th></th></tr></thead>
        <tbody>
          ${rows.map(([vendor, totals]) => {
            const outstanding = Math.max(0, totals.ordered - totals.paid);
            return `
              <tr>
                <td><strong>${escapeHtml(vendor)}</strong></td>
                <td>${formatAmount(totals.ordered)}</td>
                <td>${formatAmount(totals.paid)}</td>
                <td><strong style="color:${outstanding > 0 ? "#ad614b" : "var(--green)"}">${formatAmount(outstanding)}</strong></td>
                <td><button class="crm-icon-btn" data-vendor-statement="${escapeHtml(vendor)}" title="Send payment statement">📄</button></td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    `;

    wrap.querySelectorAll("[data-vendor-statement]").forEach(btn => {
      btn.addEventListener("click", () => openVendorStatement(btn.dataset.vendorStatement));
    });
  }

  let editingMatOrderId = null;
  const matOrderModal = document.getElementById("matOrderModal");
  const matOrderModalTitle = document.getElementById("matOrderModalTitle");
  const matOrderDate = document.getElementById("matOrderDate");
  const matOrderCategory = document.getElementById("matOrderCategory");
  const matOrderVendor = document.getElementById("matOrderVendor");
  const matOrderAmount = document.getElementById("matOrderAmount");
  const matOrderPaid = document.getElementById("matOrderPaid");
  const matOrderNotes = document.getElementById("matOrderNotes");
  const matOrderScreenshotInput = document.getElementById("matOrderScreenshot");
  const matOrderScreenshotPreview = document.getElementById("matOrderScreenshotPreview");
  const deleteMatOrderBtn = document.getElementById("deleteMatOrder");
  let currentMatOrderScreenshot = null;

  matOrderScreenshotInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    readAndResizeImage(file, dataUrl => {
      currentMatOrderScreenshot = dataUrl;
      matOrderScreenshotPreview.innerHTML = `<img src="${dataUrl}" alt="Payment screenshot">`;
      matOrderScreenshotPreview.classList.remove("hidden");
    });
  });

  matOrderVendor.addEventListener("change", () => {
    if (matOrderVendor.value === "__custom__") {
      const custom = prompt("Enter the vendor / dealer name", "");
      if (custom && custom.trim()) {
        addToCustomList("dmnCustomVendors", custom.trim());
        matOrderVendor.innerHTML = vendorOptionsHtml(custom.trim());
      } else {
        matOrderVendor.innerHTML = vendorOptionsHtml("");
      }
    }
  });

  matOrderCategory.addEventListener("change", () => {
    if (matOrderCategory.value === "__custom__") {
      const custom = prompt("Enter a custom material category", "");
      if (custom && custom.trim()) {
        addToCustomList("dmnCustomMaterialCategories", custom.trim());
        matOrderCategory.innerHTML = matOrderCategoryOptionsHtml(custom.trim());
      } else {
        matOrderCategory.innerHTML = matOrderCategoryOptionsHtml("");
      }
    }
  });

  function openNewMatOrder() {
    editingMatOrderId = null;
    matOrderModalTitle.textContent = "Add material order";
    deleteMatOrderBtn.hidden = true;
    matOrderDate.value = new Date().toISOString().slice(0, 10);
    matOrderCategory.innerHTML = matOrderCategoryOptionsHtml("");
    matOrderVendor.innerHTML = vendorOptionsHtml("");
    matOrderAmount.value = "";
    matOrderPaid.value = "";
    matOrderNotes.value = "";
    matOrderScreenshotInput.value = "";
    currentMatOrderScreenshot = null;
    matOrderScreenshotPreview.innerHTML = "";
    matOrderScreenshotPreview.classList.add("hidden");
    currentOrderItems = [];
    renderMatOrderItemsList();
    matOrderModal.classList.remove("hidden");
    matOrderVendor.focus();
  }

  function openEditMatOrder(id) {
    const o = project.materialOrders.find(x => x.id === id);
    if (!o) return;
    editingMatOrderId = id;
    matOrderModalTitle.textContent = "Edit material order";
    deleteMatOrderBtn.hidden = false;
    matOrderDate.value = o.date || "";
    matOrderCategory.innerHTML = matOrderCategoryOptionsHtml(o.category || "");
    matOrderVendor.innerHTML = vendorOptionsHtml(o.vendor || "");
    matOrderAmount.value = o.amount ?? "";
    matOrderPaid.value = o.paidAmount ?? "";
    matOrderNotes.value = o.notes || "";
    matOrderScreenshotInput.value = "";
    currentMatOrderScreenshot = o.screenshot || null;
    if (currentMatOrderScreenshot) {
      matOrderScreenshotPreview.innerHTML = `<img src="${currentMatOrderScreenshot}" alt="Payment screenshot">`;
      matOrderScreenshotPreview.classList.remove("hidden");
    } else {
      matOrderScreenshotPreview.innerHTML = "";
      matOrderScreenshotPreview.classList.add("hidden");
    }
    currentOrderItems = Array.isArray(o.lineItems) && o.lineItems.length
      ? o.lineItems.map(item => ({ ...item }))
      : (o.items ? [{ name: o.items, packSize: "", qty: "" }] : []);
    renderMatOrderItemsList();
    matOrderModal.classList.remove("hidden");
  }

  function closeMatOrderModal() {
    matOrderModal.classList.add("hidden");
  }

  function saveMatOrder() {
    if (matOrderVendor.value.trim() === "" || matOrderVendor.value === "__custom__") {
      alert("Vendor / dealer name is required.");
      matOrderVendor.focus();
      return;
    }
    if (matOrderCategory.value === "__custom__" || matOrderCategory.value === "") {
      alert("Please select or enter a category.");
      return;
    }

    const record = {
      id: editingMatOrderId || "MATORD" + String(Date.now()).slice(-8),
      date: matOrderDate.value || null,
      category: matOrderCategory.value,
      vendor: matOrderVendor.value.trim(),
      lineItems: currentOrderItems
        .filter(item => item.name && item.name.trim())
        .map(item => ({ name: item.name.trim(), packSize: item.packSize || "", qty: item.qty ? Number(item.qty) : null })),
      amount: matOrderAmount.value ? Number(matOrderAmount.value) : 0,
      paidAmount: matOrderPaid.value ? Number(matOrderPaid.value) : 0,
      notes: matOrderNotes.value.trim(),
      screenshot: currentMatOrderScreenshot
    };

    if (editingMatOrderId) {
      const idx = project.materialOrders.findIndex(x => x.id === editingMatOrderId);
      project.materialOrders[idx] = record;
    } else {
      project.materialOrders.push(record);
    }

    persistProjects();
    closeMatOrderModal();
    renderMaterialOrders();
    renderBudget();
  }

  function deleteMatOrder() {
    if (!editingMatOrderId) return;
    if (!confirm("Delete this material order? This cannot be undone.")) return;
    project.materialOrders = project.materialOrders.filter(x => x.id !== editingMatOrderId);
    persistProjects();
    closeMatOrderModal();
    renderMaterialOrders();
    renderBudget();
  }

  document.getElementById("btnAddMaterialOrder").onclick = openNewMatOrder;
  document.getElementById("closeMatOrderModal").onclick = closeMatOrderModal;
  document.getElementById("cancelMatOrderModal").onclick = closeMatOrderModal;
  document.getElementById("saveMatOrder").onclick = saveMatOrder;
  deleteMatOrderBtn.onclick = deleteMatOrder;
  matOrderModal.addEventListener("click", (e) => { if (e.target === matOrderModal) closeMatOrderModal(); });

  let editingMaterialId = null;

  const materialModal = document.getElementById("materialModal");
  const materialModalTitle = document.getElementById("materialModalTitle");
  const materialItem = document.getElementById("materialItem");
  const materialUnit = document.getElementById("materialUnit");
  const materialDate = document.getElementById("materialDate");
  const materialPlanned = document.getElementById("materialPlanned");
  const materialUsed = document.getElementById("materialUsed");
  const materialUnitCost = document.getElementById("materialUnitCost");
  const materialNotes = document.getElementById("materialNotes");
  const deleteMaterialBtn = document.getElementById("deleteMaterial");

  function openNewMaterial() {
    editingMaterialId = null;
    materialModalTitle.textContent = "Add material";
    deleteMaterialBtn.hidden = true;
    materialItem.value = "";
    materialUnit.value = "";
    materialDate.value = "";
    materialPlanned.value = "";
    materialUsed.value = "";
    materialUnitCost.value = "";
    materialNotes.value = "";
    materialModal.classList.remove("hidden");
    materialItem.focus();
  }

  function openEditMaterial(id) {
    const m = project.materials.find(x => x.id === id);
    if (!m) return;
    editingMaterialId = id;
    materialModalTitle.textContent = "Edit material";
    deleteMaterialBtn.hidden = false;
    materialItem.value = m.item || "";
    materialUnit.value = m.unit || "";
    materialDate.value = m.date || "";
    materialPlanned.value = m.plannedQty ?? "";
    materialUsed.value = m.usedQty ?? "";
    materialUnitCost.value = m.unitCost ?? "";
    materialNotes.value = m.notes || "";
    materialModal.classList.remove("hidden");
  }

  function closeMaterialModal() {
    materialModal.classList.add("hidden");
  }

  function saveMaterial() {
    if (materialItem.value.trim() === "") {
      alert("Item / material is required.");
      materialItem.focus();
      return;
    }

    const record = {
      id: editingMaterialId || "MAT" + String(Date.now()).slice(-8),
      item: materialItem.value.trim(),
      unit: materialUnit.value.trim(),
      date: materialDate.value || null,
      plannedQty: materialPlanned.value ? Number(materialPlanned.value) : null,
      usedQty: materialUsed.value ? Number(materialUsed.value) : null,
      unitCost: materialUnitCost.value ? Number(materialUnitCost.value) : null,
      notes: materialNotes.value.trim()
    };

    if (editingMaterialId) {
      const idx = project.materials.findIndex(x => x.id === editingMaterialId);
      project.materials[idx] = record;
    } else {
      project.materials.push(record);
    }

    persistProjects();
    closeMaterialModal();
    renderMaterials();
    renderBudget();
  }

  function deleteMaterial() {
    if (!editingMaterialId) return;
    if (!confirm("Delete this material entry? This cannot be undone.")) return;
    project.materials = project.materials.filter(x => x.id !== editingMaterialId);
    persistProjects();
    closeMaterialModal();
    renderMaterials();
    renderBudget();
  }

  // ---------- Labour ----------

  function renderLabour() {
    const body = document.getElementById("labourRows");
    const empty = document.getElementById("labourEmpty");
    const wrap = document.getElementById("labourTableWrap");
    const items = [...project.labour].sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

    empty.classList.toggle("hidden", items.length > 0);
    wrap.classList.toggle("hidden", items.length === 0);

    body.innerHTML = items.map(l => {
      const total = (Number(l.days) || 0) * (Number(l.ratePerDay) || 0);
      return `
        <tr>
          <td>${formatDateShort(l.date) || "—"}</td>
          <td>
            <strong>${escapeHtml(l.worker)}</strong>
            ${l.notes ? `<div class="crm-muted">${escapeHtml(l.notes)}</div>` : ""}
          </td>
          <td>${escapeHtml(l.role) || "—"}</td>
          <td>${l.days ?? "—"}</td>
          <td>${formatAmount(l.ratePerDay)}</td>
          <td><strong>${formatAmount(total)}</strong></td>
          <td class="crm-row-actions"><button class="crm-icon-btn" data-edit-labour="${l.id}" aria-label="Edit">✎</button></td>
        </tr>
      `;
    }).join("");

    body.querySelectorAll("[data-edit-labour]").forEach(btn => {
      btn.addEventListener("click", () => openEditLabour(btn.dataset.editLabour));
    });

    renderWorkerWiseSummary();
  }

  function renderLabourPaymentHistory() {
    const wrap = document.getElementById("labourPaymentHistory");
    if (!wrap) return;

    if (!project.labourPayments.length) {
      wrap.innerHTML = "";
      return;
    }

    const sorted = [...project.labourPayments].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    wrap.innerHTML = `
      <h3 class="matorder-vendor-summary-title">Payment history</h3>
      <table class="crm-table matorder-vendor-table">
        <thead><tr><th>Date</th><th>Worker</th><th>Amount</th><th>Mode</th><th>Note</th></tr></thead>
        <tbody>
          ${sorted.map(p => `
            <tr>
              <td>${formatDateShort(p.date) || "—"}</td>
              <td><strong>${escapeHtml(p.worker)}</strong></td>
              <td>${formatAmount(p.amount)}</td>
              <td><span class="crm-badge status-draft">${escapeHtml(p.mode) || "—"}</span></td>
              <td class="crm-muted">${escapeHtml(p.note) || "—"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  // ---------- Payment statements (shareable slips) ----------

  function readAndResizeImage(file, callback) {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const maxSize = 900;
        const scale = Math.min(1, maxSize / image.width, maxSize / image.height);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        callback(canvas.toDataURL("image/jpeg", 0.85));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function readFirmForStatement() {
    try {
      return (JSON.parse(localStorage.getItem("coatState")) || {}).firm || {};
    } catch {
      return {};
    }
  }

  function buildStatementHeader(docType, partyName, partyLabel) {
    const firm = readFirmForStatement();
    const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    const firmDetails = [firm.phone, firm.email].filter(Boolean).map(escapeHtml).join(" · ");
    return `
      <div class="report-doc-type">${docType}</div>
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
      <div class="report-meta">${partyLabel} · ${escapeHtml(project.name || "")}${project.customerName ? ` · ${escapeHtml(project.customerName)}` : ""}</div>
    `;
  }

  let currentStatementFileName = "statement";

  function openWorkerStatement(workerName) {
    const payments = project.labourPayments
      .filter(p => p.worker === workerName)
      .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
    const entries = project.labour.filter(l => l.worker === workerName);
    const totalEarned = entries.reduce((sum, l) => sum + (Number(l.days) || 0) * (Number(l.ratePerDay) || 0), 0);
    const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const due = Math.max(0, totalEarned - totalPaid);

    document.getElementById("statementModalTitle").textContent = `Statement — ${workerName}`;
    document.getElementById("statementContent").innerHTML = `
      ${buildStatementHeader("PAYMENT STATEMENT", workerName, "Worker / Contractor")}
      <div class="report-pricing" style="margin-top:16px;">
        <div><span>Total earned (site)</span><strong>${formatAmount(totalEarned)}</strong></div>
        <div><span>Total paid</span><strong>${formatAmount(totalPaid)}</strong></div>
      </div>
      <div class="report-total"><span>Balance due</span><strong>${formatAmount(due)}</strong></div>
      <div class="report-table-wrap" style="margin-top:22px;">
        <table class="report-table">
          <thead><tr><th>Date</th><th>Amount</th><th>Mode</th><th>Note</th><th>Proof</th></tr></thead>
          <tbody>${payments.length ? payments.map(p => `
            <tr>
              <td>${formatDateShort(p.date) || "—"}</td>
              <td>${formatAmount(p.amount)}</td>
              <td>${escapeHtml(p.mode) || "—"}</td>
              <td>${escapeHtml(p.note) || "—"}</td>
              <td>${p.screenshot ? `<img src="${p.screenshot}" class="statement-proof-thumb" alt="Payment proof">` : "—"}</td>
            </tr>
          `).join("") : `<tr><td colspan="5">No payments recorded yet.</td></tr>`}</tbody>
        </table>
      </div>
      <p class="report-disclaimer">This statement reflects payments recorded for work on ${escapeHtml(project.name || "this site")}. Please reach out with any questions about the amounts shown.</p>
    `;
    currentStatementFileName = `${workerName}-payment-statement`;
    document.getElementById("statementModal").classList.remove("hidden");
  }

  function openVendorStatement(vendorName) {
    const orders = project.materialOrders
      .filter(o => o.vendor === vendorName)
      .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
    const totalOrdered = orders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
    const totalPaid = orders.reduce((sum, o) => sum + (Number(o.paidAmount) || 0), 0);
    const outstanding = Math.max(0, totalOrdered - totalPaid);

    document.getElementById("statementModalTitle").textContent = `Statement — ${vendorName}`;
    document.getElementById("statementContent").innerHTML = `
      ${buildStatementHeader("PAYMENT STATEMENT", vendorName, "Vendor / Dealer")}
      <div class="report-pricing" style="margin-top:16px;">
        <div><span>Total ordered (site)</span><strong>${formatAmount(totalOrdered)}</strong></div>
        <div><span>Total paid</span><strong>${formatAmount(totalPaid)}</strong></div>
      </div>
      <div class="report-total"><span>Outstanding balance</span><strong>${formatAmount(outstanding)}</strong></div>
      <div class="report-table-wrap" style="margin-top:22px;">
        <table class="report-table">
          <thead><tr><th>Date</th><th>Category</th><th>Order value</th><th>Paid</th><th>Outstanding</th><th>Notes</th><th>Proof</th></tr></thead>
          <tbody>${orders.length ? orders.map(o => {
            const orderDue = Math.max(0, (Number(o.amount) || 0) - (Number(o.paidAmount) || 0));
            return `
              <tr>
                <td>${formatDateShort(o.date) || "—"}</td>
                <td>${escapeHtml(o.category) || "—"}</td>
                <td>${formatAmount(o.amount)}</td>
                <td>${formatAmount(o.paidAmount)}</td>
                <td>${formatAmount(orderDue)}</td>
                <td>${escapeHtml(o.notes) || "—"}</td>
                <td>${o.screenshot ? `<img src="${o.screenshot}" class="statement-proof-thumb" alt="Payment proof">` : "—"}</td>
              </tr>
            `;
          }).join("") : `<tr><td colspan="7">No orders recorded yet.</td></tr>`}</tbody>
        </table>
      </div>
      <p class="report-disclaimer">This statement reflects orders and payments recorded for ${escapeHtml(project.name || "this site")}. Please reach out with any questions about the amounts shown.</p>
    `;
    currentStatementFileName = `${vendorName}-payment-statement`;
    document.getElementById("statementModal").classList.remove("hidden");
  }

  function closeStatementModal() {
    document.getElementById("statementModal").classList.add("hidden");
  }

  async function saveStatementAsPdf() {
    const button = document.getElementById("saveStatementPdf");
    const originalLabel = button.textContent;
    button.textContent = "Generating PDF…";
    button.disabled = true;

    try {
      const source = document.getElementById("statementContent");
      const canvas = await html2canvas(source, { scale: 2, useCORS: true, backgroundColor: "#fffdf8" });
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

      pdf.save(`${currentStatementFileName.replace(/[^a-z0-9]+/gi, "-")}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Couldn't generate the PDF — please try again.");
    } finally {
      button.textContent = originalLabel;
      button.disabled = false;
    }
  }

  document.getElementById("closeStatementModal").onclick = closeStatementModal;
  document.getElementById("cancelStatementModal").onclick = closeStatementModal;
  document.getElementById("saveStatementPdf").onclick = saveStatementAsPdf;
  document.getElementById("statementModal").addEventListener("click", (e) => {
    if (e.target.id === "statementModal") closeStatementModal();
  });

  function renderWorkerWiseSummary() {
    const wrap = document.getElementById("labourWorkerSummary");
    if (!wrap) return;

    if (!project.labour.length && !project.labourPayments.length) {
      wrap.innerHTML = "";
      return;
    }

    const byWorker = {};
    project.labour.forEach(l => {
      const key = l.worker || "Unspecified";
      if (!byWorker[key]) byWorker[key] = { earned: 0, paid: 0 };
      byWorker[key].earned += (Number(l.days) || 0) * (Number(l.ratePerDay) || 0);
    });
    project.labourPayments.forEach(p => {
      const key = p.worker || "Unspecified";
      if (!byWorker[key]) byWorker[key] = { earned: 0, paid: 0 };
      byWorker[key].paid += Number(p.amount) || 0;
    });

    const rows = Object.entries(byWorker).sort((a, b) => b[1].earned - a[1].earned);
    if (!rows.length) {
      wrap.innerHTML = "";
      return;
    }

    wrap.innerHTML = `
      <h3 class="matorder-vendor-summary-title">Worker-wise totals</h3>
      <table class="crm-table matorder-vendor-table">
        <thead><tr><th>Worker</th><th>Earned</th><th>Paid</th><th>Balance due</th><th></th></tr></thead>
        <tbody>
          ${rows.map(([worker, totals]) => {
            const due = Math.max(0, totals.earned - totals.paid);
            return `
              <tr>
                <td><strong>${escapeHtml(worker)}</strong></td>
                <td>${formatAmount(totals.earned)}</td>
                <td>${formatAmount(totals.paid)}</td>
                <td><strong style="color:${due > 0 ? "#ad614b" : "var(--green)"}">${formatAmount(due)}</strong></td>
                <td><button class="crm-icon-btn" data-worker-statement="${escapeHtml(worker)}" title="Send payment statement">📄</button></td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    `;

    wrap.querySelectorAll("[data-worker-statement]").forEach(btn => {
      btn.addEventListener("click", () => openWorkerStatement(btn.dataset.workerStatement));
    });
  }

  const WORKER_CONTACTS_KEY = "dmnWorkerContacts";

  function readWorkerContacts() {
    try {
      return JSON.parse(localStorage.getItem(WORKER_CONTACTS_KEY)) || {};
    } catch {
      return {};
    }
  }
  function getWorkerContact(name) {
    return readWorkerContacts()[name] || null;
  }
  function saveWorkerContact(name, phone, upi) {
    const contacts = readWorkerContacts();
    contacts[name] = { phone: phone || "", upi: upi || "" };
    localStorage.setItem(WORKER_CONTACTS_KEY, JSON.stringify(contacts));
  }

  function promptEditWorkerContact(workerName, onSaved) {
    const existing = getWorkerContact(workerName) || {};
    const phone = prompt(`Phone number for ${workerName}`, existing.phone || "");
    if (phone === null) return;
    const upi = prompt(`UPI ID for ${workerName} (e.g. name@okhdfcbank) — leave blank if none`, existing.upi || "");
    if (upi === null) return;
    saveWorkerContact(workerName, phone.trim(), upi.trim());
    if (onSaved) onSaved();
  }

  function renderWorkerContactRow(workerName, containerId, amountFieldId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!workerName || workerName === "__custom__") {
      container.classList.add("hidden");
      container.innerHTML = "";
      return;
    }

    const contact = getWorkerContact(workerName);
    container.classList.remove("hidden");

    if (!contact || (!contact.phone && !contact.upi)) {
      container.innerHTML = `<button type="button" class="crm-btn-ghost worker-contact-add" data-add-contact="${escapeHtml(workerName)}">+ Add phone / UPI for ${escapeHtml(workerName)}</button>`;
      container.querySelector("[data-add-contact]").onclick = () => {
        promptEditWorkerContact(workerName, () => renderWorkerContactRow(workerName, containerId, amountFieldId));
      };
      return;
    }

    container.innerHTML = `
      ${contact.phone ? `<a href="tel:${escapeHtml(contact.phone)}" class="worker-contact-btn">📞 Call</a>` : ""}
      ${contact.upi ? `<button type="button" class="worker-contact-btn worker-contact-pay" data-upi-pay="${escapeHtml(workerName)}">💳 Pay via UPI</button>` : ""}
      <button type="button" class="worker-contact-edit" data-edit-contact="${escapeHtml(workerName)}">✎ Edit</button>
    `;

    const payBtn = container.querySelector("[data-upi-pay]");
    if (payBtn) {
      payBtn.onclick = () => {
        const amountField = document.getElementById(amountFieldId);
        const amount = amountField ? Number(amountField.value) : 0;
        if (!amount || amount <= 0) {
          alert("Enter the payment amount first, then tap Pay via UPI.");
          return;
        }
        const modeField = amountFieldId === "labourInlineAmount" ? document.getElementById("labourInlineMode") : document.getElementById("labourPayMode");
        if (modeField) modeField.value = "UPI";
        const upiUrl = `upi://pay?pa=${encodeURIComponent(contact.upi)}&pn=${encodeURIComponent(workerName)}&am=${encodeURIComponent(amount)}&cu=INR`;
        window.location.href = upiUrl;
        setTimeout(() => {
          alert("If the payment went through in your UPI app, come back here and tap Save to record it — the amount and mode are already filled in.");
        }, 800);
      };
    }
    container.querySelector("[data-edit-contact]").onclick = () => {
      promptEditWorkerContact(workerName, () => renderWorkerContactRow(workerName, containerId, amountFieldId));
    };
  }

  function workerOptionsHtml(selected) {
    const presets = getCustomList("dmnCustomWorkers");
    const isCustomExisting = selected && !presets.includes(selected);
    return `<option value="" ${!selected ? "selected" : ""} disabled>Select worker / contractor</option>${
      presets.map(p => `<option value="${escapeHtml(p)}" ${p === selected ? "selected" : ""}>${escapeHtml(p)}</option>`).join("")
    }${isCustomExisting ? `<option value="${escapeHtml(selected)}" selected>${escapeHtml(selected)}</option>` : ""}<option value="__custom__">+ New worker / contractor…</option>`;
  }

  let editingLabourId = null;
  const labourModal = document.getElementById("labourModal");
  const labourModalTitle = document.getElementById("labourModalTitle");
  const labourWorker = document.getElementById("labourWorker");
  const labourRole = document.getElementById("labourRole");
  const labourDate = document.getElementById("labourDate");
  const labourDays = document.getElementById("labourDays");
  const labourRate = document.getElementById("labourRate");
  const labourNotes = document.getElementById("labourNotes");
  const labourPaidToday = document.getElementById("labourPaidToday");
  const labourInlinePaymentFields = document.getElementById("labourInlinePaymentFields");
  const labourInlineAmount = document.getElementById("labourInlineAmount");
  const labourInlinePaymentDate = document.getElementById("labourInlinePaymentDate");
  const labourInlineMode = document.getElementById("labourInlineMode");
  const labourInlineScreenshotInput = document.getElementById("labourInlineScreenshot");
  const labourInlineScreenshotPreview = document.getElementById("labourInlineScreenshotPreview");
  const deleteLabourBtn = document.getElementById("deleteLabour");
  let currentLabourInlineScreenshot = null;

  labourPaidToday.addEventListener("change", () => {
    labourInlinePaymentFields.classList.toggle("hidden", !labourPaidToday.checked);
    if (labourPaidToday.checked && !labourInlinePaymentDate.value) {
      labourInlinePaymentDate.value = labourDate.value || new Date().toISOString().slice(0, 10);
    }
    renderWorkerPaymentContext(labourWorker.value, "labourInlineWorkerContext");
    renderWorkerContactRow(labourWorker.value, "labourWorkerContactRow", "labourInlineAmount");
  });

  labourInlineScreenshotInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    readAndResizeImage(file, dataUrl => {
      currentLabourInlineScreenshot = dataUrl;
      labourInlineScreenshotPreview.innerHTML = `<img src="${dataUrl}" alt="Payment screenshot">`;
      labourInlineScreenshotPreview.classList.remove("hidden");
    });
  });

  function renderWorkerPaymentContext(workerName, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!workerName || workerName === "__custom__") {
      container.innerHTML = `<p class="crm-muted labour-context-empty">Select a worker above to see their payment history here.</p>`;
      return;
    }

    const earned = project.labour
      .filter(l => l.worker === workerName)
      .reduce((sum, l) => sum + (Number(l.days) || 0) * (Number(l.ratePerDay) || 0), 0);
    const pastPayments = project.labourPayments
      .filter(p => p.worker === workerName)
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    const paid = pastPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const due = Math.max(0, earned - paid);

    container.innerHTML = `
      <div class="labour-context-summary">
        <div><span>Earned (this site)</span><strong>${formatAmount(earned)}</strong></div>
        <div><span>Paid so far</span><strong>${formatAmount(paid)}</strong></div>
        <div><span>Outstanding</span><strong style="color:${due > 0 ? "#ad614b" : "var(--green)"}">${formatAmount(due)}</strong></div>
      </div>
      ${pastPayments.length ? `
        <div class="labour-context-history">
          <span class="labour-context-label">Previous payments</span>
          ${pastPayments.map(p => `
            <div class="labour-context-row">
              <span>${formatDateShort(p.date) || "—"}</span>
              <span>${escapeHtml(p.mode) || "—"}</span>
              <strong>${formatAmount(p.amount)}</strong>
            </div>
          `).join("")}
        </div>
      ` : `<p class="crm-muted labour-context-empty">No payments recorded yet for this worker on this site.</p>`}
    `;
  }

  function findLastWorkerDetails(workerName) {
    let allProjects;
    try {
      allProjects = JSON.parse(localStorage.getItem(PROJECTS_KEY)) || [];
    } catch {
      return null;
    }
    const entries = [];
    allProjects.forEach(p => {
      (p.labour || []).forEach(l => {
        if (l.worker === workerName) entries.push(l);
      });
    });
    if (!entries.length) return null;
    entries.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    return entries[0];
  }

  labourWorker.addEventListener("change", () => {
    if (labourWorker.value === "__custom__") {
      const custom = prompt("Enter the worker / contractor name", "");
      if (custom && custom.trim()) {
        addToCustomList("dmnCustomWorkers", custom.trim());
        labourWorker.innerHTML = workerOptionsHtml(custom.trim());
      } else {
        labourWorker.innerHTML = workerOptionsHtml("");
      }
      return;
    }

    const last = findLastWorkerDetails(labourWorker.value);
    if (last) {
      if (!labourRole.value.trim() && last.role) labourRole.value = last.role;
      if (!labourRate.value && last.ratePerDay) labourRate.value = last.ratePerDay;
    }
    renderWorkerPaymentContext(labourWorker.value, "labourInlineWorkerContext");
    renderWorkerContactRow(labourWorker.value, "labourWorkerContactRow", "labourInlineAmount");
  });

  function openNewLabour() {
    editingLabourId = null;
    labourModalTitle.textContent = "Add labour entry";
    deleteLabourBtn.hidden = true;
    labourWorker.innerHTML = workerOptionsHtml("");
    labourRole.value = "";
    labourDate.value = new Date().toISOString().slice(0, 10);
    labourDays.value = "";
    labourRate.value = "";
    labourNotes.value = "";
    labourPaidToday.checked = false;
    labourInlinePaymentFields.classList.add("hidden");
    labourInlineAmount.value = "";
    labourInlinePaymentDate.value = "";
    labourInlineMode.selectedIndex = 0;
    labourInlineScreenshotInput.value = "";
    currentLabourInlineScreenshot = null;
    labourInlineScreenshotPreview.innerHTML = "";
    labourInlineScreenshotPreview.classList.add("hidden");
    document.getElementById("labourWorkerContactRow").classList.add("hidden");
    labourModal.classList.remove("hidden");
  }

  function openEditLabour(id) {
    const l = project.labour.find(x => x.id === id);
    if (!l) return;
    editingLabourId = id;
    labourModalTitle.textContent = "Edit labour entry";
    deleteLabourBtn.hidden = false;
    labourWorker.innerHTML = workerOptionsHtml(l.worker || "");
    labourRole.value = l.role || "";
    labourDate.value = l.date || "";
    labourDays.value = l.days ?? "";
    labourRate.value = l.ratePerDay ?? "";
    labourNotes.value = l.notes || "";
    labourPaidToday.checked = false;
    labourInlinePaymentFields.classList.add("hidden");
    labourInlineAmount.value = "";
    labourInlinePaymentDate.value = "";
    labourInlineMode.selectedIndex = 0;
    labourInlineScreenshotInput.value = "";
    currentLabourInlineScreenshot = null;
    labourInlineScreenshotPreview.innerHTML = "";
    labourInlineScreenshotPreview.classList.add("hidden");
    renderWorkerPaymentContext(l.worker || "", "labourInlineWorkerContext");
    renderWorkerContactRow(l.worker || "", "labourWorkerContactRow", "labourInlineAmount");
    labourModal.classList.remove("hidden");
  }

  function closeLabourModal() {
    labourModal.classList.add("hidden");
  }

  function saveLabour() {
    if (labourWorker.value.trim() === "" || labourWorker.value === "__custom__") {
      alert("Worker / contractor name is required.");
      labourWorker.focus();
      return;
    }

    const record = {
      id: editingLabourId || "LAB" + String(Date.now()).slice(-8),
      worker: labourWorker.value.trim(),
      role: labourRole.value.trim(),
      date: labourDate.value || null,
      days: labourDays.value ? Number(labourDays.value) : null,
      ratePerDay: labourRate.value ? Number(labourRate.value) : null,
      notes: labourNotes.value.trim()
    };

    if (editingLabourId) {
      const idx = project.labour.findIndex(x => x.id === editingLabourId);
      project.labour[idx] = record;
    } else {
      project.labour.push(record);
    }

    if (labourPaidToday.checked) {
      const amount = Number(labourInlineAmount.value);
      if (amount && amount > 0) {
        project.labourPayments.push({
          id: "LABPAY" + String(Date.now()).slice(-8),
          worker: record.worker,
          amount,
          date: labourInlinePaymentDate.value || record.date,
          mode: labourInlineMode.value,
          note: "Logged alongside labour entry",
          screenshot: currentLabourInlineScreenshot
        });
      }
    }

    persistProjects();
    closeLabourModal();
    renderLabour();
    renderLabourPaymentHistory();
    renderBudget();
  }

  function deleteLabour() {
    if (!editingLabourId) return;
    if (!confirm("Delete this labour entry? This cannot be undone.")) return;
    project.labour = project.labour.filter(x => x.id !== editingLabourId);
    persistProjects();
    closeLabourModal();
    renderLabour();
    renderBudget();
  }

  // ---------- Labour payments ----------

  const labourPaymentModal = document.getElementById("labourPaymentModal");
  const labourPayWorker = document.getElementById("labourPayWorker");
  const labourPayAmount = document.getElementById("labourPayAmount");
  const labourPayDate = document.getElementById("labourPayDate");
  const labourPayMode = document.getElementById("labourPayMode");
  const labourPayNote = document.getElementById("labourPayNote");
  const labourPayScreenshotInput = document.getElementById("labourPayScreenshot");
  const labourPayScreenshotPreview = document.getElementById("labourPayScreenshotPreview");
  let currentLabourPayScreenshot = null;

  labourPayScreenshotInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    readAndResizeImage(file, dataUrl => {
      currentLabourPayScreenshot = dataUrl;
      labourPayScreenshotPreview.innerHTML = `<img src="${dataUrl}" alt="Payment screenshot">`;
      labourPayScreenshotPreview.classList.remove("hidden");
    });
  });

  labourPayWorker.addEventListener("change", () => {
    if (labourPayWorker.value === "__custom__") {
      const custom = prompt("Enter the worker / contractor name", "");
      if (custom && custom.trim()) {
        addToCustomList("dmnCustomWorkers", custom.trim());
        labourPayWorker.innerHTML = workerOptionsHtml(custom.trim());
      } else {
        labourPayWorker.innerHTML = workerOptionsHtml("");
      }
    }
    renderWorkerPaymentContext(labourPayWorker.value, "labourPayWorkerContext");
    renderWorkerContactRow(labourPayWorker.value, "labourPayWorkerContactRow", "labourPayAmount");
  });

  function openLabourPaymentModal() {
    labourPayWorker.innerHTML = workerOptionsHtml("");
    document.getElementById("labourPayWorkerContext").innerHTML = "";
    document.getElementById("labourPayWorkerContactRow").classList.add("hidden");
    labourPayAmount.value = "";
    labourPayDate.value = new Date().toISOString().slice(0, 10);
    labourPayMode.selectedIndex = 0;
    labourPayNote.value = "";
    labourPayScreenshotInput.value = "";
    currentLabourPayScreenshot = null;
    labourPayScreenshotPreview.innerHTML = "";
    labourPayScreenshotPreview.classList.add("hidden");
    labourPaymentModal.classList.remove("hidden");
  }

  function closeLabourPaymentModal() {
    labourPaymentModal.classList.add("hidden");
  }

  function saveLabourPayment() {
    if (labourPayWorker.value.trim() === "" || labourPayWorker.value === "__custom__") {
      alert("Select the worker / contractor being paid.");
      return;
    }
    const amount = Number(labourPayAmount.value);
    if (!amount || amount <= 0) {
      alert("Enter a valid payment amount.");
      return;
    }

    project.labourPayments.push({
      id: "LABPAY" + String(Date.now()).slice(-8),
      worker: labourPayWorker.value,
      amount,
      date: labourPayDate.value || null,
      mode: labourPayMode.value,
      note: labourPayNote.value.trim(),
      screenshot: currentLabourPayScreenshot
    });

    persistProjects();
    closeLabourPaymentModal();
    renderWorkerWiseSummary();
    renderLabourPaymentHistory();
    renderBudget();
  }

  document.getElementById("btnRecordLabourPayment").onclick = openLabourPaymentModal;
  document.getElementById("closeLabourPaymentModal").onclick = closeLabourPaymentModal;
  document.getElementById("cancelLabourPaymentModal").onclick = closeLabourPaymentModal;
  document.getElementById("saveLabourPayment").onclick = saveLabourPayment;
  labourPaymentModal.addEventListener("click", (e) => { if (e.target === labourPaymentModal) closeLabourPaymentModal(); });

  // ---------- Events ----------

  document.getElementById("pdBack").onclick = goToProjects;

  document.getElementById("pdMeasureBtn").onclick = () => {
    const params = new URLSearchParams();
    if (project.customerId) params.set("customerId", project.customerId);
    params.set("projectName", project.name);
    if (project.locality) params.set("address", project.locality);

    // Same-tab navigation — on an installed iOS home-screen app, window.open
    // can break out into a separate Safari tab, which iOS treats as a
    // different storage context and loses the localStorage link.
    window.location.href = `estimator/index.html?${params.toString()}`;
  };

  document.getElementById("btnAddPhase").onclick = openNewPhase;
  document.getElementById("closePhaseModal").onclick = closePhaseModal;
  document.getElementById("cancelPhaseModal").onclick = closePhaseModal;
  document.getElementById("savePhase").onclick = savePhase;
  deletePhaseBtn.onclick = deletePhase;
  phaseModal.addEventListener("click", (e) => { if (e.target === phaseModal) closePhaseModal(); });

  document.getElementById("btnAddMaterial").onclick = openNewMaterial;
  document.getElementById("closeMaterialModal").onclick = closeMaterialModal;
  document.getElementById("cancelMaterialModal").onclick = closeMaterialModal;
  document.getElementById("saveMaterial").onclick = saveMaterial;
  deleteMaterialBtn.onclick = deleteMaterial;
  materialModal.addEventListener("click", (e) => { if (e.target === materialModal) closeMaterialModal(); });

  document.getElementById("btnAddLabour").onclick = openNewLabour;
  document.getElementById("closeLabourModal").onclick = closeLabourModal;
  document.getElementById("cancelLabourModal").onclick = closeLabourModal;
  document.getElementById("saveLabour").onclick = saveLabour;
  deleteLabourBtn.onclick = deleteLabour;
  labourModal.addEventListener("click", (e) => { if (e.target === labourModal) closeLabourModal(); });

  // ---------- Startup ----------

  renderHead();
  renderOverview();
  renderBudget();
  renderQuotations();
  renderTimeline();
  renderMaterialOrders();
  renderMaterials();
  renderLabour();
  renderLabourPaymentHistory();

})();
