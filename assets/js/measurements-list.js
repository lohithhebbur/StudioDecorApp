// ========================================
// Decor My Nest Studio App
// Measurements landing page (customer picker)
// ========================================

(function () {

  const CUSTOMERS_KEY = "dmnCustomers";
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
  const measurementsByCustomer = readMap(MEASUREMENTS_BY_CUSTOMER_KEY);

  function escapeHtml(str) {
    if (str === undefined || str === null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d)) return "";
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  function formatAmount(v) {
    return "₹" + Math.round(Number(v) || 0).toLocaleString("en-IN");
  }

  function goToMeasurement(customerId) {
    window.location.href = `estimator/index.html?customerId=${encodeURIComponent(customerId)}`;
  }

  function startFresh() {
    window.location.href = "estimator/index.html?fresh=1";
  }

  document.getElementById("btnNewMeasurement").onclick = startFresh;
  document.getElementById("btnNewMeasurementEmpty").onclick = startFresh;

  const searchInput = document.getElementById("searchMeasCustomer");
  const countLabel = document.getElementById("measCount");
  const emptyState = document.getElementById("measEmpty");
  const tableBody = document.getElementById("measTableBody");
  const cardsWrap = document.getElementById("measCards");

  let currentSearch = "";
  searchInput.addEventListener("input", e => {
    currentSearch = e.target.value.trim().toLowerCase();
    render();
  });

  function getFiltered() {
    if (!currentSearch) return customers;
    return customers.filter(c =>
      (c.name || "").toLowerCase().includes(currentSearch) ||
      (c.mobile || "").toLowerCase().includes(currentSearch)
    );
  }

  function render() {
    const list = getFiltered();

    countLabel.textContent = customers.length === 1 ? "1 customer" : `${customers.length} customers`;

    const showEmpty = customers.length === 0;
    emptyState.classList.toggle("hidden", !showEmpty);
    document.querySelector(".crm-table-wrap").classList.toggle("hidden", showEmpty);

    tableBody.innerHTML = "";
    cardsWrap.innerHTML = "";

    list.forEach(c => {
      const snapshot = measurementsByCustomer[c.id];
      const measuredBadge = snapshot
        ? `<span class="crm-badge status-approved" title="Last updated ${formatDate(snapshot.updatedAt)}">Measured · ${formatAmount(snapshot.total)}</span>`
        : `<span class="crm-badge status-draft">Not measured yet</span>`;

      const tr = document.createElement("tr");
      tr.className = "crm-clickable-row";
      tr.innerHTML = `
        <td><strong>${escapeHtml(c.name)}</strong></td>
        <td><a href="tel:${escapeHtml(c.mobile)}" class="crm-link" onclick="event.stopPropagation()">${escapeHtml(c.mobile)}</a></td>
        <td>${escapeHtml(c.locality) || "—"}</td>
        <td>${measuredBadge}</td>
        <td class="crm-row-actions"><button class="crm-icon-btn" aria-label="Open measurement">↗</button></td>
      `;
      tr.onclick = () => goToMeasurement(c.id);
      tableBody.appendChild(tr);

      const card = document.createElement("div");
      card.className = "crm-card";
      card.innerHTML = `
        <div class="crm-card-head"><strong>${escapeHtml(c.name)}</strong></div>
        <div class="crm-card-row">${escapeHtml(c.mobile)} · ${escapeHtml(c.locality) || "—"}</div>
        <div class="crm-card-row">${measuredBadge}</div>
      `;
      card.onclick = () => goToMeasurement(c.id);
      cardsWrap.appendChild(card);
    });

    if (customers.length && !list.length) {
      tableBody.innerHTML = `<tr><td colspan="5" class="crm-muted" style="padding:20px;">No customers match your search.</td></tr>`;
    }
  }

  render();

})();
