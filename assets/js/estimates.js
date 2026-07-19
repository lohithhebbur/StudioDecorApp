// ========================================
// Decor My Nest Studio App
// Estimates module — list of saved measurement-based estimates
// ========================================

(function () {

  const MEASUREMENTS_BY_CUSTOMER_KEY = "dmnMeasurementsByCustomer";
  const CUSTOMERS_KEY = "dmnCustomers";

  function readMap(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || {};
    } catch {
      return {};
    }
  }
  function readList(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch {
      return [];
    }
  }

  const measurementsByCustomer = readMap(MEASUREMENTS_BY_CUSTOMER_KEY);
  const customers = readList(CUSTOMERS_KEY);
  const estimates = Object.entries(measurementsByCustomer).map(([customerId, snapshot]) => ({ ...snapshot, customerId }));

  function escapeHtml(str) {
    if (str === undefined || str === null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function formatAmount(v) {
    if (v === undefined || v === null || v === "") return "—";
    return "₹" + Math.round(Number(v) || 0).toLocaleString("en-IN");
  }
  function formatDateShort(v) {
    if (!v) return "";
    return new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }
  function customerNameFor(id) {
    const c = customers.find(x => x.id === id);
    return c ? c.name : "";
  }

  // ---------- List rendering ----------

  const searchInput = document.getElementById("searchEstimate");

  function render() {
    const query = (searchInput.value || "").trim().toLowerCase();
    const list = estimates
      .filter(e => !query || [e.projectName, customerNameFor(e.customerId)].some(v => (v || "").toLowerCase().includes(query)))
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));

    const wrap = document.getElementById("estimatesTableWrap");
    const empty = document.getElementById("estimatesEmpty");
    empty.classList.toggle("hidden", estimates.length > 0);
    wrap.classList.toggle("hidden", estimates.length === 0);

    const body = document.getElementById("estimatesRows");
    if (!list.length && estimates.length) {
      body.innerHTML = `<tr><td colspan="5">No estimates match your search.</td></tr>`;
      return;
    }

    body.innerHTML = list.map(e => `
      <tr class="crm-clickable-row" data-open-estimate="${escapeHtml(e.customerId)}">
        <td><strong>${escapeHtml(e.projectName) || "—"}</strong></td>
        <td>${escapeHtml(customerNameFor(e.customerId)) || "—"}</td>
        <td>${e.netAreaSqFt ? Math.round(e.netAreaSqFt) + " sq ft" : "—"}</td>
        <td>${formatAmount(e.total)}</td>
        <td>${formatDateShort(e.updatedAt) || "—"}</td>
      </tr>
    `).join("");

    body.querySelectorAll("[data-open-estimate]").forEach(row => {
      row.addEventListener("click", () => {
        const e = estimates.find(x => x.customerId === row.dataset.openEstimate);
        if (e) showEstimateDetail(e);
      });
    });
  }

  searchInput.addEventListener("input", render);
  document.getElementById("btnNewEstimate").onclick = () => {
    window.location.href = "estimator/index.html?fresh=1";
  };

  // ---------- Finalized document preview ----------

  const estDocModal = document.getElementById("estDocModal");
  const estDocModalTitle = document.getElementById("estDocModalTitle");
  const estDocContent = document.getElementById("estDocContent");
  let currentEstimate = null;

  function readFirmForStatement() {
    try {
      return (JSON.parse(localStorage.getItem("coatState")) || {}).firm || {};
    } catch {
      return {};
    }
  }

  function showEstimateDetail(e) {
    currentEstimate = e;
    const firm = readFirmForStatement();
    const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    const customerName = customerNameFor(e.customerId);
    const rows = e.roomsSummary || [];

    estDocModalTitle.textContent = e.projectName || "Estimate";
    estDocContent.innerHTML = `
      <div class="report-doc-type">ESTIMATE</div>
      <div class="report-header-row">
        <div class="report-company">
          <div><div class="report-brand">${escapeHtml(firm.name || "Decor My Nest")}</div></div>
        </div>
        <div class="report-date-block"><span>Date</span><strong>${today}</strong></div>
      </div>
      <div class="report-title">${escapeHtml(e.projectName) || "Estimate"}</div>
      <div class="report-meta">${customerName ? escapeHtml(customerName) : "Not linked to a customer"}${e.address ? ` · ${escapeHtml(e.address)}` : ""}</div>
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
        <div><span>Subtotal</span><strong>${formatAmount(e.subtotal)}</strong></div>
        <div><span>Discount</span><strong>${e.discountPercent || 0}%</strong></div>
        <div><span>GST</span><strong>${e.gstPercent || 0}%</strong></div>
      </div>
      <div class="report-total"><span>Final estimated value · ${Math.round(e.netAreaSqFt || 0)} sq ft</span><strong>${formatAmount(e.total)}</strong></div>
      <p class="report-disclaimer">This is a preliminary estimate based on site measurements. Final pricing may vary after surface inspection, product selection, scope confirmation, and actual site conditions.</p>
    `;
    estDocModal.classList.remove("hidden");
  }

  function closeEstDocModal() {
    estDocModal.classList.add("hidden");
    estDocContent.innerHTML = "";
  }

  async function saveEstDocPdf() {
    const button = document.getElementById("saveEstDocPdf");
    const originalLabel = button.textContent;
    button.textContent = "Generating PDF…";
    button.disabled = true;

    try {
      const canvas = await html2canvas(estDocContent, { scale: 2, useCORS: true, backgroundColor: "#fffdf8" });
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

      pdf.save(`${(currentEstimate && currentEstimate.projectName ? currentEstimate.projectName : "estimate").replace(/[^a-z0-9]+/gi, "-")}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Couldn't generate the PDF — please try again.");
    } finally {
      button.textContent = originalLabel;
      button.disabled = false;
    }
  }

  document.getElementById("closeEstDocModal").onclick = closeEstDocModal;
  document.getElementById("cancelEstDocModal").onclick = closeEstDocModal;
  document.getElementById("saveEstDocPdf").onclick = saveEstDocPdf;
  document.getElementById("estDocEditButton").onclick = () => {
    if (currentEstimate) window.location.href = `estimator/index.html?customerId=${encodeURIComponent(currentEstimate.customerId)}`;
  };
  estDocModal.addEventListener("click", (e) => { if (e.target === estDocModal) closeEstDocModal(); });

  // ---------- Startup ----------

  render();

})();
