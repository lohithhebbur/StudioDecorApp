// ========================================
// Decor My Nest Studio App
// Projects module
// ========================================

(function () {

  const STORAGE_KEY = "dmnProjects";
  const CUSTOMERS_KEY = "dmnCustomers";

  let projects = [];
  let customers = [];

  try {
    projects = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
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

  const rowsBody   = document.getElementById("projectRows");
  const cardsWrap  = document.getElementById("projectCards");
  const emptyState = document.getElementById("prjEmpty");
  const countLabel = document.getElementById("prjCount");

  const modal      = document.getElementById("projectModal");
  const modalTitle = document.getElementById("prjModalTitle");

  const btnAdd      = document.getElementById("btnAddProject");
  const btnAddEmpty = document.getElementById("btnAddProjectEmpty");
  const btnClose    = document.getElementById("closeProjectModal");
  const btnCancel   = document.getElementById("cancelProjectModal");
  const btnSave     = document.getElementById("saveProject");
  const btnDelete   = document.getElementById("deleteProject");

  const txtSearch = document.getElementById("searchProject");
  const ddlFilter = document.getElementById("filterProjectStatus");

  const txtName      = document.getElementById("projectName");
  const ddlCustomer   = document.getElementById("projectCustomer");
  const txtLocality  = document.getElementById("projectLocality");
  const txtAddress   = document.getElementById("projectAddress");
  const ddlType       = document.getElementById("projectTypeSelect");
  const ddlStatus     = document.getElementById("projectStatusSelect");
  const txtStart     = document.getElementById("projectStartDate");
  const txtEnd       = document.getElementById("projectEndDate");
  const txtEstimate  = document.getElementById("projectEstimateAmount");
  const txtNotes     = document.getElementById("projectNotes");

  // ---------- Setup ----------

  function populateCustomerOptions() {
    ddlCustomer.innerHTML = '<option value="">— No customer linked —</option>';
    customers.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = `${c.name} — ${c.mobile}`;
      ddlCustomer.appendChild(opt);
    });
  }

  populateCustomerOptions();

  // ---------- Persistence ----------

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }

  function generateId() {
    return "PRJ" + String(Date.now()).slice(-8);
  }

  // ---------- Modal ----------

  function openNewProject() {
    editingId = null;
    modalTitle.textContent = "Add project";
    btnDelete.hidden = true;
    clearForm();
    modal.classList.remove("hidden");
    txtName.focus();
  }

  function openEditProject(id) {
    const p = projects.find(x => x.id === id);
    if (!p) return;

    editingId = id;
    modalTitle.textContent = "Edit project";
    btnDelete.hidden = false;

    txtName.value     = p.name || "";
    ddlCustomer.value  = p.customerId || "";
    txtLocality.value = p.locality || "";
    txtAddress.value  = p.address || "";
    ddlType.value      = p.projectType || ddlType.options[0].value;
    ddlStatus.value     = p.status || ddlStatus.options[0].value;
    txtStart.value    = p.startDate || "";
    txtEnd.value      = p.targetEndDate || "";
    txtEstimate.value = p.estimateAmount || "";
    txtNotes.value    = p.notes || "";

    modal.classList.remove("hidden");
  }

  function closeModal() {
    modal.classList.add("hidden");
  }

  function clearForm() {
    txtName.value = "";
    ddlCustomer.value = "";
    txtLocality.value = "";
    txtAddress.value = "";
    txtStart.value = "";
    txtEnd.value = "";
    txtEstimate.value = "";
    txtNotes.value = "";
    ddlType.selectedIndex = 0;
    ddlStatus.selectedIndex = 0;
  }

  // ---------- Save / delete ----------

  function saveProject() {

    if (txtName.value.trim() === "") {
      alert("Project name is required.");
      txtName.focus();
      return;
    }

    const now = new Date().toISOString();
    const linkedCustomer = customers.find(c => c.id === ddlCustomer.value);

    const record = {
      id: editingId || generateId(),
      name: txtName.value.trim(),
      customerId: ddlCustomer.value || null,
      customerName: linkedCustomer ? linkedCustomer.name : "",
      customerMobile: linkedCustomer ? linkedCustomer.mobile : "",
      locality: txtLocality.value.trim(),
      address: txtAddress.value.trim(),
      projectType: ddlType.value,
      status: ddlStatus.value,
      startDate: txtStart.value || null,
      targetEndDate: txtEnd.value || null,
      estimateAmount: txtEstimate.value ? Number(txtEstimate.value) : null,
      notes: txtNotes.value.trim(),
      createdAt: editingId ? undefined : now,
      updatedAt: now
    };

    if (editingId) {
      const idx = projects.findIndex(x => x.id === editingId);
      record.createdAt = projects[idx].createdAt || now;
      projects[idx] = record;
    } else {
      projects.unshift(record);
    }

    persist();
    closeModal();
    render();
  }

  function deleteProject() {
    if (!editingId) return;

    if (!confirm("Delete this project? This cannot be undone.")) return;

    projects = projects.filter(x => x.id !== editingId);
    persist();
    closeModal();
    render();
  }

  // ---------- Rendering ----------

  function statusClass(status) {
    return "status-" + status.toLowerCase().replace(/\s+/g, "-");
  }

  function formatAmount(value) {
    if (value === null || value === undefined || value === "") return "—";
    return "₹" + Number(value).toLocaleString("en-IN");
  }

  function formatDate(value) {
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d)) return "";
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  function formatTimeline(p) {
    const start = formatDate(p.startDate);
    const end = formatDate(p.targetEndDate);
    if (!start && !end) return "—";
    if (start && end) return `${start} → ${end}`;
    return start || end;
  }

  function getFiltered() {
    return projects.filter(p => {

      const matchesSearch = !currentSearch ||
        (p.name || "").toLowerCase().includes(currentSearch) ||
        (p.customerName || "").toLowerCase().includes(currentSearch) ||
        (p.locality || "").toLowerCase().includes(currentSearch);

      const matchesStatus = !currentStatusFilter || p.status === currentStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }

  function render() {

    const list = getFiltered();

    countLabel.textContent = projects.length === 1
      ? "1 project"
      : `${projects.length} projects`;

    const showEmpty = projects.length === 0;
    emptyState.classList.toggle("hidden", !showEmpty);

    rowsBody.innerHTML = "";
    cardsWrap.innerHTML = "";

    if (list.length === 0 && !showEmpty) {
      rowsBody.innerHTML = `<tr><td colspan="7" class="crm-no-match">No projects match your search.</td></tr>`;
    }

    list.forEach(p => {

      const customerCell = p.customerName
        ? `<a href="tel:${escapeHtml(p.customerMobile)}" class="crm-link">${escapeHtml(p.customerName)}</a>`
        : `<span class="crm-muted">Not linked</span>`;

      // Desktop row
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <strong>${escapeHtml(p.name)}</strong>
          ${p.locality ? `<div class="crm-muted">${escapeHtml(p.locality)}</div>` : ""}
        </td>
        <td>${customerCell}</td>
        <td>${escapeHtml(p.projectType)}</td>
        <td>${formatTimeline(p)}</td>
        <td>${formatAmount(p.estimateAmount)}</td>
        <td><span class="crm-badge ${statusClass(p.status)}">${escapeHtml(p.status)}</span></td>
        <td class="crm-row-actions">
          <button class="crm-icon-btn" data-edit="${p.id}" aria-label="Edit">✎</button>
        </td>
      `;
      rowsBody.appendChild(tr);

      // Mobile card
      const card = document.createElement("div");
      card.className = "crm-card";
      card.innerHTML = `
        <div class="crm-card-head">
          <strong>${escapeHtml(p.name)}</strong>
          <span class="crm-badge ${statusClass(p.status)}">${escapeHtml(p.status)}</span>
        </div>
        <div class="crm-card-row">${customerCell}</div>
        <div class="crm-card-row crm-muted">${escapeHtml(p.locality) || "—"} · ${escapeHtml(p.projectType)}</div>
        <div class="crm-card-row crm-muted">${formatTimeline(p)}</div>
        <div class="crm-card-row crm-muted">Estimate: ${formatAmount(p.estimateAmount)}</div>
        <button class="crm-btn-ghost crm-card-edit" data-edit="${p.id}">Edit</button>
      `;
      cardsWrap.appendChild(card);
    });

    document.querySelectorAll("[data-edit]").forEach(btn => {
      btn.addEventListener("click", () => openEditProject(btn.dataset.edit));
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

  btnAdd.onclick = openNewProject;
  btnAddEmpty.onclick = openNewProject;
  btnClose.onclick = closeModal;
  btnCancel.onclick = closeModal;
  btnSave.onclick = saveProject;
  btnDelete.onclick = deleteProject;

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
