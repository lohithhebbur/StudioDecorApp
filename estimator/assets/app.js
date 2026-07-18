const defaultState = {
  firm: {
    name: "Decor My Nest",
    tagline: "Style in Every Stroke\nPremium Painting • Waterproofing • Renovation • Modular Interiors",
    phone: "",
    email: "",
    address: "Decor My Nest #48/2, Bhuvi, Ground Floor, 13th Cross, Rajajinagar, 1st K Block, Bengaluru-560010",
    gstin: "",
    preparedByBlock: "Prepared by:\nLohith Hebbur\nManager & Principal Consultant\nDecor My Nest - Studio\nStyle in Every Stroke\nPremium Painting • Waterproofing • Wallcoverings • Modular Interiors/Interiors",
   logo: "estimator/decor-my-nest-logo.jpg",
    logoConfigured: true
  },
  projectName: "Mehta Residence",
  address: "Koramangala, Bengaluru",
  customerId: null,
  customerMobile: "",
  activeRoomId: 1,
  activeLineId: "base",
  coats: 2,
  coverage: 100,
  paintRate: 350,
  labourRate: 12,
  discountPercent: 0,
  gstPercent: 18,
  estimateDate: new Intl.DateTimeFormat("en-CA").format(new Date()),
  terms: "",
  payment: {
    accountName: "Decor My Nest",
    bankName: "",
    accountNumber: "",
    ifsc: "",
    branch: "",
    upi: ""
  },
  scanner: {
    image: "",
    note: "Scan to pay Decor My Nest"
  },
  paintSystems: [],
  rateSheetUrl: "",
  rooms: [
    { id: 1, name: "Living Room", substrate: "Plastered wall", rate: 25, length: 18, width: 14, height: 10, openings: [{type:"Window",width:5,height:4},{type:"Door",width:3,height:7}], notes:"Feature wall behind television." },
    { id: 2, name: "Master Bedroom", substrate: "Plastered wall", rate: 25, length: 14, width: 12, height: 10, openings: [{type:"Window",width:4,height:4},{type:"Door",width:3,height:7}], notes:"" },
    { id: 3, name: "Kitchen", substrate: "Putty / POP", rate: 28, length: 12, width: 10, height: 10, openings: [{type:"Window",width:3,height:3},{type:"Door",width:3,height:7}], notes:"Exclude tiled backsplash." }
  ]
};
let state;
try { state = JSON.parse(localStorage.getItem("coatState")) || structuredClone(defaultState); } catch { state = structuredClone(defaultState); }
state.firm = { ...defaultState.firm, ...(state.firm || {}) };
state.customerId = state.customerId || null;
state.customerMobile = state.customerMobile || "";
state.activeLineId = state.activeLineId || "base";
if (!state.firm.logoConfigured) {
  state.firm.logo = defaultState.firm.logo;
  state.firm.logoConfigured = true;
}
state.rooms = state.rooms.map(room => ({
  ...room,
  substrate: room.substrate || "Plastered wall",
  product: room.product || "",
  paintingType: room.paintingType || "",
  paintSystem: room.paintSystem || "Custom",
  calculation: room.calculation || "walls",
  qty: Number(room.qty) || 1,
  manualDeduction: Number(room.manualDeduction) || 0,
  rate: Number(room.rate) || 25,
  openings: (room.openings || []).map(opening => ({ ...opening, qty: Number(opening.qty) || 1 })),
  measurements: (room.measurements || []).map(measurement => ({
    id: measurement.id || Date.now() + Math.random(),
    name: measurement.name || "Additional painting work",
    substrate: measurement.substrate || "",
    product: measurement.product || "",
    paintingType: measurement.paintingType || "",
    paintSystem: measurement.paintSystem || "Custom",
    calculation: measurement.calculation || "surface",
    length: Number(measurement.length) || 0,
    width: Number(measurement.width) || 0,
    height: Number(measurement.height) || 0,
    qty: Number(measurement.qty) || 1,
    manualDeduction: Number(measurement.manualDeduction) || 0,
    rate: Number(measurement.rate) || 0,
    openings: measurement.openings || []
  }))
}));
state.discountPercent = Number(state.discountPercent) || 0;
state.gstPercent = Number.isFinite(Number(state.gstPercent)) ? Number(state.gstPercent) : 18;
state.estimateDate = state.estimateDate || defaultState.estimateDate;
state.terms = state.terms || "";
state.payment = { ...defaultState.payment, ...(state.payment || {}) };
state.scanner = { ...defaultState.scanner, ...(state.scanner || {}) };
state.paintSystems = Array.isArray(state.paintSystems) ? state.paintSystems : [];
state.paintSystems = state.paintSystems.map(system => ({
  ...system,
  id: system.id || `manual-${Date.now()}-${Math.random()}`,
  product: system.product || "",
  paintingType: system.paintingType || "",
  substrate: system.substrate || "",
  source: system.source || "manual"
}));
state.rateSheetUrl = state.rateSheetUrl || "";
state.rooms.forEach(room => {
  [room, ...(room.measurements || [])].forEach(line => {
    if (line.paintSystem !== "Custom" && !state.paintSystems.some(system => system.name === line.paintSystem)) line.paintSystem = "Custom";
  });
});

const $ = id => document.getElementById(id);
const roomList = $("roomList");

// ---- CRM integration: pull customers saved in the Customers module ----
function loadCRMCustomers() {
  try {
    return JSON.parse(localStorage.getItem("dmnCustomers")) || [];
  } catch {
    return [];
  }
}

let crmCustomers = loadCRMCustomers();

function populateCustomerPicker() {
  const picker = $("customerPicker");
  if (!picker) return;
  const previousValue = picker.value;
  picker.innerHTML = '<option value="">— No customer linked (manual entry) —</option>';
  crmCustomers.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = `${c.name} — ${c.mobile}`;
    picker.appendChild(opt);
  });
  picker.value = state.customerId || previousValue || "";
}

function renderCustomerInfoBlock() {
  const block = $("customerInfoBlock");
  if (!block) return;

  if (!state.customerId) {
    block.classList.add("hidden");
    block.innerHTML = "";
    return;
  }

  let linkedCustomer = null;
  try {
    const allCustomers = JSON.parse(localStorage.getItem("dmnCustomers")) || [];
    linkedCustomer = allCustomers.find(c => String(c.id) === String(state.customerId)) || null;
  } catch { linkedCustomer = null; }

  const name = linkedCustomer?.name || state.projectName;
  const mobile = linkedCustomer?.mobile || state.customerMobile || "";
  const address = linkedCustomer?.address || linkedCustomer?.locality || state.address || "";
  const email = linkedCustomer?.email || "";

  const rows = [
    [address, `<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>`],
    [mobile, `<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z"/>`],
    [email, `<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/>`]
  ].filter(([value]) => value);

  if (!name && rows.length === 0) {
    block.classList.add("hidden");
    block.innerHTML = "";
    return;
  }

  block.classList.remove("hidden");
  const projectNameLc = (state.projectName || "").trim().toLowerCase();
  const nameLc = (name || "").trim().toLowerCase();
  const showName = name && nameLc !== projectNameLc && !projectNameLc.startsWith(nameLc);
  block.innerHTML = `${showName ? `<strong>${escapeHtml(name)}</strong>` : ""}${rows.map(([value, icon]) => `<div><svg viewBox="0 0 24 24">${icon}</svg><span>${escapeHtml(value)}</span></div>`).join("")}`;
}

populateCustomerPicker();

// ---- Keep a per-customer measurement snapshot, so Quotations can look up
// ---- "what was measured for this customer" even after Measurements has
// ---- since moved on to a different site.
const MEASUREMENTS_BY_CUSTOMER_KEY = "dmnMeasurementsByCustomer";

function persistMeasurementSnapshotForCustomer() {
  if (!state.customerId || !state.pricingSnapshot) return;
  let all;
  try {
    all = JSON.parse(localStorage.getItem(MEASUREMENTS_BY_CUSTOMER_KEY)) || {};
  } catch {
    all = {};
  }
  all[state.customerId] = state.pricingSnapshot;
  localStorage.setItem(MEASUREMENTS_BY_CUSTOMER_KEY, JSON.stringify(all));
}


if ($("customerPicker")) {
  $("customerPicker").onchange = e => {
    const id = e.target.value;
    state.customerId = id || null;

    if (id) {
      const customer = crmCustomers.find(c => c.id === id);
      if (customer) {
        state.customerMobile = customer.mobile || "";
        state.projectName = customer.name;
        state.address = customer.locality || customer.address || state.address;
      }
    } else {
      state.customerMobile = "";
    }

    render();
    updateCalculations();
    save();
  };
}

