// ========================================
// Decor My Nest Studio App
// CRM Module
// ========================================

(function () {

  const STORAGE_KEY = "dmnCustomers";

  let customers = [];

  try {
    customers = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    customers = [];
  }

  let editingId = null;
  let currentSearch = "";
  let currentStatusFilter = "";

  // ---------- Elements ----------

  const rowsBody   = document.getElementById("customerRows");
  const cardsWrap  = document.getElementById("customerCards");
  const emptyState = document.getElementById("crmEmpty");
  const countLabel = document.getElementById("crmCount");

  const modal      = document.getElementById("customerModal");
  const modalTitle = document.getElementById("modalTitle");

  const btnAdd       = document.getElementById("btnAddCustomer");
  const btnAddEmpty  = document.getElementById("btnAddCustomerEmpty");
  const btnClose     = document.getElementById("closeModal");
  const btnCancel    = document.getElementById("cancelModal");
  const btnSave      = document.getElementById("saveCustomer");
  const btnDelete    = document.getElementById("deleteCustomer");

  const txtSearch  = document.getElementById("searchCustomer");
  const ddlFilter  = document.getElementById("filterStatus");

  const txtName     = document.getElementById("customerName");
  const txtMobile   = document.getElementById("customerMobile");
  const txtEmail    = document.getElementById("customerEmail");
  const txtLocality = document.getElementById("customerLocality");
  const txtAddress  = document.getElementById("customerAddress");
  const ddlType     = document.getElementById("projectType");
  const ddlSource   = document.getElementById("leadSource");
  const ddlStatus   = document.getElementById("projectStatus");
  const txtBudget   = document.getElementById("projectBudget");
  const txtNotes    = document.getElementById("customerNotes");

  // ---------- Persistence ----------

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
  }

  function generateId() {
    return "CUS" + String(Date.now()).slice(-8);
  }

  // ---------- Modal ----------

  function openNewCustomer() {
    editingId = null;
    modalTitle.textContent = "Add customer";
    btnDelete.hidden = true;
    clearForm();
    modal.classList.remove("hidden");
    txtName.focus();
  }

  function openEditCustomer(id) {
    const c = customers.find(x => x.id === id);
    if (!c) return;

    editingId = id;
    modalTitle.textContent = "Edit customer";
    btnDelete.hidden = false;

    txtName.value     = c.name || "";
    txtMobile.value    = c.mobile || "";
    txtEmail.value     = c.email || "";
    txtLocality.value  = c.locality || "";
    txtAddress.value   = c.address || "";
    ddlType.value       = c.projectType || ddlType.options[0].value;
    ddlSource.value     = c.leadSource || ddlSource.options[0].value;
    ddlStatus.value      = c.status || ddlStatus.options[0].value;
    txtBudget.value    = c.budget || "";
    txtNotes.value     = c.notes || "";

    modal.classList.remove("hidden");
  }

  function closeModal() {
    modal.classList.add("hidden");
  }

  function clearForm() {
    txtName.value = "";
    txtMobile.value = "";
    txtEmail.value = "";
    txtLocality.value = "";
    txtAddress.value = "";
    txtBudget.value = "";
    txtNotes.value = "";
    ddlType.selectedIndex = 0;
    ddlSource.selectedIndex = 0;
    ddlStatus.selectedIndex = 0;
  }

  // ---------- Save / delete ----------

  function saveCustomer() {

    if (txtName.value.trim() === "") {
      alert("Customer name is required.");
      txtName.focus();
      return;
    }

    if (txtMobile.value.trim() === "") {
      alert("Mobile number is required.");
      txtMobile.focus();
      return;
    }

    const now = new Date().toISOString();

    const record = {
      id: editingId || generateId(),
      name: txtName.value.trim(),
      mobile: txtMobile.value.trim(),
      email: txtEmail.value.trim(),
      locality: txtLocality.value.trim(),
      address: txtAddress.value.trim(),
      projectType: ddlType.value,
      leadSource: ddlSource.value,
      status: ddlStatus.value,
      budget: txtBudget.value ? Number(txtBudget.value) : null,
      notes: txtNotes.value.trim(),
      createdAt: editingId ? undefined : now,
      updatedAt: now
    };

    if (editingId) {
      const idx = customers.findIndex(x => x.id === editingId);
      record.createdAt = customers[idx].createdAt || now;
      customers[idx] = record;
    } else {
      customers.unshift(record);
    }

    persist();
    closeModal();
    render();
  }

  function deleteCustomer() {
    if (!editingId) return;

    if (!confirm("Delete this customer? This cannot be undone.")) return;

    customers = customers.filter(x => x.id !== editingId);
    persist();
    closeModal();
    render();
  }

  // ---------- Rendering ----------

  function statusClass(status) {
    return "status-" + status.toLowerCase().replace(/\s+/g, "-");
  }

  function formatBudget(value) {
    if (value === null || value === undefined || value === "") return "—";
    return "₹" + Number(value).toLocaleString("en-IN");
  }

  function getFiltered() {
    return customers.filter(c => {

      const matchesSearch = !currentSearch ||
        (c.name || "").toLowerCase().includes(currentSearch) ||
        (c.mobile || "").toLowerCase().includes(currentSearch) ||
        (c.locality || "").toLowerCase().includes(currentSearch);

      const matchesStatus = !currentStatusFilter || c.status === currentStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }

  function render() {

    const list = getFiltered();

    countLabel.textContent = customers.length === 1
      ? "1 customer"
      : `${customers.length} customers`;

    const showEmpty = customers.length === 0;
    emptyState.classList.toggle("hidden", !showEmpty);

    rowsBody.innerHTML = "";
    cardsWrap.innerHTML = "";

    if (list.length === 0 && !showEmpty) {
      rowsBody.innerHTML = `<tr><td colspan="7" class="crm-no-match">No customers match your search.</td></tr>`;
    }

    list.forEach(c => {

      // Desktop row
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <strong>${escapeHtml(c.name)}</strong>
          ${c.address ? `<div class="crm-muted">${escapeHtml(c.address)}</div>` : ""}
        </td>
        <td>
          <a href="tel:${escapeHtml(c.mobile)}" class="crm-link">${escapeHtml(c.mobile)}</a>
          ${c.email ? `<div class="crm-muted">${escapeHtml(c.email)}</div>` : ""}
        </td>
        <td>${escapeHtml(c.locality) || "—"}</td>
        <td>${escapeHtml(c.projectType)}</td>
        <td>${formatBudget(c.budget)}</td>
        <td><span class="crm-badge ${statusClass(c.status)}">${escapeHtml(c.status)}</span></td>
        <td class="crm-row-actions">
          <button class="crm-icon-btn" data-edit="${c.id}" aria-label="Edit">✎</button>
        </td>
      `;
      rowsBody.appendChild(tr);

      // Mobile card
      const card = document.createElement("div");
      card.className = "crm-card";
      card.innerHTML = `
        <div class="crm-card-head">
          <strong>${escapeHtml(c.name)}</strong>
          <span class="crm-badge ${statusClass(c.status)}">${escapeHtml(c.status)}</span>
        </div>
        <div class="crm-card-row"><a href="tel:${escapeHtml(c.mobile)}" class="crm-link">${escapeHtml(c.mobile)}</a></div>
        <div class="crm-card-row crm-muted">${escapeHtml(c.locality) || "—"} · ${escapeHtml(c.projectType)}</div>
        <div class="crm-card-row crm-muted">Budget: ${formatBudget(c.budget)}</div>
        <button class="crm-btn-ghost crm-card-edit" data-edit="${c.id}">Edit</button>
      `;
      cardsWrap.appendChild(card);
    });

    document.querySelectorAll("[data-edit]").forEach(btn => {
      btn.addEventListener("click", () => openEditCustomer(btn.dataset.edit));
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

  btnAdd.onclick = openNewCustomer;
  btnAddEmpty.onclick = openNewCustomer;
  btnClose.onclick = closeModal;
  btnCancel.onclick = closeModal;
  btnSave.onclick = saveCustomer;
  btnDelete.onclick = deleteCustomer;

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

  // ---------- Startup ----------

  render();

})();
