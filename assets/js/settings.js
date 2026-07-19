// ========================================
// Decor My Nest Studio App
// Settings — data backup & restore
// ========================================

(function () {

  const DATA_KEYS = [
    "dmnCustomers", "dmnProjects", "dmnQuotations", "dmnMeasurementsByCustomer", "coatState",
    "dmnProducts", "dmnProductPhotos", "dmnProductSheetUrl",
    "dmnWorkerContacts", "dmnVendorContacts", "dmnPaymentSources",
    "dmnCustomWorkers", "dmnCustomVendors", "dmnCustomPackSizes",
    "dmnCustomProductCategories", "dmnCustomQuoStatuses", "dmnCustomMaterialCategories",
    "dmnCustomSurfaces", "dmnCustomDeductionTypes", "dmnCustomProjectTypes",
    "dmnCustomLeadSources", "dmnNumberCounters"
  ];
  const LAST_BACKUP_KEY = "dmnLastBackupAt";

  function readValue(key) {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch {
      return null;
    }
  }

  function formatDateTime(value) {
    if (!value) return null;
    const d = new Date(value);
    if (isNaN(d)) return null;
    return d.toLocaleString("en-IN", {
      day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit"
    });
  }

  // ---------- Rendering ----------

  function renderCounts() {
    const customers = readValue("dmnCustomers") || [];
    const projects = readValue("dmnProjects") || [];
    const quotations = readValue("dmnQuotations") || [];

    document.getElementById("settingsCounts").innerHTML = `
      <div><strong>${customers.length}</strong>customers</div>
      <div><strong>${projects.length}</strong>projects</div>
      <div><strong>${quotations.length}</strong>quotations</div>
    `;
  }

  function renderLastBackup() {
    const note = document.getElementById("lastBackupNote");
    const last = formatDateTime(localStorage.getItem(LAST_BACKUP_KEY));
    note.innerHTML = last
      ? `Last backup: <strong>${last}</strong>`
      : `No backup taken yet on this device.`;
  }

  // ---------- Export ----------

  function exportBackup() {
    const data = {};
    DATA_KEYS.forEach(key => { data[key] = readValue(key); });

    const backup = {
      app: "Decor My Nest Studio App",
      backupVersion: 1,
      exportedAt: new Date().toISOString(),
      data
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `decor-my-nest-backup-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
    renderLastBackup();
    alert("Backup downloaded. Save it somewhere safe — Files app, iCloud Drive, or email it to yourself.");
  }

  // ---------- Restore ----------

  function restoreBackup(file) {
    const reader = new FileReader();

    reader.onload = () => {
      let parsed;
      try {
        parsed = JSON.parse(reader.result);
      } catch {
        alert("This file isn't valid JSON — it doesn't look like a Decor My Nest backup.");
        return;
      }

      if (!parsed || typeof parsed.data !== "object" || parsed.data === null) {
        alert("This doesn't look like a Decor My Nest backup file.");
        return;
      }

      const d = parsed.data;
      const counts = {
        customers: (d.dmnCustomers || []).length,
        projects: (d.dmnProjects || []).length,
        quotations: (d.dmnQuotations || []).length
      };

      const when = formatDateTime(parsed.exportedAt) || "an unknown date";
      const ok = confirm(
        `Restore backup from ${when}?\n\n` +
        `${counts.customers} customers, ${counts.projects} projects, ${counts.quotations} quotations.\n\n` +
        `This replaces all current data on this device and cannot be undone.`
      );
      if (!ok) return;

      DATA_KEYS.forEach(key => {
        if (Object.prototype.hasOwnProperty.call(d, key) && d[key] !== null && d[key] !== undefined) {
          localStorage.setItem(key, JSON.stringify(d[key]));
        }
      });

      alert("Backup restored. Reloading now.");
      window.location.reload();
    };

    reader.readAsText(file);
  }

  // ---------- Events ----------

  document.getElementById("btnExportBackup").onclick = exportBackup;

  const fileInput = document.getElementById("restoreFileInput");
  document.getElementById("btnImportBackup").onclick = () => fileInput.click();
  fileInput.onchange = () => {
    if (fileInput.files && fileInput.files[0]) {
      restoreBackup(fileInput.files[0]);
    }
    fileInput.value = "";
  };

  // ---------- Startup ----------

  renderCounts();
  renderLastBackup();

})();