if ($("saveAsCustomerButton")) {
  $("saveAsCustomerButton").onclick = () => {
    const name = state.projectName.trim();
    const mobile = prompt(`Mobile number for ${name}`, state.customerMobile || "");
    if (!mobile || !mobile.trim()) {
      showToast("A mobile number is needed to save a customer");
      return;
    }

    const newCustomer = {
      id: "CUS" + String(Date.now()).slice(-8),
      name,
      mobile: mobile.trim(),
      email: "",
      locality: "",
      address: state.address || "",
      projectType: "Other",
      leadSource: "Other",
      status: "New Lead",
      budget: null,
      notes: "Added from Measurements",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    let allCustomers;
    try {
      allCustomers = JSON.parse(localStorage.getItem("dmnCustomers")) || [];
    } catch {
      allCustomers = [];
    }
    allCustomers.unshift(newCustomer);
    localStorage.setItem("dmnCustomers", JSON.stringify(allCustomers));

    crmCustomers = allCustomers;
    populateCustomerPicker();

    state.customerId = newCustomer.id;
    state.customerMobile = newCustomer.mobile;
    render();
    updateCalculations();
    save();
    showToast(`${name} saved as a new customer — now linked`);
  };
}

const fmt = n => Math.round(n).toLocaleString("en-IN");
const money = n => `₹${Math.round(n).toLocaleString("en-IN")}`;
const openingDeduction = line => (line.openings || []).reduce(
  (sum, opening) => sum + (Number(opening.width) || 0) * (Number(opening.height) || 0) * (Number(opening.qty) || 1),
  0
);
const lineDeduction = line => openingDeduction(line) + (Number(line.manualDeduction) || 0);
const lineGrossArea = line => {
  const length = Number(line.length) || 0;
  const width = Number(line.width) || 0;
  const height = Number(line.height) || 0;
  const qty = Number(line.qty) || 1;
  if (line.calculation === "surface") return length * height * qty;
  if (line.calculation === "flat") return length * width * qty;
  if (line.calculation === "manual") return length * qty;
  return 2 * (length + width) * height * qty;
};
const lineArea = line => Math.max(0, lineGrossArea(line) - lineDeduction(line));
const lineTotal = line => lineArea(line) * (Number(line.rate) || 0);
const roomTotalArea = room => lineArea(room) + (room.measurements || []).reduce((sum, line) => sum + lineArea(line), 0);
const estimateLines = () => state.rooms.flatMap(room => [
  { room, line: room, isBase: true, lineId: "base" },
  ...(room.measurements || []).map(measurement => ({ room, line: measurement, isBase: false, lineId: String(measurement.id) }))
]);
const roomDeduction = lineDeduction;
const roomGrossArea = lineGrossArea;
const roomArea = lineArea;
const roomLineTotal = lineTotal;
const projectPricing = () => {
  const subtotal = estimateLines().reduce((sum, item) => sum + lineTotal(item.line), 0);
  const discountPercent = Math.min(100, Math.max(0, Number(state.discountPercent) || 0));
  const gstPercent = Math.min(100, Math.max(0, Number(state.gstPercent) || 0));
  const discount = subtotal * discountPercent / 100;
  const taxable = subtotal - discount;
  const gst = taxable * gstPercent / 100;
  return { subtotal, discount, taxable, gst, total: taxable + gst };
};
const activeRoom = () => state.rooms.find(r => r.id === state.activeRoomId);
const findEstimateLine = (roomId, lineId) => {
  const room = state.rooms.find(item => item.id === Number(roomId));
  if (!room) return null;
  if (String(lineId) === "base") return { room, line: room, isBase: true };
  const line = (room.measurements || []).find(item => String(item.id) === String(lineId));
  return line ? { room, line, isBase: false } : null;
};
function updateSurfaceConfirmedBadge() {
  const target = getActiveLine();
  const isConfirmed = !!(target && target.line.confirmed);
  $("surfaceConfirmedBadge").classList.toggle("hidden", !isConfirmed);
  $("confirmSurfaceButton").classList.toggle("hidden", isConfirmed);
}
function cleanupAbandonedBlankLines() {
  state.rooms.forEach(room => {
    room.measurements = (room.measurements || []).filter(m => {
      const isCurrentlyActive = room.id === state.activeRoomId && String(m.id) === String(state.activeLineId);
      if (isCurrentlyActive) return true; // never remove the one currently being edited
      return !lineIsBlank(m, false);
    });
  });
}

function getActiveLine() {
  const room = activeRoom();
  if (!room) return null;
  if (!state.activeLineId || state.activeLineId === "base") {
    return { room, line: room, isBase: true, lineId: "base" };
  }
  const measurement = (room.measurements || []).find(item => String(item.id) === String(state.activeLineId));
  if (!measurement) {
    state.activeLineId = "base";
    return { room, line: room, isBase: true, lineId: "base" };
  }
  return { room, line: measurement, isBase: false, lineId: String(measurement.id) };
}
let leicaDevice = null;
let leicaCharacteristic = null;
let leicaTarget = null;
const DISTO_SERVICE = "3ab10100-f831-4395-b29d-570977d5bf94";
const DISTO_DISTANCE = "3ab10101-f831-4395-b29d-570977d5bf94";
const DISTO_MODEL = "3ab1010c-f831-4395-b29d-570977d5bf94";

function save() {
  try {
    localStorage.setItem("coatState", JSON.stringify(state));
    $("savedState").innerHTML = "<span></span> Saved";
  } catch {
    $("savedState").textContent = "Storage full";
    showToast("Logo is too large to save. Please use a smaller image.");
  }
}

function renderFirmLogo() {
  const hasLogo = Boolean(state.firm.logo);
  $("brandLogo").hidden = !hasLogo;
  $("brandMark").hidden = false;
  $("logoRemoveButton").hidden = !hasLogo;
  if (hasLogo) $("brandLogo").src = state.firm.logo;
}

function renderScanner() {
  const hasScanner = Boolean(state.scanner.image);
  const preview = $("scannerPreview");
  preview.classList.toggle("has-image", hasScanner);
  preview.innerHTML = hasScanner
    ? `<img src="${state.scanner.image}" alt="Payment scanner QR code">`
    : "<span>Payment QR preview</span>";
  $("scannerRemoveButton").hidden = !hasScanner;
}

function renderPaintSystemManager() {
  const container = $("paintSystemList");
  if (!state.paintSystems.length) {
    container.innerHTML = '<div class="empty-systems">No rate-sheet entries yet. Add rows to painting-systems.csv or add one manually.</div>';
    return;
  }
  container.innerHTML = state.paintSystems.map((system, index) => `<div class="paint-system-row ${system.source === "sheet" ? "sheet-system-row" : ""}">
    <span>${index + 1}</span>
    <label><small>Product</small><input data-system-id="${system.id}" data-system-key="product" value="${escapeAttribute(system.product)}" placeholder="Product / brand" ${system.source === "sheet" ? "readonly" : ""}></label>
    <label><small>Painting type</small><input data-system-id="${system.id}" data-system-key="paintingType" value="${escapeAttribute(system.paintingType)}" placeholder="Fresh / Repainting" ${system.source === "sheet" ? "readonly" : ""}></label>
    <label><small>Painting system</small><input data-system-id="${system.id}" data-system-key="name" value="${escapeAttribute(system.name)}" placeholder="Painting system" ${system.source === "sheet" ? "readonly" : ""}></label>
    <label><small>Surface / Substrate</small><input data-system-id="${system.id}" data-system-key="substrate" value="${escapeAttribute(system.substrate)}" placeholder="Surface" ${system.source === "sheet" ? "readonly" : ""}></label>
    <label><small>Cost per sq ft</small><span class="system-rate-input">₹ <input data-system-id="${system.id}" data-system-key="rate" type="number" min="0" step="0.5" value="${Number(system.rate) || 0}" ${system.source === "sheet" ? "readonly" : ""}></span></label>
    ${system.source === "sheet" ? '<span class="sheet-source-badge">SHEET</span>' : `<button data-remove-system="${system.id}" aria-label="Remove painting system">×</button>`}
  </div>`).join("");

  container.querySelectorAll("[data-system-key]").forEach(input => input.onchange = event => {
    const system = state.paintSystems.find(item => String(item.id) === String(event.target.dataset.systemId));
    if (!system || system.source === "sheet") return;
    const old = { product: system.product, paintingType: system.paintingType, name: system.name };
    const key = event.target.dataset.systemKey;
    system[key] = key === "rate" ? Math.max(0, Number(event.target.value) || 0) : event.target.value.trim();
    state.rooms.forEach(room => {
      [room, ...(room.measurements || [])].forEach(line => {
        if (line.product === old.product && line.paintingType === old.paintingType && line.paintSystem === old.name) {
          line.product = system.product;
          line.paintingType = system.paintingType;
          line.paintSystem = system.name || "Custom";
          if (system.substrate) line.substrate = system.substrate;
          line.rate = Number(system.rate) || 0;
        }
      });
    });
    renderEstimateTable();
    updateCalculations();
    save();
  });
  container.querySelectorAll("[data-remove-system]").forEach(button => button.onclick = () => {
    const id = String(button.dataset.removeSystem);
    const system = state.paintSystems.find(item => String(item.id) === id);
    if (system) state.rooms.forEach(room => [room, ...(room.measurements || [])].forEach(line => {
      if (line.product === system.product && line.paintingType === system.paintingType && line.paintSystem === system.name) line.paintSystem = "Custom";
    }));
    state.paintSystems = state.paintSystems.filter(item => String(item.id) !== id);
    renderPaintSystemManager();
    renderEstimateTable();
    updateCalculations();
    save();
  });
}

function setRateSheetStatus(message, mode = "") {
  const status = $("rateSheetStatus");
  status.className = `rate-sheet-status ${mode}`.trim();
  status.innerHTML = `<i></i> ${escapeHtml(message)}`;
}

function parseRateSheetCSV(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (character === '"' && quoted && text[index + 1] === '"') { cell += '"'; index++; }
    else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) { row.push(cell.trim()); cell = ""; }
    else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index++;
      row.push(cell.trim());
      if (row.some(value => value !== "")) rows.push(row);
      row = []; cell = "";
    } else cell += character;
  }
  row.push(cell.trim());
  if (row.some(value => value !== "")) rows.push(row);
  if (rows.length < 2) return [];
  const headerRowIndex = rows.findIndex(values => {
    const normalized = values.map(value => value.toLowerCase().replace(/[^a-z0-9]/g, ""));
    return normalized.includes("product") && (normalized.includes("paintingsystem") || normalized.includes("system"));
  });
  if (headerRowIndex < 0) return [];
  const headers = rows[headerRowIndex].map(header => header.toLowerCase().replace(/[^a-z0-9]/g, ""));
  const valueAt = (values, aliases) => {
    const index = headers.findIndex(header => aliases.includes(header));
    return index >= 0 ? (values[index] || "").trim() : "";
  };
  return rows.slice(headerRowIndex + 1).map((values, index) => {
    const active = valueAt(values, ["active", "enabled"]);
    const product = valueAt(values, ["product", "brand"]);
    const paintingType = valueAt(values, ["paintingtype", "type"]);
    const name = valueAt(values, ["paintingsystem", "system"]);
    return {
      id: `sheet-${index}-${product}-${name}`,
      product,
      paintingType,
      name,
      substrate: valueAt(values, ["surfacesubstrate", "surface", "substrate"]),
      rate: Number(valueAt(values, ["ratepersqft", "rate", "costpersqft", "price"]).replace(/[^0-9.-]/g, "")) || 0,
      active: !["no", "false", "0", "inactive"].includes(active.toLowerCase()),
      source: "sheet"
    };
  }).filter(system => system.active && system.product && system.paintingType && system.name);
}

