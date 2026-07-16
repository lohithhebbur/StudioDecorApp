// ========================================
// Decor My Nest Studio App
// Quotations module
// ========================================

(function () {

  const STORAGE_KEY = "dmnQuotations";
  const PROJECTS_KEY = "dmnProjects";
  const CUSTOMERS_KEY = "dmnCustomers";
  const MEASUREMENTS_BY_CUSTOMER_KEY = "dmnMeasurementsByCustomer";
  const ESTIMATOR_STATE_KEY = "coatState"; // shared with the Measurements app — firm/bank details live here

  let quotations = [];
  let projects = [];
  let customers = [];
  let measurementsByCustomer = {};

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

  try {
    measurementsByCustomer = JSON.parse(localStorage.getItem(MEASUREMENTS_BY_CUSTOMER_KEY)) || {};
  } catch {
    measurementsByCustomer = {};
  }

  let editingId = null;
  let currentRoomsSummary = null;
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

  // Auto-fills the scope/amount/notes from whatever was last measured for
  // this customer — but only into blank fields, so it never overwrites
  // something already typed (e.g. while editing an existing quotation).
  function applyMeasurementForCustomer(customerId) {
    const snapshot = measurementsByCustomer[customerId];
    if (!snapshot) return;
    if (txtScope.value.trim() === "") {
      txtScope.value = snapshot.projectName ? `${snapshot.projectName} — site estimate` : "";
    }
    if (txtSubtotal.value === "" && snapshot.subtotal) {
      txtSubtotal.value = snapshot.subtotal;
      txtDiscount.value = snapshot.discountPercent ?? 0;
      txtGst.value = snapshot.gstPercent ?? 18;
    }
    if (txtNotes.value.trim() === "") {
      txtNotes.value = buildScopeNotes(snapshot);
      currentRoomsSummary = snapshot.roomsSummary || null;
    }
    updatePreview();
  }

  ddlCustomer.addEventListener("change", () => {
    if (ddlCustomer.value) applyMeasurementForCustomer(ddlCustomer.value);
  });

  // Picking a project auto-selects its linked customer, for clarity —
  // but the customer field stays independently editable (e.g. to quote a
  // customer directly, with no project on file yet).
  ddlProject.addEventListener("change", () => {
    const linkedProject = projects.find(p => p.id === ddlProject.value);
    if (linkedProject && linkedProject.customerId) {
      ddlCustomer.value = linkedProject.customerId;
      applyMeasurementForCustomer(linkedProject.customerId);
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
    currentRoomsSummary = q.roomsSummary || null;

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
    currentRoomsSummary = null;
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
      customerEmail: resolvedCustomer ? (resolvedCustomer.email || "") : "",
      customerAddress: resolvedCustomer ? (resolvedCustomer.address || "") : "",
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
      roomsSummary: currentRoomsSummary,
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
        scanner: (state && state.scanner) || {},
        terms: (state && state.terms) || ""
      };
    } catch {
      return { firm: {}, payment: {}, scanner: {}, terms: "" };
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

    const { firm, payment, scanner, terms } = readFirmDetails();

    const firmDetailRows = [
      [firm.phone, `<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z"/>`],
      [firm.email, `<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/>`],
      [firm.address, `<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>`]
    ];
    const firmDetails = firmDetailRows
      .filter(([value]) => value)
      .map(([value, icon]) => `<div><svg viewBox="0 0 24 24">${icon}</svg><span>${escapeHtml(value)}</span></div>`)
      .join("");

    const customerDetailRows = [
      [q.customerMobile, `<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z"/>`],
      [q.customerEmail, `<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/>`],
      [q.customerAddress || q.locality, `<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>`]
    ];
    const customerDetails = customerDetailRows
      .filter(([value]) => value)
      .map(([value, icon]) => `<div><svg viewBox="0 0 24 24">${icon}</svg><span>${escapeHtml(value)}</span></div>`)
      .join("");

    const reportLogo = firm.logo
      ? `<img class="report-logo" src="${firm.logo}" alt="${escapeHtml(firm.name || "Decor My Nest")} logo">`
      : "";

    const hasLineItems = Array.isArray(q.roomsSummary) && q.roomsSummary.length > 0;

    const itemRows = hasLineItems ? q.roomsSummary.map((item, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(item.lineName || item.roomName)}</td>
        <td>${escapeHtml(item.substrate || "—")}</td>
        <td>${escapeHtml(item.product || "—")}</td>
        <td>${escapeHtml(item.paintingType || "—")}</td>
        <td>${Math.round(item.areaSqFt)} sq ft</td>
        <td>${formatAmount(item.rate)}</td>
        <td>${formatAmount(item.total)}</td>
      </tr>
    `).join("") : "";

    const itemsTable = hasLineItems ? `
      <div class="report-table-wrap">
        <table class="report-table">
          <thead>
            <tr>
              <th>S.No.</th><th>AREA / WORK</th><th>SURFACE</th><th>PRODUCT</th>
              <th>PAINTING TYPE</th><th>NET AREA</th><th>RATE</th><th>TOTAL</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>
      </div>
    ` : `<p style="margin:20px 0;font-size:13px;"><strong>Scope:</strong> ${escapeHtml(q.scope)}</p>`;

    const paymentRows = [
      ["Account holder", payment.accountName], ["Bank", payment.bankName],
      ["Account number", payment.accountNumber], ["IFSC", payment.ifsc],
      ["Branch", payment.branch], ["UPI ID", payment.upi]
    ].filter(([, value]) => value).map(([label, value]) => `<div><span>${label}</span><strong>${escapeHtml(value)}</strong></div>`).join("");

    const paymentSection = (paymentRows || scanner.image) ? `
      <div class="report-payment">
        <div><h3>Payment details</h3>${paymentRows}</div>
        ${scanner.image ? `<div class="report-scanner"><img src="${scanner.image}" alt="Payment QR code"><small>${escapeHtml(scanner.note || "")}</small></div>` : ""}
      </div>
    ` : "";

    const termsSection = terms.trim() ? `<div class="report-terms"><h3>Terms &amp; Conditions</h3><p>${escapeHtml(terms)}</p></div>` : "";

    document.getElementById("quoPrintContent").innerHTML = `
      <div class="report-company">
        ${reportLogo}
        <div>
          <div class="report-brand">${escapeHtml(firm.name || "Decor My Nest")}</div>
          <div class="report-firm-tagline">${escapeHtml(firm.tagline || "")}</div>
          ${firmDetails ? `<div class="report-firm-details">${firmDetails}</div>` : ""}
        </div>
      </div>

      <div class="report-title">${escapeHtml(q.scope)}</div>
      <div class="report-meta">
        Quotation No. ${escapeHtml(q.quotationNumber)} · Date: ${formatDate(q.issueDate)} · Valid until: ${formatDate(q.validUntil)}
      </div>
      ${q.customerName ? `
        <div class="report-customer">
          <strong>${escapeHtml(q.customerName)}</strong>
          ${customerDetails ? `<div class="report-firm-details">${customerDetails}</div>` : ""}
        </div>
      ` : ""}

      ${itemsTable}

      <div class="report-pricing" style="margin-top:30px;padding-top:16px;border-top:2px solid var(--line);">
        <div><span>Subtotal</span><strong>${formatAmount(q.subtotal)}</strong></div>
        <div><span>Discount (${q.discountPercent}%)</span><strong>− ${formatAmount(Math.round(q.subtotal * q.discountPercent / 100))}</strong></div>
        <div><span>GST (${q.gstPercent}%)</span><strong>+ ${formatAmount(Math.round((q.subtotal - q.subtotal * q.discountPercent / 100) * q.gstPercent / 100))}</strong></div>
      </div>
      <div class="report-total"><span>Final quoted value</span><strong>${formatAmount(q.finalAmount)}</strong></div>

      ${hasLineItems && q.notes ? `<div class="report-terms"><h3>Notes</h3><p>${escapeHtml(q.notes)}</p></div>` : (!hasLineItems && q.notes ? `<div class="report-terms"><h3>Notes</h3><p>${escapeHtml(q.notes)}</p></div>` : "")}

      ${paymentSection}
      ${termsSection}

      <p class="report-disclaimer">This is a preliminary quotation. Final pricing may vary after site inspection, product selection, scope confirmation, and actual site conditions.</p>
    `;

    document.getElementById("quoPrintDialog").dataset.currentQuoNumber = q.quotationNumber || "Quotation";
    document.getElementById("quoPrintDialog").showModal();
  }

  document.getElementById("quoPrintClose").onclick = () => document.getElementById("quoPrintDialog").close();
  document.getElementById("quoPrintButton").onclick = () => window.print();

  document.getElementById("quoSavePdfButton").onclick = async () => {
    const button = document.getElementById("quoSavePdfButton");
    const originalLabel = button.textContent;
    button.textContent = "Generating PDF…";
    button.disabled = true;

    try {
      const source = document.getElementById("quoPrintContent");
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

      const currentQuoNumber = document.getElementById("quoPrintDialog").dataset.currentQuoNumber || "Quotation";
      pdf.save(`${currentQuoNumber.replace(/[^a-z0-9]+/gi, "-")}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Couldn't generate PDF — try 'Print instead'");
    } finally {
      button.textContent = originalLabel;
      button.disabled = false;
    }
  };

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
    currentRoomsSummary = draft.roomsSummary || null;
    updatePreview();
  }

  // ---------- Startup ----------

  render();
  importMeasurementDraft();

})();
