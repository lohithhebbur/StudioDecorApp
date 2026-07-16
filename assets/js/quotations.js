// ========================================
// Decor My Nest Studio App
// Quotations module
// ========================================

(function () {

  const STORAGE_KEY = "dmnQuotations";
  const PROJECTS_KEY = "dmnProjects";
  const CUSTOMERS_KEY = "dmnCustomers";
  const ESTIMATOR_STATE_KEY = "coatState"; // shared with the Measurements app — firm/bank details live here

  let quotations = [];
  let projects = [];
  let customers = [];

  try {
    quotations = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    quotations = [];
  }

  try {
    projects = JSON.parse(localStorage.getItem(PROJECTS_KEY)) || [];
  } catch {
    projects = [];
  }

  try {
    customers = JSON.parse(localStorage.getItem(CUSTOMERS_KEY)) || [];
  } catch {
    customers = [];
  }

  let editingId = null;
  let currentSearch = "";
  let currentStatusFilter = "";

  // ---------- Elements ----------

  const rowsBody   = document.getElementById("quotationRows");
  const cardsWrap  = document.getElementById("quotationCards");
  const emptyState = document.getElementById("quoEmpty");
  const countLabel = document.getElementById("quoCount");

  const modal      = document.getElementById("quotationModal");
  const modalTitle = document.getElementById("quoModalTitle");

  const btnAdd      = document.getElementById("btnAddQuotation");
  const btnAddEmpty = document.getElementById("btnAddQuotationEmpty");
  const btnClose    = document.getElementById("closeQuotationModal");
  const btnCancel   = document.getElementById("cancelQuotationModal");
  const btnSave     = document.getElementById("saveQuotation");
  const btnDelete   = document.getElementById("deleteQuotation");

  const txtSearch = document.getElementById("searchQuotation");
  const ddlFilter = document.getElementById("filterQuoStatus");

  const ddlProject   = document.getElementById("quoProject");
  const ddlCustomer  = document.getElementById("quoCustomer");
  const txtScope     = document.getElementById("quoScope");
  const txtSubtotal  = document.getElementById("quoSubtotal");
  const txtDiscount  = document.getElementById("quoDiscount");
  const txtGst       = document.getElementById("quoGst");
  const ddlStatus    = document.getElementById("quoStatus");
  const txtIssue     = document.getElementById("quoIssueDate");
  const txtValid     = document.getElementById("quoValidUntil");
  const txtNotes     = document.getElementById("quoNotes");
  const finalPreview = document.getElementById("quoFinalPreview");

  // ---------- Setup ----------

  function populateProjectOptions() {
    ddlProject.innerHTML = '<option value="">— No project linked —</option>';
    projects.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = p.customerName ? `${p.name} — ${p.customerName}` : p.name;
      ddlProject.appendChild(opt);
    });
  }

  function populateCustomerOptions() {
    ddlCustomer.innerHTML = '<option value="">— No customer linked —</option>';
    customers.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = `${c.name} — ${c.mobile}`;
      ddlCustomer.appendChild(opt);
    });
  }

  populateProjectOptions();
  populateCustomerOptions();

  // Picking a project auto-selects its linked customer, for clarity —
  // but the customer field stays independently editable (e.g. to quote a
  // customer directly, with no project on file yet).
  ddlProject.addEventListener("change", () => {
    const linkedProject = projects.find(p => p.id === ddlProject.value);
    if (linkedProject && linkedProject.customerId) {
      ddlCustomer.value = linkedProject.customerId;
    }
  });

  // ---------- Persistence ----------

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(quotations));
  }

  function generateId() {
    return "QUOID" + String(Date.now()).slice(-8);
  }

  function generateQuotationNumber(issueDateValue) {
    const year = issueDateValue ? new Date(issueDateValue).getFullYear() : new Date().getFullYear();
    const countThisYear = quotations.filter(q => (q.quotationNumber || "").includes(`/${year}/`)).length;
    const seq = String(countThisYear + 1).padStart(3, "0");
    return `DMN/${year}/${seq}`;
  }

  // ---------- Amount calc ----------

  function computeFinal(subtotal, discountPct, gstPct) {
    const s = Number(subtotal) || 0;
    const d = Number(discountPct) || 0;
    const g = Number(gstPct) || 0;
    const afterDiscount = s - (s * d / 100);
    const final = afterDiscount + (afterDiscount * g / 100);
    return Math.round(final);
  }

  function updatePreview() {
    const final = computeFinal(txtSubtotal.value, txtDiscount.value, txtGst.value);
    finalPreview.textContent = "₹" + final.toLocaleString("en-IN");
  }

  [txtSubtotal, txtDiscount, txtGst].forEach(el => el.addEventListener("input", updatePreview));

  // ---------- Modal ----------

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function openNewQuotation() {
    editingId = null;
    modalTitle.textContent = "New quotation";
    btnDelete.hidden = true;
    clearForm();
    txtIssue.value = todayISO();
    updatePreview();
    modal.classList.remove("hidden");
    txtScope.focus();
  }

  function openEditQuotation(id) {
    const q = quotations.find(x => x.id === id);
    if (!q) return;

    editingId = id;
    modalTitle.textContent = `Edit ${q.quotationNumber}`;
    btnDelete.hidden = false;

    ddlProject.value  = q.projectId || "";
    ddlCustomer.value = q.customerId || "";
    txtScope.value    = q.scope || "";
    txtSubtotal.value = q.subtotal ?? "";
    txtDiscount.value = q.discountPercent ?? 0;
    txtGst.value      = q.gstPercent ?? 18;
    ddlStatus.value    = q.status || ddlStatus.options[0].value;
    txtIssue.value    = q.issueDate || todayISO();
    txtValid.value    = q.validUntil || "";
    txtNotes.value    = q.notes || "";

    updatePreview();
    modal.classList.remove("hidden");
  }

  function closeModal() {
    modal.classList.add("hidden");
  }

  function clearForm() {
    ddlProject.value = "";
    ddlCustomer.value = "";
    txtScope.value = "";
    txtSubtotal.value = "";
    txtDiscount.value = 0;
    txtGst.value = 18;
    txtValid.value = "";
    txtNotes.value = "";
    ddlStatus.selectedIndex = 0;
  }

  // ---------- Save / delete ----------

  function saveQuotation() {

    if (txtScope.value.trim() === "") {
      alert("Scope / title is required.");
      txtScope.focus();
      return;
    }

    if (txtSubtotal.value === "" || Number(txtSubtotal.value) <= 0) {
      alert("Enter a subtotal amount.");
      txtSubtotal.focus();
      return;
    }

    const now = new Date().toISOString();
    const linkedProject = projects.find(p => p.id === ddlProject.value);
    const directCustomer = customers.find(c => c.id === ddlCustomer.value);

    // A project's own customer link takes priority (it's the more specific
    // record); otherwise fall back to whatever customer was picked directly.
    const resolvedCustomer = (linkedProject && linkedProject.customerId)
      ? customers.find(c => c.id === linkedProject.customerId) || directCustomer
      : directCustomer;

    const subtotal = Number(txtSubtotal.value);
    const discountPercent = Number(txtDiscount.value) || 0;
    const gstPercent = Number(txtGst.value) || 0;
    const finalAmount = computeFinal(subtotal, discountPercent, gstPercent);

    const record = {
      id: editingId || generateId(),
      quotationNumber: editingId
        ? quotations.find(x => x.id === editingId).quotationNumber
        : generateQuotationNumber(txtIssue.value),
      projectId: ddlProject.value || null,
      projectName: linkedProject ? linkedProject.name : "",
      customerId: resolvedCustomer ? resolvedCustomer.id : null,
      customerName: resolvedCustomer ? resolvedCustomer.name : (linkedProject ? linkedProject.customerName : ""),
      customerMobile: resolvedCustomer ? resolvedCustomer.mobile : (linkedProject ? linkedProject.customerMobile : ""),
      locality: resolvedCustomer ? (resolvedCustomer.locality || "") : (linkedProject ? linkedProject.locality : ""),
      scope: txtScope.value.trim(),
      subtotal,
      discountPercent,
      gstPercent,
      finalAmount,
      status: ddlStatus.value,
      issueDate: txtIssue.value || todayISO(),
      validUntil: txtValid.value || null,
      notes: txtNotes.value.trim(),
      createdAt: editingId ? undefined : now,
      updatedAt: now
    };

    if (editingId) {
      const idx = quotations.findIndex(x => x.id === editingId);
      record.createdAt = quotations[idx].createdAt || now;
      quotations[idx] = record;
    } else {
      quotations.unshift(record);
    }

    persist();
    closeModal();
    render();
  }

  function deleteQuotation() {
    if (!editingId) return;

    if (!confirm("Delete this quotation? This cannot be undone.")) return;

    quotations = quotations.filter(x => x.id !== editingId);
    persist();
    closeModal();
    render();
  }

  // ---------- Print ----------

  function readFirmDetails() {
    try {
      const state = JSON.parse(localStorage.getItem(ESTIMATOR_STATE_KEY));
      return {
        firm: (state && state.firm) || {},
        payment: (state && state.payment) || {},
        terms: (state && state.terms) || ""
      };
    } catch {
      return { firm: {}, payment: {}, terms: "" };
    }
  }

  function formatAmount(value) {
    if (value === null || value === undefined || value === "") return "—";
    return "₹" + Number(value).toLocaleString("en-IN");
  }

  function formatDate(value) {
    if (!value) return "—";
    const d = new Date(value);
    if (isNaN(d)) return "—";
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  function printQuotation(id) {
    const q = quotations.find(x => x.id === id);
    if (!q) return;

    const { firm, payment, terms } = readFirmDetails();

    const win = window.open("", "_blank");
    if (!win) {
      alert("Please allow pop-ups to print this quotation.");
      return;
    }

    win.document.write(`
      <!doctype html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${escapeHtml(q.quotationNumber)} — ${escapeHtml(firm.name || "Decor My Nest")}</title>
        <style>
          body { font-family: Arial, Helvetica, sans-serif; color: #19251e; padding: 32px; max-width: 760px; margin: auto; }
          h1 { font-size: 20px; margin: 0 0 2px; }
          .tagline { color: #6e756f; font-size: 12px; margin: 0 0 20px; }
          .meta { display: flex; justify-content: space-between; margin: 18px 0; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; margin: 18px 0; }
          td, th { padding: 8px 10px; border: 1px solid #d7d0c3; font-size: 13px; text-align: left; }
          .totals td { text-align: right; }
          .totals .label { text-align: left; color: #6e756f; }
          .final-row td { font-weight: bold; font-size: 15px; border-top: 2px solid #19251e; }
          .notes-block { margin-top: 16px; font-size: 12px; white-space: pre-wrap; }
          .terms { margin-top: 24px; font-size: 12px; white-space: pre-wrap; color: #444; }
          .bank { margin-top: 18px; font-size: 12px; }
          @media print { body { padding: 0 24px; } }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(firm.name || "Decor My Nest")}</h1>
        <p class="tagline">${escapeHtml(firm.tagline || "")}</p>

        <div class="meta">
          <div>
            <strong>Quotation No.</strong> ${escapeHtml(q.quotationNumber)}<br>
            <strong>Date:</strong> ${formatDate(q.issueDate)}<br>
            <strong>Valid until:</strong> ${formatDate(q.validUntil)}
          </div>
          <div>
            ${q.customerName ? `<strong>${escapeHtml(q.customerName)}</strong><br>` : ""}
            ${q.customerMobile ? `${escapeHtml(q.customerMobile)}<br>` : ""}
            ${q.locality ? escapeHtml(q.locality) : ""}
          </div>
        </div>

        <p><strong>Scope:</strong> ${escapeHtml(q.scope)}</p>

        <table class="totals">
          <tr><td class="label">Subtotal</td><td>${formatAmount(q.subtotal)}</td></tr>
          <tr><td class="label">Discount (${q.discountPercent}%)</td><td>− ${formatAmount(Math.round(q.subtotal * q.discountPercent / 100))}</td></tr>
          <tr><td class="label">GST (${q.gstPercent}%)</td><td>+ ${formatAmount(Math.round((q.subtotal - q.subtotal * q.discountPercent / 100) * q.gstPercent / 100))}</td></tr>
          <tr class="final-row"><td class="label">Final amount</td><td>${formatAmount(q.finalAmount)}</td></tr>
        </table>

        ${q.notes ? `<div class="notes-block"><strong>Notes:</strong>\n${escapeHtml(q.notes)}</div>` : ""}

        ${(payment && (payment.upi || payment.accountNumber)) ? `
          <div class="bank">
            <strong>Payment details</strong><br>
            ${payment.accountName ? `Account: ${escapeHtml(payment.accountName)}<br>` : ""}
            ${payment.bankName ? `Bank: ${escapeHtml(payment.bankName)}<br>` : ""}
            ${payment.accountNumber ? `A/C No.: ${escapeHtml(payment.accountNumber)}<br>` : ""}
            ${payment.ifsc ? `IFSC: ${escapeHtml(payment.ifsc)}<br>` : ""}
            ${payment.upi ? `UPI: ${escapeHtml(payment.upi)}<br>` : ""}
          </div>
        ` : ""}

        ${terms ? `<div class="terms"><strong>Terms &amp; Conditions</strong>\n${escapeHtml(terms)}</div>` : ""}

        <p style="margin-top:24px;font-size:11px;color:#888;">This is a preliminary quotation. Final pricing may vary after site inspection and scope confirmation.</p>
      </body>
      </html>
    `);

    win.document.close();
    win.focus();
    win.print();
  }

  // ---------- Rendering ----------

  function statusClass(status) {
    return "status-" + status.toLowerCase();
  }

  function getFiltered() {
    return quotations.filter(q => {

      const matchesSearch = !currentSearch ||
        (q.quotationNumber || "").toLowerCase().includes(currentSearch) ||
        (q.projectName || "").toLowerCase().includes(currentSearch) ||
        (q.customerName || "").toLowerCase().includes(currentSearch);

      const matchesStatus = !currentStatusFilter || q.status === currentStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }

  function render() {

    const list = getFiltered();

    countLabel.textContent = quotations.length === 1
      ? "1 quotation"
      : `${quotations.length} quotations`;

    const showEmpty = quotations.length === 0;
    emptyState.classList.toggle("hidden", !showEmpty);

    rowsBody.innerHTML = "";
    cardsWrap.innerHTML = "";

    if (list.length === 0 && !showEmpty) {
      rowsBody.innerHTML = `<tr><td colspan="7" class="crm-no-match">No quotations match your search.</td></tr>`;
    }

    list.forEach(q => {

      const customerCell = q.customerName
        ? `<a href="tel:${escapeHtml(q.customerMobile)}" class="crm-link">${escapeHtml(q.customerName)}</a>`
        : `<span class="crm-muted">Not linked</span>`;

      // Desktop row
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${escapeHtml(q.quotationNumber)}</strong></td>
        <td>${customerCell}</td>
        <td>${escapeHtml(q.scope)}</td>
        <td>${formatAmount(q.finalAmount)}</td>
        <td>${formatDate(q.validUntil)}</td>
        <td><span class="crm-badge ${statusClass(q.status)}">${escapeHtml(q.status)}</span></td>
        <td class="crm-row-actions">
          <button class="crm-icon-btn" data-print="${q.id}" aria-label="Print" title="Print">🖨</button>
          <button class="crm-icon-btn" data-edit="${q.id}" aria-label="Edit">✎</button>
        </td>
      `;
      rowsBody.appendChild(tr);

      // Mobile card
      const card = document.createElement("div");
      card.className = "crm-card";
      card.innerHTML = `
        <div class="crm-card-head">
          <strong>${escapeHtml(q.quotationNumber)}</strong>
          <span class="crm-badge ${statusClass(q.status)}">${escapeHtml(q.status)}</span>
        </div>
        <div class="crm-card-row">${customerCell}</div>
        <div class="crm-card-row crm-muted">${escapeHtml(q.scope)}</div>
        <div class="crm-card-row crm-muted">Final: ${formatAmount(q.finalAmount)} · Valid till ${formatDate(q.validUntil)}</div>
        <div class="quo-card-actions">
          <button class="crm-btn-ghost" data-print="${q.id}">Print</button>
          <button class="crm-btn-ghost crm-card-edit" data-edit="${q.id}">Edit</button>
        </div>
      `;
      cardsWrap.appendChild(card);
    });

    document.querySelectorAll("[data-edit]").forEach(btn => {
      btn.addEventListener("click", () => openEditQuotation(btn.dataset.edit));
    });

    document.querySelectorAll("[data-print]").forEach(btn => {
      btn.addEventListener("click", () => printQuotation(btn.dataset.print));
    });
  }

  function escapeHtml(str) {
    if (str === undefined || str === null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ---------- Events ----------

  btnAdd.onclick = openNewQuotation;
  btnAddEmpty.onclick = openNewQuotation;
  btnClose.onclick = closeModal;
  btnCancel.onclick = closeModal;
  btnSave.onclick = saveQuotation;
  btnDelete.onclick = deleteQuotation;

  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  txtSearch.addEventListener("input", () => {
    currentSearch = txtSearch.value.trim().toLowerCase();
    render();
  });

  ddlFilter.addEventListener("change", () => {
    currentStatusFilter = ddlFilter.value;
    render();
  });

  // ---------- Import from Measurements ----------

  function buildScopeNotes(draft) {
    const lines = [];

    if (Array.isArray(draft.roomsSummary) && draft.roomsSummary.length) {
      lines.push("Scope of work (from Measurements):");
      let currentRoom = null;

      draft.roomsSummary.forEach(item => {
        if (item.roomName !== currentRoom) {
          currentRoom = item.roomName;
          lines.push(`\n${currentRoom}:`);
        }
        const label = item.lineName ? `  • ${item.lineName}` : "  • Walls";
        const details = [item.substrate, item.product, item.paintingType].filter(Boolean).join(", ");
        const money = v => "₹" + Math.round(v).toLocaleString("en-IN");
        lines.push(`${label}${details ? ` (${details})` : ""}: ${Math.round(item.areaSqFt)} sq ft × ${money(item.rate)}/sqft = ${money(item.total)}`);
        if (item.notes) lines.push(`    Note: ${item.notes}`);
      });

      lines.push(`\nTotal measured area: ${Math.round(draft.netAreaSqFt || 0)} sq ft`);
    } else if (draft.netAreaSqFt) {
      lines.push(`Pulled from Measurements: ${draft.projectName || "site estimate"} — ${Math.round(draft.netAreaSqFt)} sq ft.`);
    }

    if (!draft.customerId) {
      lines.push("\nPick the matching customer/project above if one exists yet.");
    }

    return lines.join("\n");
  }

  function importMeasurementDraft() {
    let draft;
    try {
      draft = JSON.parse(localStorage.getItem("dmnQuotationDraft"));
    } catch {
      draft = null;
    }
    if (!draft) return;

    localStorage.removeItem("dmnQuotationDraft");

    openNewQuotation();
    modalTitle.textContent = "New quotation — from Measurements";
    txtScope.value = draft.projectName ? `${draft.projectName} — site estimate` : "";
    txtSubtotal.value = draft.subtotal || "";
    txtDiscount.value = draft.discountPercent ?? 0;
    txtGst.value = draft.gstPercent ?? 18;

    if (draft.customerId && customers.some(c => c.id === draft.customerId)) {
      ddlCustomer.value = draft.customerId;
    }

    txtNotes.value = buildScopeNotes(draft);
    updatePreview();
  }

  // ---------- Startup ----------

  render();
  importMeasurementDraft();

})();