function applyRateSheetToMeasurements() {
  state.rooms.forEach(room => [room, ...(room.measurements || [])].forEach(line => {
    const match = state.paintSystems.find(system => system.product === line.product && system.paintingType === line.paintingType && system.name === line.paintSystem);
    if (match) {
      line.rate = Number(match.rate) || 0;
      if (match.substrate) line.substrate = match.substrate;
    }
  }));
}

function normalizedRateSheetUrl() {
  const entered = state.rateSheetUrl.trim();
  if (!entered) return `../painting-systems.csv?ts=${Date.now()}`;
  // Already a valid published/export CSV URL — use it exactly as given, don't touch it
  if (entered.includes("output=csv") || entered.includes("format=csv") || entered.includes("/pub")) {
    return entered;
  }
  const match = entered.match(/docs\.google\.com\/spreadsheets\/d\/([^/]+)/);
  if (match) {
    const gid = entered.match(/[?#&]gid=(\d+)/)?.[1] || "0";
    return `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv&gid=${gid}`;
  }
  return entered;
}

async function syncRateSheet({ silent = false } = {}) {
  if (location.protocol === "file:" && !state.rateSheetUrl) {
    setRateSheetStatus("Use Start Decor My Nest.bat for automatic updates", "error");
    return;
  }
  if (!silent) setRateSheetStatus("Checking sheet for price changes…", "syncing");
  try {
    const response = await fetch(normalizedRateSheetUrl(), { cache: "no-store" });
    if (!response.ok) throw new Error(`Sheet returned ${response.status}`);
    const sheetSystems = parseRateSheetCSV(await response.text());
    const manualSystems = state.paintSystems.filter(system => system.source !== "sheet");
    const before = JSON.stringify(state.paintSystems.filter(system => system.source === "sheet").map(({id, ...system}) => system));
    const after = JSON.stringify(sheetSystems.map(({id, ...system}) => system));
    state.paintSystems = [...sheetSystems, ...manualSystems];
    applyRateSheetToMeasurements();
    if (before !== after) {
      renderPaintSystemManager();
      renderEstimateTable();
      updateCalculations();
      save();
      if (before !== "[]") showToast("Prices updated automatically from rate sheet");
    }
    const time = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(new Date());
    setRateSheetStatus(`${sheetSystems.length} active rows synced at ${time}`, "connected");
  } catch {
    setRateSheetStatus("Could not read sheet — use File → Share → Publish to web (CSV), not the regular Share link", "error");
    if (!silent) showToast("Check the sheet link or painting-systems.csv file");
  }
}

function renderRooms() {
  roomList.innerHTML = "";
  state.rooms.forEach(room => {
    const button = document.createElement("button");
    button.className = `room-item ${room.id === state.activeRoomId ? "active" : ""}`;
    button.innerHTML = `<span class="room-icon"><svg viewBox="0 0 24 24"><path d="M4 20V6l8-3 8 3v14M8 20v-7h8v7M3 20h18"/></svg></span><span><span class="room-name">${escapeHtml(room.name)}</span><span class="room-area">${fmt(roomTotalArea(room))} sq ft</span></span><span class="room-arrow">›</span>`;
    button.onclick = () => { cleanupAbandonedBlankLines(); state.activeRoomId = room.id; state.activeLineId = "base"; render(); };
    roomList.appendChild(button);
  });
  $("roomCount").textContent = state.rooms.length;
}

function deductionTypeOptionsHtml(selected) {
  const presets = ["Windows", "Doors", "Panelled Wall", "Wall Opening", "Wardrobes", ...getCustomList("dmnCustomDeductionTypes")];
  const isCustomExisting = selected && !presets.includes(selected);
  return `<option value="" ${!selected ? "selected" : ""} disabled>Select type</option>${
    presets.map(p => `<option value="${escapeAttribute(p)}" ${p === selected ? "selected" : ""}>${escapeHtml(p)}</option>`).join("")
  }${isCustomExisting ? `<option value="${escapeAttribute(selected)}" selected>${escapeHtml(selected)}</option>` : ""}<option value="__custom__">Others (type manually)…</option>`;
}
function renderOpenings(room) {
  const container = $("openingsList");
  if (!room.openings.length) {
    container.innerHTML = '<div class="empty-openings">No area deductions added yet</div>';
    return;
  }
  container.innerHTML = room.openings.map((o,i) => `<div class="opening-row">
    <select class="deduction-name" data-opening="${i}" data-key="type" aria-label="Deduction type">${deductionTypeOptionsHtml(o.type)}</select>
    <label class="deduction-dimension"><small>W</small><input data-opening="${i}" data-key="width" type="number" min="0" step="0.01" value="${o.width}" aria-label="Deduction width"></label><span class="times">×</span>
    <label class="deduction-dimension"><small>H</small><input data-opening="${i}" data-key="height" type="number" min="0" step="0.01" value="${o.height}" aria-label="Deduction height"></label><span class="times">×</span>
    <label class="deduction-dimension qty"><small>Qty</small><input data-opening="${i}" data-key="qty" type="number" min="1" step="1" value="${o.qty || 1}" aria-label="Deduction quantity"></label>
    <strong class="deduction-area">${((Number(o.width)||0)*(Number(o.height)||0)*(Number(o.qty)||1)).toFixed(2)}<small> sq ft</small></strong>
    <button class="remove-opening" data-remove="${i}" aria-label="Remove deduction">×</button>
  </div>`).join("");
  container.querySelectorAll("[data-opening]").forEach(el => el.oninput = e => {
    const index = Number(e.target.dataset.opening);
    const key = e.target.dataset.key;
    if (key === "type") {
      if (e.target.value === "__custom__") {
        const custom = prompt("Enter a custom deduction type", room.openings[index].type || "");
        room.openings[index].type = custom?.trim() || room.openings[index].type || "";
        addToCustomList("dmnCustomDeductionTypes", room.openings[index].type);
        renderOpenings(room);
      } else {
        room.openings[index].type = e.target.value;
      }
    } else {
      room.openings[index][key] = Number(e.target.value);
    }
    const deduction = room.openings[index];
    const area = (Number(deduction.width) || 0) * (Number(deduction.height) || 0) * (Number(deduction.qty) || 1);
    const areaLabel = e.target.closest(".opening-row")?.querySelector(".deduction-area");
    if (areaLabel) areaLabel.innerHTML = `${area.toFixed(2)}<small> sq ft</small>`;
    updateCalculations(); save();
  });
  container.querySelectorAll("[data-remove]").forEach(el => el.onclick = e => {
    room.openings.splice(Number(e.currentTarget.dataset.remove), 1); render(); save();
  });
}

function renderEstimateTable() {
  const body = $("estimateTableBody");
  body.innerHTML = estimateLines().map(({room, line, isBase, lineId}) => {
    const roomIndex = state.rooms.indexOf(room) + 1;
    const lineIndex = isBase ? 1 : room.measurements.indexOf(line) + 2;
    return `
    <tr class="${room.id === state.activeRoomId ? "active-estimate-row" : ""} ${lineIsBlank(line, isBase) ? "pending-row" : ""}" data-room-row-id="${room.id}" data-line-row-id="${lineId}">
      <td class="serial-cell">${roomIndex}.${lineIndex}</td>
      <td class="description-cell">
        ${lineIsBlank(line, isBase) ? `<span class="pending-badge">NEW — awaiting measurement</span>` : ""}
        <input class="table-text-input area-name-input" data-room-id="${room.id}" data-line-id="${lineId}" data-room-key="name" value="${escapeAttribute(line.name)}" list="areaDescriptionOptions" placeholder="Work description" aria-label="Area description ${roomIndex}.${lineIndex}">
        <select class="calculation-select" data-room-id="${room.id}" data-line-id="${lineId}" data-room-key="calculation" aria-label="Area calculation method">
          <option value="surface" ${line.calculation === "surface" ? "selected" : ""}>Surface: L×H×Qty (primary)</option>
          <option value="walls" ${line.calculation === "walls" ? "selected" : ""}>Whole room walls: 2(L+W)×H×Qty</option>
          <option value="flat" ${line.calculation === "flat" ? "selected" : ""}>Flat: L×W×Qty</option>
          <option value="manual" ${line.calculation === "manual" ? "selected" : ""}>Manual: L as area×Qty</option>
        </select>
      </td>
      <td><select class="substrate-select" data-room-id="${room.id}" data-line-id="${lineId}" data-room-key="substrate" aria-label="Surface for ${line.name}">${surfaceOptions(line.substrate)}</select></td>
      <td><select class="product-select" data-room-id="${room.id}" data-line-id="${lineId}" data-room-key="product" aria-label="Product for ${line.name}">${productOptions(line.product)}</select></td>
      <td><input class="table-text-input" data-room-id="${room.id}" data-line-id="${lineId}" data-room-key="shade" value="${escapeAttribute(line.shade || "")}" placeholder="e.g. Ivory White" aria-label="Shade or colour for ${line.name}"></td>
      <td><select class="painting-type-select" data-room-id="${room.id}" data-line-id="${lineId}" data-room-key="paintingType" aria-label="Painting type for ${line.name}">${paintingTypeOptions(line.paintingType, line.product)}</select></td>
      <td>
        <button type="button" class="painting-system-picker-btn" data-room-id="${room.id}" data-line-id="${lineId}" aria-label="Painting system for ${line.name}">
          ${paintSystemButtonLabel(line.paintSystem, line.product, line.paintingType)}
        </button>
      </td>
      ${["length","width","height"].map(field => `
        <td>
          <div class="measurement-cell ${leicaTarget?.roomId === room.id && String(leicaTarget?.lineId) === String(lineId) && leicaTarget?.field === field ? "awaiting-reading" : ""}">
            <input type="number" min="0" step="0.01" data-room-id="${room.id}" data-line-id="${lineId}" data-room-key="${field}" value="${Number(line[field]) || ""}" aria-label="${field} for ${line.name}">
            <button class="leica-capture" data-leica-room="${room.id}" data-leica-line="${lineId}" data-leica-field="${field}" title="Send next Leica reading here" aria-label="Capture Leica ${field} for ${line.name}">
              <svg viewBox="0 0 24 24"><path d="m5 19 14-14M7 5h12v12M3 12h3M12 21v-3"/></svg>
            </button>
          </div>
        </td>`).join("")}
      <td><input class="qty-input" type="number" min="1" step="1" data-room-id="${room.id}" data-line-id="${lineId}" data-room-key="qty" value="${Number(line.qty) || 1}" aria-label="Quantity for ${line.name}"></td>
      <td><div class="line-deduction-cell"><input type="number" min="0" step="0.01" data-room-id="${room.id}" data-line-id="${lineId}" data-room-key="manualDeduction" value="${Number(line.manualDeduction) || 0}" aria-label="Additional deduction for ${line.name}"><small>${openingDeduction(line).toFixed(2)} openings</small></div></td>
      <td class="number-cell net-cell">${lineArea(line).toFixed(2)}</td>
      <td class="unit-cell">Sq.ft</td>
      <td><div class="rate-cell"><span>₹</span><input type="number" min="0" step="0.5" data-room-id="${room.id}" data-line-id="${lineId}" data-room-key="rate" value="${Number(line.rate) || 0}" aria-label="Cost per square foot for ${line.name}"></div></td>
      <td class="line-total-cell">${money(lineTotal(line))}</td>
      <td class="row-actions">${line.confirmed ? `<span class="row-confirmed-badge" title="Measurement confirmed">✓</span>` : ""}<button data-add-measurement="${room.id}" title="Add measurement to ${room.name}" aria-label="Add measurement to ${room.name}">+</button><button class="remove-measurement" data-remove-any-line="${lineId}" data-remove-any-room="${room.id}" data-is-base="${isBase ? "1" : "0"}" title="Delete this row" aria-label="Delete this measurement row">×</button></td>
    </tr>
  `}).join("");

  body.querySelectorAll("[data-room-key]").forEach(input => {
    input.oninput = event => {
      const target = findEstimateLine(event.target.dataset.roomId, event.target.dataset.lineId);
      if (!target) return;
      const {room, line, isBase} = target;
      const key = event.target.dataset.roomKey;
      if (key === "product") {
        line.product = event.target.value;
        line.paintingType = "";
        line.paintSystem = "Custom";
        line.rate = 0;
        renderEstimateTable();
      } else if (key === "paintingType") {
        line.paintingType = event.target.value;
        line.paintSystem = "Custom";
        line.rate = 0;
        renderEstimateTable();
      } else if (key === "paintSystem") {
        if (event.target.value === "Custom") {
          const name = prompt("Name this custom painting system (it will be saved for future use)", "");
          if (name && name.trim()) {
            state.paintSystems.push({
              id: "SYS" + Date.now(),
              name: name.trim(),
              product: line.product || "",
              paintingType: line.paintingType || "",
              substrate: line.substrate || "",
              rate: Number(line.rate) || 0
            });
            line.paintSystem = name.trim();
          } else {
            line.paintSystem = "Custom";
          }
          renderEstimateTable();
        } else {
          line.paintSystem = event.target.value;
          const selectedSystem = state.paintSystems.find(system => system.product === line.product && system.paintingType === line.paintingType && system.name === line.paintSystem);
          if (selectedSystem) {
            line.rate = Number(selectedSystem.rate) || 0;
            if (selectedSystem.substrate) line.substrate = selectedSystem.substrate;
          }
        }
      } else if (key === "substrate") {
        if (event.target.value === "__custom__") {
          const custom = prompt("Enter a custom surface name", line.substrate || "");
          line.substrate = custom?.trim() || line.substrate || "";
          addToCustomList("dmnCustomSurfaces", line.substrate);
        } else {
          line.substrate = event.target.value;
        }
        renderEstimateTable();
      } else {
        line[key] = ["length", "width", "height", "qty", "manualDeduction", "rate"].includes(key)
          ? Number(event.target.value)
          : event.target.value;
      }
      if (["length", "width", "height", "qty", "substrate"].includes(key)) line.confirmed = false;
      if (room.id === state.activeRoomId && String(target.isBase ? "base" : line.id) === String(state.activeLineId)) {
        updateSurfaceConfirmedBadge();
      }
      if (key === "name" && isBase && room.id === state.activeRoomId) $("activeRoomTitle").textContent = room.name;
      updateCalculations();
      renderRooms();
      save();
    };
    input.onfocus = event => {
      const roomId = Number(event.target.dataset.roomId);
      const lineId = event.target.dataset.lineId;
      if (roomId !== state.activeRoomId || lineId !== state.activeLineId) {
        cleanupAbandonedBlankLines();
        state.activeRoomId = roomId;
        state.activeLineId = lineId;
        const target = getActiveLine();
        if (!target) return;
        $("activeRoomTitle").textContent = target.room.name;
        $("activeSurfaceSelect").innerHTML = surfaceOptions(target.line.substrate);
        $("lengthInput").value = target.line.length || "";
        $("widthInput").value = target.line.width || "";
        $("heightInput").value = target.line.height || "";
        $("qtyInput").value = Number(target.line.qty) || 1;
        $("notesInput").value = target.line.notes || "";
        updateSurfaceConfirmedBadge();
        renderRooms();
        renderOpenings(target.line);
        updateCalculations();
        save();
      }
    };
  });

  body.querySelectorAll(".painting-system-picker-btn").forEach(button => {
    button.onclick = () => openPaintSystemPicker(Number(button.dataset.roomId), button.dataset.lineId);
  });

  body.querySelectorAll("[data-leica-room]").forEach(button => {
    button.onclick = () => armLeicaCapture(Number(button.dataset.leicaRoom), button.dataset.leicaLine, button.dataset.leicaField);
  });
  body.querySelectorAll("[data-add-measurement]").forEach(button => button.onclick = () => addMeasurement(Number(button.dataset.addMeasurement)));
  body.querySelectorAll("[data-remove-any-line]").forEach(button => button.onclick = () => {
    const room = state.rooms.find(item => item.id === Number(button.dataset.removeAnyRoom));
    if (!room) return;
    const lineId = button.dataset.removeAnyLine;
    const isBase = button.dataset.isBase === "1";

    if (!isBase) {
      room.measurements = room.measurements.filter(line => String(line.id) !== String(lineId));
      if (String(state.activeLineId) === String(lineId)) state.activeLineId = "base";
      render();
      showToast("Measurement row removed");
      return;
    }

    // Deleting the base row: promote the first extra surface to take its place,
    // so the area itself survives with one row fewer — unless this was the
    // only row left, in which case deleting it means deleting the whole area.
    if (room.measurements.length > 0) {
      const promoted = room.measurements.shift();
      const { id, ...rest } = promoted;
      Object.assign(room, rest);
      if (String(state.activeLineId) === "base" || String(state.activeLineId) === String(promoted.id)) {
        state.activeLineId = "base";
      }
      render();
      showToast("Row removed — next surface promoted to the main row");
      return;
    }

    if (state.rooms.length <= 1) {
      showToast("A project needs at least one area");
      return;
    }
    if (!confirm(`Delete ${room.name}? This removes the whole area since it has no other rows.`)) return;
    state.rooms = state.rooms.filter(r => r.id !== room.id);
    if (state.activeRoomId === room.id) {
      state.activeRoomId = state.rooms[0].id;
      state.activeLineId = "base";
    }
    render();
    showToast("Area removed");
  });
}

function updateCalculations() {
  const room = activeRoom();
  if (!room) return;
  const area = roomTotalArea(room);
  const gross = roomGrossArea(room);
  const totalArea = estimateLines().reduce((sum, item) => sum + lineArea(item.line), 0);
  $("netArea").textContent = fmt(totalArea);
  $("grossArea").textContent = `Gross wall area ${fmt(gross)} sq ft`;
  const litres = totalArea * state.coats / state.coverage * 1.1;
  $("paintNeeded").textContent = `${litres.toFixed(1)} L paint`;
  const pricing = projectPricing();
  $("subtotalAmount").textContent = money(pricing.subtotal);
  $("discountAmount").textContent = `− ${money(pricing.discount)}`;
  $("gstAmount").textContent = `+ ${money(pricing.gst)}`;
  $("finalEstimate").textContent = money(pricing.total);
  $("projectEstimate").textContent = money(pricing.total);
  state.pricingSnapshot = {
    projectName: state.projectName,
    address: state.address,
    customerId: state.customerId || null,
    netAreaSqFt: totalArea,
    roomsSummary: estimateLines().map(({ room, line, isBase }) => ({
      roomName: room.name,
      lineName: isBase ? null : line.name,
      substrate: line.substrate || "",
      product: line.product || "",
      shade: line.shade || "",
      paintingType: line.paintingType || "",
      areaSqFt: lineArea(line),
      rate: Number(line.rate) || 0,
      total: lineTotal(line),
      notes: line.notes || ""
    })),
    subtotal: pricing.subtotal,
    discountPercent: state.discountPercent,
    gstPercent: state.gstPercent,
    total: pricing.total,
    updatedAt: new Date().toISOString()
  };
  persistMeasurementSnapshotForCustomer();
  const roomCard = document.querySelector(".room-item.active .room-area");
  if (roomCard) roomCard.textContent = `${fmt(area)} sq ft`;

  estimateLines().forEach(({room: lineRoom, line, lineId}) => {
    const row = document.querySelector(`[data-room-row-id="${lineRoom.id}"][data-line-row-id="${lineId}"]`);
    if (!row) return;
    ["length", "width", "height", "qty", "manualDeduction", "rate"].forEach(key => {
      const input = row.querySelector(`[data-room-key="${key}"]`);
      if (!input || document.activeElement === input) return;
      if (["length", "width", "height"].includes(key)) {
        input.value = Number(line[key]) || "";
      } else {
        input.value = Number(line[key]) || (key === "qty" ? 1 : 0);
      }
    });
    const netCell = row.querySelector(".net-cell");
    if (netCell) netCell.textContent = lineArea(line).toFixed(2);
    const openingLabel = row.querySelector(".line-deduction-cell small");
    if (openingLabel) openingLabel.textContent = `${openingDeduction(line).toFixed(2)} openings`;
    const lineTotalCell = row.querySelector(".line-total-cell");
    if (lineTotalCell) lineTotalCell.textContent = money(lineTotal(line));
  });
}

function render() {
  const room = activeRoom();
  if (!room && state.rooms.length) state.activeRoomId = state.rooms[0].id;
  if (!state.rooms.length) { addRoom("New Room"); return; }
  const current = activeRoom();
  $("projectName").value = state.projectName;
  $("projectAddress").value = state.address;
  if ($("customerPicker")) $("customerPicker").value = state.customerId || "";
  if ($("saveAsCustomerButton")) {
    const canSave = !state.customerId && state.projectName && state.projectName.trim() && state.projectName.trim() !== "Untitled Project";
    $("saveAsCustomerButton").classList.toggle("hidden", !canSave);
  }
  renderCustomerInfoBlock();
  $("firmPhone").value = state.firm.phone;
  $("firmEmail").value = state.firm.email;
  $("firmAddress").value = state.firm.address;
  $("firmGstin").value = state.firm.gstin || "";
  $("firmTagline").value = state.firm.tagline || "";
  if ($("brandTagline")) $("brandTagline").textContent = (state.firm.tagline || "Painting & Interior Services").split("\n")[0];
  $("preparedByBlock").value = state.firm.preparedByBlock || "";
  renderFirmLogo();
  const active = getActiveLine();
  $("activeRoomTitle").textContent = current.name;
  $("activeSurfaceSelect").innerHTML = surfaceOptions(active.line.substrate);
  $("lengthInput").value = active.line.length || "";
  $("widthInput").value = active.line.width || "";
  $("heightInput").value = active.line.height || "";
  $("qtyInput").value = Number(active.line.qty) || 1;
  $("notesInput").value = active.line.notes || "";
  updateSurfaceConfirmedBadge();
  $("coatsValue").textContent = state.coats;
  $("coverageInput").value = state.coverage;
  $("paintRateInput").value = state.paintRate;
  $("labourRateInput").value = state.labourRate;
  $("discountInput").value = state.discountPercent;
  $("gstInput").value = state.gstPercent;
  $("estimateDateInput").value = state.estimateDate;
  $("termsInput").value = state.terms;
  $("accountNameInput").value = state.payment.accountName;
  $("bankNameInput").value = state.payment.bankName;
  $("accountNumberInput").value = state.payment.accountNumber;
  $("ifscInput").value = state.payment.ifsc;
  $("branchInput").value = state.payment.branch;
  $("upiInput").value = state.payment.upi;
  $("scannerNoteInput").value = state.scanner.note;
  $("rateSheetUrlInput").value = state.rateSheetUrl;
  renderScanner();
  renderPaintSystemManager();
  renderRooms();
  renderOpenings(active.line);
  renderEstimateTable();
  updateCalculations();
  save();
}

function addRoom(name) {
  const id = Date.now();
  state.rooms.push({id, name: name || `Area ${state.rooms.length + 1}`, substrate:"Walls", product:"", shade:"", paintingType:"", paintSystem:"Custom", calculation:"surface", qty:1, manualDeduction:0, rate:0, length:0, width:0, height:0, openings:[], measurements:[], notes:"", confirmed:false});
  state.activeRoomId = id; state.activeLineId = "base"; render(); showToast("Area added");
}

function lineIsBlank(line, isBase) {
  const noDimensions = !Number(line.length) && !Number(line.width) && !Number(line.height);
  if (line.confirmed || !noDimensions) return false;
  if (isBase) return true;
  return !line.substrate && !(line.notes && line.notes.trim()) && (!line.openings || line.openings.length === 0);
}

function roomHasBlankLine(room) {
  if (lineIsBlank(room, true)) return true;
  return (room.measurements || []).some(m => lineIsBlank(m, false));
}

function addMeasurement(roomId) {
  const room = state.rooms.find(item => item.id === roomId);
  if (!room) return;
  if (roomHasBlankLine(room)) {
    showToast("Finish the current surface before adding another");
    return;
  }
  room.measurements.push({
    id: Date.now() + Math.floor(Math.random() * 1000),
    name: room.name,
    substrate: "",
    product: "",
    shade: "",
    paintingType: "",
    paintSystem: "Custom",
    calculation: "surface",
    length: 0,
    width: 0,
    height: 0,
    qty: 1,
    manualDeduction: 0,
    rate: 0,
    openings: [],
    notes: "",
    confirmed: false
  });
  state.activeRoomId = roomId;
  render();
  showToast(`Measurement row added to ${room.name}`);
}

function escapeHtml(text) {
  const div = document.createElement("div"); div.textContent = text; return div.innerHTML;
}
function escapeAttribute(text) {
  return escapeHtml(String(text)).replaceAll('"', "&quot;");
}
function getCustomList(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}
function addToCustomList(key, value) {
  if (!value) return;
  const list = getCustomList(key);
  if (!list.some(item => item.toLowerCase() === value.toLowerCase())) {
    list.push(value);
    localStorage.setItem(key, JSON.stringify(list));
  }
}

function surfaceOptions(selected) {
  const presets = ["Walls", "Wall Texture", "Ceiling", "Windows", "Doors", "Wood Work", "Metal / Grills", "Wardrobe / Furniture", "Exterior Facade", ...getCustomList("dmnCustomSurfaces")];
  const isCustomExisting = selected && !presets.includes(selected);
  return `<option value="" ${!selected ? "selected" : ""} disabled>Select surface</option>${
    presets.map(p => `<option value="${escapeAttribute(p)}" ${p === selected ? "selected" : ""}>${escapeHtml(p)}</option>`).join("")
  }${isCustomExisting ? `<option value="${escapeAttribute(selected)}" selected>${escapeHtml(selected)}</option>` : ""}<option value="__custom__">Other (type manually)…</option>`;
}
function productOptions(selected) {
  const products = [...new Set(state.paintSystems.filter(system => system.product).map(system => system.product))];
  return `<option value="" ${!selected ? "selected" : ""} disabled>Select product</option>${products.map(product => `<option value="${escapeAttribute(product)}" ${product === selected ? "selected" : ""}>${escapeHtml(product)}</option>`).join("")}`;
}
function paintingTypeOptions(selected, product) {
  const types = [...new Set(state.paintSystems.filter(system => system.product === product && system.paintingType).map(system => system.paintingType))];
  return `<option value="" ${!selected ? "selected" : ""} disabled>Select painting type</option>${types.map(type => `<option value="${escapeAttribute(type)}" ${type === selected ? "selected" : ""}>${escapeHtml(type)}</option>`).join("")}`;
}
function paintSystemButtonLabel(selected, product, paintingType) {
  if (!selected) return `<span class="ps-picker-placeholder">Select your painting system</span>`;
  if (selected === "Custom") return `Custom / manual rate`;
  const match = state.paintSystems.find(system => system.product === product && system.paintingType === paintingType && system.name === selected);
  const rate = match ? `₹${Number(match.rate) || 0}/sq ft` : "";
  return `<span class="ps-picker-text">${escapeHtml(selected)}</span>${rate ? `<span class="ps-picker-rate">${rate}</span>` : ""}`;
}

function applyPaintSystemSelection(roomId, lineId, value) {
  const target = findEstimateLine(roomId, lineId);
  if (!target) return;
  const { line } = target;

  if (value === "Custom") {
    const name = prompt("Name this custom painting system (it will be saved for future use)", "");
    if (name && name.trim()) {
      state.paintSystems.push({
        id: "SYS" + Date.now(),
        name: name.trim(),
        product: line.product || "",
        paintingType: line.paintingType || "",
        substrate: line.substrate || "",
        rate: Number(line.rate) || 0
      });
      line.paintSystem = name.trim();
    } else {
      line.paintSystem = "Custom";
    }
  } else {
    line.paintSystem = value;
    const selectedSystem = state.paintSystems.find(system => system.product === line.product && system.paintingType === line.paintingType && system.name === value);
    if (selectedSystem) {
      line.rate = Number(selectedSystem.rate) || 0;
      if (selectedSystem.substrate) line.substrate = selectedSystem.substrate;
    }
  }

  renderEstimateTable();
  updateCalculations();
  renderRooms();
  save();
}

function openPaintSystemPicker(roomId, lineId) {
  const target = findEstimateLine(roomId, lineId);
  if (!target) return;
  const { line } = target;

  const options = state.paintSystems.filter(system => system.product === line.product && system.paintingType === line.paintingType && system.name);
  const listEl = $("paintSystemPickerList");
  listEl.innerHTML = options.map(system => `
    <button type="button" class="ps-picker-option ${system.name === line.paintSystem ? "selected" : ""}" data-value="${escapeAttribute(system.name)}">
      <span class="ps-picker-option-text">${escapeHtml(system.name)}</span>
      <span class="ps-picker-option-rate">₹${Number(system.rate) || 0}/sq ft</span>
    </button>
  `).join("") + `
    <button type="button" class="ps-picker-option ${line.paintSystem === "Custom" ? "selected" : ""}" data-value="Custom">
      <span class="ps-picker-option-text">Custom / manual rate</span>
    </button>
  `;

  listEl.querySelectorAll("[data-value]").forEach(btn => {
    btn.addEventListener("click", () => {
      applyPaintSystemSelection(roomId, lineId, btn.dataset.value);
      closePaintSystemPicker();
    });
  });

  $("paintSystemPickerModal").showModal();
}

function closePaintSystemPicker() {
  $("paintSystemPickerModal").close();
}
function showToast(message) {
  $("toast").textContent = message; $("toast").classList.add("show");
  clearTimeout(window.toastTimer); window.toastTimer = setTimeout(()=>$("toast").classList.remove("show"), 2200);
}

$("todayLabel").textContent = new Intl.DateTimeFormat("en-IN",{day:"numeric",month:"short",year:"numeric"}).format(new Date());
$("projectName").oninput = e => { state.projectName=e.target.value; save(); };
$("projectAddress").oninput = e => { state.address=e.target.value; save(); };
$("firmPhone").oninput = e => { state.firm.phone=e.target.value; save(); };
$("firmEmail").oninput = e => { state.firm.email=e.target.value; save(); };
$("firmAddress").oninput = e => { state.firm.address=e.target.value; save(); };
$("firmGstin").oninput = e => { state.firm.gstin=e.target.value; save(); };
$("firmTagline").oninput = e => {
  state.firm.tagline = e.target.value;
  if ($("brandTagline")) $("brandTagline").textContent = (e.target.value || "Painting & Interior Services").split("\n")[0];
  save();
};
$("preparedByBlock").oninput = e => { state.firm.preparedByBlock=e.target.value; save(); };
$("logoUploadButton").onclick = () => $("logoInput").click();
$("logoRemoveButton").onclick = () => {
  state.firm.logo = "";
  state.firm.logoConfigured = true;
  $("logoInput").value = "";
  renderFirmLogo();
  save();
  showToast("Logo removed");
};
$("logoInput").onchange = event => {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) return showToast("Please choose an image file");

  const reader = new FileReader();
  reader.onload = () => {
    const image = new Image();
    image.onload = () => {
      const maxWidth = 600;
      const maxHeight = 240;
      const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      state.firm.logo = canvas.toDataURL("image/png");
      state.firm.logoConfigured = true;
      renderFirmLogo();
      save();
      showToast("Firm logo uploaded");
    };
    image.onerror = () => showToast("This logo file could not be read");
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
};
[["lengthInput","length"],["widthInput","width"],["heightInput","height"],["qtyInput","qty"]].forEach(([id,key]) => $(id).oninput = e => {
  const target = getActiveLine();
  target.line[key] = Number(e.target.value);
  target.line.confirmed = false;
  updateCalculations();
  updateSurfaceConfirmedBadge();
  save();
});
$("notesInput").oninput = e => { getActiveLine().line.notes=e.target.value; save(); };
$("coverageInput").oninput = e => { state.coverage=Math.max(1,Number(e.target.value)); updateCalculations(); save(); };
$("paintRateInput").oninput = e => { state.paintRate=Number(e.target.value); updateCalculations(); save(); };
$("labourRateInput").oninput = e => { state.labourRate=Number(e.target.value); updateCalculations(); save(); };
$("discountInput").oninput = e => { state.discountPercent=Math.min(100,Math.max(0,Number(e.target.value)||0)); updateCalculations(); save(); };
$("gstInput").oninput = e => { state.gstPercent=Math.min(100,Math.max(0,Number(e.target.value)||0)); updateCalculations(); save(); };
$("estimateDateInput").oninput = e => { state.estimateDate=e.target.value; save(); };
$("termsInput").oninput = e => { state.terms=e.target.value; save(); };
[["accountNameInput","accountName"],["bankNameInput","bankName"],["accountNumberInput","accountNumber"],["ifscInput","ifsc"],["branchInput","branch"],["upiInput","upi"]].forEach(([id,key]) => {
  $(id).oninput = e => { state.payment[key]=e.target.value; save(); };
});
$("scannerNoteInput").oninput = e => { state.scanner.note=e.target.value; save(); };
$("rateSheetUrlInput").onchange = e => { state.rateSheetUrl=e.target.value.trim(); save(); syncRateSheet(); };
$("syncRateSheetButton").onclick = () => syncRateSheet();
document.querySelectorAll("[data-doc-tab]").forEach(button => button.onclick = () => {
  document.querySelectorAll("[data-doc-tab]").forEach(tab => {
    const active = tab === button;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });
  document.querySelectorAll("[data-doc-panel]").forEach(panel => {
    const active = panel.dataset.docPanel === button.dataset.docTab;
    panel.classList.toggle("active", active);
    panel.hidden = !active;
  });
});
$("scannerUploadButton").onclick = () => $("scannerInput").click();
$("scannerRemoveButton").onclick = () => {
  state.scanner.image = "";
  $("scannerInput").value = "";
  renderScanner();
  save();
  showToast("Payment scanner removed");
};
$("scannerInput").onchange = event => {
  const file = event.target.files[0];
  if (!file || !file.type.startsWith("image/")) return;
  const reader = new FileReader();
  reader.onload = () => {
    const image = new Image();
    image.onload = () => {
      const maxSize = 700;
      const scale = Math.min(1, maxSize / image.width, maxSize / image.height);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      state.scanner.image = canvas.toDataURL("image/png");
      renderScanner();
      save();
      showToast("Payment scanner uploaded");
    };
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
};
document.querySelectorAll("[data-step]").forEach(b => b.onclick = () => { state.coats=Math.max(1,Math.min(5,state.coats+Number(b.dataset.step))); render(); });
$("addRoomButton").onclick = () => { const name=prompt("Area name",`Area ${state.rooms.length+1}`); if(name?.trim()) addRoom(name.trim()); };
$("addEstimateRowButton").onclick = () => addRoom(`Area ${state.rooms.length + 1}`);
$("addMeasurementButton").onclick = () => addMeasurement(state.activeRoomId);
$("addPaintSystemButton").onclick = () => {
  state.paintSystems.push({id:`manual-${Date.now()}`,product:"",paintingType:"",name:"",substrate:"",rate:0,source:"manual"});
  renderPaintSystemManager();
  save();
};
$("addOpeningButton").onclick = () => { getActiveLine().line.openings.push({type:"",width:1,height:1,qty:1}); render(); };

$("activeSurfaceSelect").oninput = e => {
  const target = getActiveLine();
  if (!target) return;
  if (e.target.value === "__custom__") {
    const custom = prompt("Enter a custom surface name", target.line.substrate || "");
    target.line.substrate = custom?.trim() || target.line.substrate || "";
    addToCustomList("dmnCustomSurfaces", target.line.substrate);
    render();
  } else {
    target.line.substrate = e.target.value;
  }
  target.line.confirmed = false;
  updateSurfaceConfirmedBadge();
  renderEstimateTable();
  save();
};

function addSurfaceAndActivate() {
  const roomId = state.activeRoomId;
  const room = activeRoom();
  if (!room) return;
  const beforeCount = room.measurements.length;
  addMeasurement(roomId);
  if (room.measurements.length === beforeCount) return; // blocked — current line still blank
  const newLine = room.measurements[room.measurements.length - 1];
  state.activeLineId = String(newLine.id);
  render();
  save();
}

$("confirmSurfaceButton").onclick = () => {
  const target = getActiveLine();
  if (!target) return;
  const hasMeasurement = Number(target.line.length) > 0 || Number(target.line.width) > 0 || Number(target.line.height) > 0;
  if (!hasMeasurement) {
    showToast("Enter a length, width, or height before confirming");
    return;
  }
  target.line.confirmed = true;
  const confirmedLabel = target.line.substrate || target.line.name;
  renderEstimateTable();
  updateSurfaceConfirmedBadge();
  save();
  showToast(`${confirmedLabel} confirmed ✓`);
};

$("addSurfaceButton").onclick = addSurfaceAndActivate;
$("deleteRoomButton").onclick = () => { if(state.rooms.length<=1) return showToast("A project needs at least one area"); if(confirm(`Delete ${activeRoom().name}?`)){state.rooms=state.rooms.filter(r=>r.id!==state.activeRoomId);state.activeRoomId=state.rooms[0].id;state.activeLineId="base";render();} };
function startFreshProject() {
  const firm={...state.firm};const payment={...state.payment};const scanner={...state.scanner};const paintSystems=state.paintSystems.map(system=>({...system}));
  state=structuredClone(defaultState);state.firm=firm;state.payment=payment;state.scanner=scanner;state.paintSystems=paintSystems;
  state.projectName="Untitled Project";state.estimateDate=new Date().toISOString().slice(0,10);
  state.rooms=[{id:Date.now(),name:"Area 1",substrate:"Walls",product:"",shade:"",paintingType:"",paintSystem:"Custom",calculation:"surface",qty:1,manualDeduction:0,rate:0,length:0,width:0,height:0,openings:[],measurements:[],notes:""}];
  state.activeRoomId=state.rooms[0].id;
  render();
  save();
}

$("newProjectButton").onclick = () => { if(confirm("Start a new project? Current data stays saved until you confirm.")){ startFreshProject(); showToast("New project ready"); } };
$("themeButton").onclick = () => document.body.classList.toggle("dark");
$("photoButton").onclick = () => $("photoInput").click();
$("photoInput").onchange = e => { const file=e.target.files[0]; if(!file)return; const reader=new FileReader();reader.onload=()=>{const p=$("photoPreview");p.style.backgroundImage=`url(${reader.result})`;p.hidden=false;showToast("Photo added to this visit");};reader.readAsDataURL(file); };

function setLeicaStatus(message, mode = "") {
  const status = $("leicaStatus");
  status.className = `leica-status ${mode}`.trim();
  status.innerHTML = `<i></i> ${escapeHtml(message)}`;
}

function armLeicaCapture(roomId, lineId, field) {
  const target = findEstimateLine(roomId, lineId);
  if (!target) return;
  leicaTarget = { roomId, lineId, field };
  renderEstimateTable();
  setLeicaStatus(`Waiting for ${target.line.name} ${field} — press MEASURE on DISTO`, "waiting");
  if (!leicaCharacteristic) showToast("Connect Leica DISTO X3 first, or enter manually");
}

function handleLeicaMeasurement(event) {
  if (!leicaTarget) {
    setLeicaStatus("Reading received — select an L, W or H target", "connected");
    return;
  }
  const view = event.target.value;
  if (!view || view.byteLength < 4) return;
  const metres = view.getFloat32(0, true);
  const feet = metres * 3.280839895;
  const target = findEstimateLine(leicaTarget.roomId, leicaTarget.lineId);
  if (!target || !Number.isFinite(feet)) return;
  const field = leicaTarget.field;
  target.line[field] = Number(feet.toFixed(2));
  target.line.confirmed = false;
  if (target.room.id === state.activeRoomId && String(leicaTarget.lineId) === String(state.activeLineId)) {
    $(`${field}Input`).value = target.line[field];
    updateSurfaceConfirmedBadge();
  }
  leicaTarget = null;
  renderEstimateTable();
  updateCalculations();
  save();
  setLeicaStatus(`${feet.toFixed(2)} ft captured to ${target.line.name} ${field}`, "connected");
  showToast("Leica measurement captured");
}

async function connectLeica() {
  if (!navigator.bluetooth) {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (isIOS) {
      setLeicaStatus("Enable the beacio extension: Settings > Apps > Safari > Extensions", "error");
      showToast("Install the free beacio app, then turn it on in Safari Extensions settings");
    } else {
      setLeicaStatus("X3 connection needs Chrome or Edge with Web Bluetooth", "error");
      showToast("Web Bluetooth is not available in this browser");
    }
    return;
  }
  try {
    setLeicaStatus("Choose your Leica DISTO X3…", "waiting");
    leicaDevice = await navigator.bluetooth.requestDevice({
      filters: [
        { namePrefix: "DISTO X3" },
        { namePrefix: "DISTO" },
        { services: [DISTO_SERVICE] }
      ],
      optionalServices: [DISTO_SERVICE]
    });
    leicaDevice.addEventListener("gattserverdisconnected", () => {
      leicaCharacteristic = null;
      setLeicaStatus("Leica disconnected — manual entry active", "error");
    });
    const server = await leicaDevice.gatt.connect();
    const service = await server.getPrimaryService(DISTO_SERVICE);
    let detectedModel = leicaDevice.name || "Leica DISTO X3";
    try {
      const modelCharacteristic = await service.getCharacteristic(DISTO_MODEL);
      const modelValue = await modelCharacteristic.readValue();
      const modelText = new TextDecoder().decode(modelValue).replace(/\0/g, "").trim();
      if (modelText) detectedModel = modelText.includes("DISTO") ? modelText : `Leica DISTO ${modelText}`;
    } catch {
      // Some X3 firmware versions do not expose a readable model characteristic.
    }
    leicaCharacteristic = await service.getCharacteristic(DISTO_DISTANCE);
    await leicaCharacteristic.startNotifications();
    leicaCharacteristic.addEventListener("characteristicvaluechanged", handleLeicaMeasurement);
    const isX3 = detectedModel.toUpperCase().includes("X3") || (leicaDevice.name || "").toUpperCase().includes("X3");
    setLeicaStatus(`${detectedModel} connected${isX3 ? "" : " — X3 profile active"}`, "connected");
    $("connectLeicaButton").classList.add("connected");
    $("connectLeicaButton").lastChild.textContent = " Leica X3 connected";
    showToast("Leica DISTO X3 connected");
  } catch (error) {
    const cancelled = error?.name === "NotFoundError";
    setLeicaStatus(cancelled ? "Connection cancelled — manual entry active" : "Could not connect to DISTO X3", "error");
    if (!cancelled) showToast("On the X3, switch Bluetooth ON and keep it within 10 metres");
  }
}
$("connectLeicaButton").onclick = connectLeica;

if (location.protocol === "file:") {
  setLeicaStatus("For X3 connection, open with “Start Decor My Nest.bat”", "error");
} else if (!navigator.bluetooth) {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  setLeicaStatus(
    isIOS
      ? "Enable the beacio extension: Settings > Apps > Safari > Extensions"
      : "Open this page in Microsoft Edge or Chrome for X3 connection",
    "error"
  );
}

function preparedBySectionHtml() {
  const text = (state.firm.preparedByBlock || "").trim();
  if (!text) return "";
  return `<div class="report-prepared-by">${escapeHtml(text)}</div>`;
}

function buildReportHeaderHtml(dateLabel, dateValue, docTypeLabel) {
  const firmDetailRows = [
    [firm => firm.address, `<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>`],
    [firm => firm.phone, `<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z"/>`],
    [firm => firm.email, `<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/>`]
  ];
  const firmDetails = firmDetailRows
    .filter(([get]) => get(state.firm))
    .map(([get, icon]) => `<div><svg viewBox="0 0 24 24">${icon}</svg><span>${escapeHtml(get(state.firm))}</span></div>`)
    .join("");

  let linkedCustomer = null;
  try {
    const allCustomers = JSON.parse(localStorage.getItem("dmnCustomers")) || [];
    linkedCustomer = allCustomers.find(c => String(c.id) === String(state.customerId)) || null;
  } catch { linkedCustomer = null; }
  const customerName = linkedCustomer?.name || (state.customerId ? state.projectName : "");
  const customerMobile = linkedCustomer?.mobile || state.customerMobile || "";
  const customerAddress = linkedCustomer?.address || linkedCustomer?.locality || (state.customerId ? state.address : "");
  const customerEmail = linkedCustomer?.email || "";
  const customerDetailRows = [
    [customerAddress, `<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>`],
    [customerMobile, `<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z"/>`],
    [customerEmail, `<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/>`]
  ];
  const customerDetails = customerDetailRows
    .filter(([value]) => value)
    .map(([value, icon]) => `<div><svg viewBox="0 0 24 24">${icon}</svg><span>${escapeHtml(value)}</span></div>`)
    .join("");
  const projectNameLower = (state.projectName || "").trim().toLowerCase();
  const customerNameLower = (customerName || "").trim().toLowerCase();
  const showCustomerName = customerName && customerNameLower !== projectNameLower && !projectNameLower.startsWith(customerNameLower);
  const customerBlock = (customerName && (showCustomerName || customerDetails)) ? `<div class="report-customer">${showCustomerName ? `<strong>${escapeHtml(customerName)}</strong>` : ""}${customerDetails ? `<div class="report-firm-details">${customerDetails}</div>` : ""}</div>` : "";

  const reportLogo = state.firm.logo
    ? `<img class="report-logo" src="${state.firm.logo}" alt="Decor My Nest logo">`
    : "";

  const siteAddressLc = (state.address || "").trim().toLowerCase();
  const customerAddressLc = (customerAddress || "").trim().toLowerCase();
  const showSiteAddress = state.address && siteAddressLc !== customerAddressLc;

  return {
    headerHtml: `${docTypeLabel ? `<div class="report-doc-type">${escapeHtml(docTypeLabel)}</div>` : ""}<div class="report-header-row"><div class="report-company">${reportLogo}<div><div class="report-brand">Decor My Nest</div><div class="report-firm-tagline">${escapeHtml(state.firm.tagline)}</div>${firmDetails ? `<div class="report-firm-details">${firmDetails}</div>` : ""}</div></div><div class="report-date-block"><span>${dateLabel}</span><strong>${dateValue}</strong></div></div><div class="report-title">${escapeHtml(state.projectName)}</div>${showSiteAddress ? `<div class="report-meta">${escapeHtml(state.address)}</div>` : ""}${customerBlock}`,
    customerName
  };
}

function createReport() {
  cleanupAbandonedBlankLines();
  const rows = estimateLines().map(({room,line,isBase})=>{const roomIndex=state.rooms.indexOf(room)+1;const lineIndex=isBase?1:room.measurements.indexOf(line)+2;return `<tr><td>${roomIndex}.${lineIndex}</td><td>${escapeHtml(line.name)}</td><td>${escapeHtml(line.substrate)}</td><td>${escapeHtml(line.product || "")}</td><td>${escapeHtml(line.shade || "")}</td><td>${escapeHtml(line.paintingType || "")}</td><td>${escapeHtml(line.paintSystem)}</td><td>${line.length} × ${line.width} × ${line.height} × ${line.qty}</td><td>${lineDeduction(line).toFixed(2)}</td><td>${lineArea(line).toFixed(2)} sq ft</td><td>${money(line.rate)}</td><td>${money(lineTotal(line))}</td></tr>`}).join("");
  const totalArea=estimateLines().reduce((sum,item)=>sum+lineArea(item.line),0);
  const pricing=projectPricing();
  const estimateDate = state.estimateDate ? new Intl.DateTimeFormat("en-IN",{day:"numeric",month:"short",year:"numeric"}).format(new Date(`${state.estimateDate}T00:00:00`)) : $("todayLabel").textContent;
  const { headerHtml } = buildReportHeaderHtml("Estimate Date", estimateDate, "ESTIMATE");
  const paymentRows = [["Account holder",state.payment.accountName],["Bank",state.payment.bankName],["Account number",state.payment.accountNumber],["IFSC",state.payment.ifsc],["Branch",state.payment.branch],["UPI ID",state.payment.upi]].filter(([,value])=>value).map(([label,value])=>`<div><span>${label}</span><strong>${escapeHtml(value)}</strong></div>`).join("");
  const paymentSection = paymentRows || state.scanner.image ? `<div class="report-payment"><div><h3>Payment details</h3>${paymentRows}</div>${state.scanner.image ? `<div class="report-scanner"><img src="${state.scanner.image}" alt="Payment QR code"><small>${escapeHtml(state.scanner.note)}</small></div>` : ""}</div>` : "";
  const termsSection = state.terms.trim() ? `<div class="report-terms"><h3>Terms & Conditions</h3><p>${escapeHtml(state.terms)}</p></div>` : "";
  $("reportContent").innerHTML=`${headerHtml}<div class="report-table-wrap"><table class="report-table detailed-report-table"><thead><tr><th>S.No.</th><th>AREA / WORK</th><th>SURFACE</th><th>PRODUCT</th><th>SHADE / COLOUR</th><th>PAINTING TYPE</th><th>PAINTING SYSTEM</th><th>L × W × H × QTY</th><th>DEDUCTION</th><th>NET AREA</th><th>RATE</th><th>TOTAL</th></tr></thead><tbody>${rows}</tbody></table></div><div class="report-pricing"><div><span>Subtotal</span><strong>${money(pricing.subtotal)}</strong></div><div><span>Discount (${state.discountPercent}%)</span><strong>− ${money(pricing.discount)}</strong></div><div><span>GST (${state.gstPercent}%)</span><strong>+ ${money(pricing.gst)}</strong></div></div><div class="report-total"><span>Final estimated value · ${fmt(totalArea)} sq ft</span><strong>${money(pricing.total)}</strong></div>${paymentSection}${termsSection}<p class="report-disclaimer">This is a preliminary estimate based on site measurements. Final pricing may vary after surface inspection, product selection, scope confirmation, and actual site conditions. Material quantities are not included.</p>${preparedBySectionHtml()}`;
  $("reportDialog").showModal();
}

function createMaintenanceSheet() {
  cleanupAbandonedBlankLines();
  const rows = estimateLines().map(({room,line,isBase})=>{
    const roomIndex=state.rooms.indexOf(room)+1;
    const lineIndex=isBase?1:room.measurements.indexOf(line)+2;
    return `<tr><td>${roomIndex}.${lineIndex}</td><td>${escapeHtml(line.name)}</td><td>${escapeHtml(line.substrate)}</td><td>${escapeHtml(line.product || "—")}</td><td>${escapeHtml(line.shade || "—")}</td><td>${escapeHtml(line.paintingType || "—")}</td><td>${escapeHtml(line.paintSystem || "—")}</td></tr>`;
  }).join("");
  const today = new Intl.DateTimeFormat("en-IN",{day:"numeric",month:"short",year:"numeric"}).format(new Date());
  const { headerHtml, customerName } = buildReportHeaderHtml("Sheet Date", today, "SITE DATA SHEET");
  $("reportContent").innerHTML=`${headerHtml}<div class="report-table-wrap"><table class="report-table"><thead><tr><th>S.No.</th><th>AREA / WORK</th><th>SURFACE</th><th>PRODUCT</th><th>SHADE / COLOUR</th><th>PAINTING TYPE</th><th>PAINTING SYSTEM</th></tr></thead><tbody>${rows}</tbody></table></div><p class="report-disclaimer">This site data sheet lists the exact products, shades, and painting systems used across the property${customerName ? ` at ${escapeHtml(customerName)}` : ""}. Keep this for future touch-ups, repainting, or maintenance reference — quoting the same product and shade will help match the existing finish.</p>${preparedBySectionHtml()}`;
  $("reportDialog").showModal();
}
$("siteDataSheetButton").onclick = createMaintenanceSheet;

$("shareButton").onclick=createReport;
$("dialogClose").onclick=()=>$("reportDialog").close();
$("closePaintSystemPicker").onclick = closePaintSystemPicker;
$("printButton").onclick=()=>window.print();

async function exportReportAsPdf() {
  const button = $("savePdfButton");
  const originalLabel = button.textContent;
  button.textContent = "Generating PDF…";
  button.disabled = true;

  try {
    const source = $("reportContent");
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

    const fileName = `${(state.projectName || "Estimate").replace(/[^a-z0-9]+/gi, "-")}-quotation.pdf`;
    pdf.save(fileName);
    showToast("PDF saved");
  } catch (err) {
    console.error(err);
    showToast("Couldn't generate PDF — try 'Print instead'");
  } finally {
    button.textContent = originalLabel;
    button.disabled = false;
  }
}

$("savePdfButton").onclick = exportReportAsPdf;
$("createQuotationButton").onclick=()=>{
  cleanupAbandonedBlankLines();
  updateCalculations();
  save();
  localStorage.setItem("dmnQuotationDraft", JSON.stringify(state.pricingSnapshot));
  window.location.href = "../index.html?module=quotations";
};

// Arriving here via a Projects/Project-detail "Measure" quick-launch link
// (?customerId=...&projectName=...&address=...) prefills the site details,
// confirming first since it can overwrite whatever's currently on screen.
(function applyLaunchParams() {
  const params = new URLSearchParams(window.location.search);

  if (params.get("scrollTo") === "rateSheet") {
    setTimeout(() => {
      const el = document.getElementById("rateSheetSection");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 300);
  }

  if (params.get("fresh") === "1") {
    startFreshProject();
    showToast("New measurement ready");
    return;
  }

  const customerId = params.get("customerId");
  const launchProjectName = params.get("projectName");
  const launchAddress = params.get("address");

  if (!customerId && !launchProjectName && !launchAddress) return;

  const proceed = confirm("Open this customer's measurement here? Your current unsaved work stays saved until you confirm.");
  if (!proceed) return;

  if (customerId) {
    state.customerId = customerId;
    const customer = crmCustomers.find(c => c.id === customerId);
    if (customer) {
      state.customerMobile = customer.mobile || "";
      if (!launchProjectName) state.projectName = customer.name;
      if (!launchAddress) state.address = customer.locality || customer.address || state.address;
    }
  }
  if (launchProjectName) state.projectName = launchProjectName;
  if (launchAddress) state.address = launchAddress;

  updateCalculations();
  save();
})();

render();
syncRateSheet({silent:true});
setInterval(() => syncRateSheet({silent:true}), 15000);
