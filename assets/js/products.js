// ========================================
// Decor My Nest Studio App
// Products (catalog) module
// ========================================

(function () {

  const PRODUCTS_KEY = "dmnProducts";

  let products = [];
  try {
    products = JSON.parse(localStorage.getItem(PRODUCTS_KEY)) || [];
  } catch {
    products = [];
  }

  function persistProducts() {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
  }

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

  function getCustomList(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch {
      return [];
    }
  }
  function addToCustomList(key, value) {
    const list = getCustomList(key);
    if (!list.includes(value)) {
      list.push(value);
      localStorage.setItem(key, JSON.stringify(list));
    }
  }

  const DEFAULT_CATEGORIES = ["Interior Emulsion", "Exterior Emulsion", "Waterproofing", "Wood Finish", "Metal Finish", "Primer", "Putty", "Textured / Specialty", "Wallpaper", "Other"];

  function categoryOptionsHtml(selected) {
    const presets = [...DEFAULT_CATEGORIES, ...getCustomList("dmnCustomProductCategories")];
    const isCustomExisting = selected && !presets.includes(selected);
    return `<option value="" ${!selected ? "selected" : ""} disabled>Select category</option>${
      presets.map(p => `<option value="${escapeHtml(p)}" ${p === selected ? "selected" : ""}>${escapeHtml(p)}</option>`).join("")
    }${isCustomExisting ? `<option value="${escapeHtml(selected)}" selected>${escapeHtml(selected)}</option>` : ""}<option value="__custom__">+ New category…</option>`;
  }

  function filterCategoryOptionsHtml() {
    const used = [...new Set(products.map(p => p.category).filter(Boolean))].sort();
    return `<option value="">All categories</option>${used.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("")}`;
  }

  // ---------- Rendering the grid ----------

  const searchInput = document.getElementById("searchProduct");
  const filterCategory = document.getElementById("filterProductCategory");

  const CARD_PALETTE = ["prod-card-violet", "prod-card-teal", "prod-card-green", "prod-card-amber", "prod-card-rose", "prod-card-blue"];
  function cardColorClass(category) {
    let hash = 0;
    for (let i = 0; i < (category || "").length; i++) hash = (hash * 31 + category.charCodeAt(i)) >>> 0;
    return CARD_PALETTE[hash % CARD_PALETTE.length];
  }

  function render() {
    filterCategory.innerHTML = filterCategoryOptionsHtml();

    const query = (searchInput.value || "").trim().toLowerCase();
    const categoryFilter = filterCategory.value;

    let list = products.filter(p => {
      const matchesQuery = !query || [p.brand, p.name, p.category, p.finish].some(v => (v || "").toLowerCase().includes(query));
      const matchesCategory = !categoryFilter || p.category === categoryFilter;
      return matchesQuery && matchesCategory;
    });
    list = list.sort((a, b) => (a.brand || "").localeCompare(b.brand || "") || (a.name || "").localeCompare(b.name || ""));

    const grid = document.getElementById("productsGrid");
    const empty = document.getElementById("productsEmpty");
    empty.classList.toggle("hidden", products.length > 0);
    grid.classList.toggle("hidden", products.length === 0);

    if (!list.length && products.length) {
      grid.innerHTML = `<p class="crm-no-match" style="grid-column:1/-1;">No products match your search.</p>`;
      return;
    }

    const paintSystems = readPaintSystems();
    const rateSheetProductNames = new Set(paintSystems.map(s => (s.product || "").trim().toLowerCase()));

    grid.innerHTML = list.map(p => {
      const priceLine = p.pricePerLitre ? `${formatAmount(p.pricePerLitre)}<span>/ litre</span>` : (p.packSizes && p.packSizes[0] ? `From ${formatAmount(p.packSizes[0].price)}` : "Price on request");
      const inRateSheet = rateSheetProductNames.has(p.name.trim().toLowerCase());
      return `
        <div class="product-card ${cardColorClass(p.category)} ${p.photo ? "has-photo" : ""}" data-view-product="${p.id}">
          ${p.photo ? `<img src="${p.photo}" class="product-card-photo" alt="${escapeHtml(p.name)}">` : ""}
          <span class="product-card-category">${escapeHtml(p.category) || "Uncategorized"}${inRateSheet ? ` · <span class="product-card-linked">✓ in rate sheet</span>` : ""}</span>
          <div class="product-card-brand">${escapeHtml(p.brand)}</div>
          <div class="product-card-name">${escapeHtml(p.name)}</div>
          ${p.warrantyYears ? `<div class="product-card-warranty"><strong>${p.warrantyYears}</strong><span>YEARS<br>WARRANTY</span></div>` : `<div class="product-card-meta">${p.finish ? `<span>${escapeHtml(p.finish)}</span>` : ""}${p.coverage ? `<span>${p.coverage} sq ft/L</span>` : ""}</div>`}
          <div class="product-card-footer">
            <span class="product-card-price">${priceLine}</span>
            <span class="product-card-explore">Explore →</span>
          </div>
        </div>
      `;
    }).join("");

    grid.querySelectorAll("[data-view-product]").forEach(card => {
      card.addEventListener("click", () => showProductDetail(card.dataset.viewProduct));
    });
  }

  searchInput.addEventListener("input", render);
  filterCategory.addEventListener("change", render);

  // ---------- Add / Edit modal ----------

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

  let editingProductId = null;
  let currentPackSizes = [];
  let currentFeatures = [];
  let currentPhoto = null;

  const productModal = document.getElementById("productModal");
  const productModalTitle = document.getElementById("productModalTitle");
  const prodBrand = document.getElementById("prodBrand");
  const prodName = document.getElementById("prodName");
  const prodPhotoInput = document.getElementById("prodPhoto");
  const prodPhotoPreview = document.getElementById("prodPhotoPreview");
  const prodCategory = document.getElementById("prodCategory");
  const prodFinish = document.getElementById("prodFinish");
  const prodCoverage = document.getElementById("prodCoverage");
  const prodPrice = document.getElementById("prodPrice");
  const prodWarranty = document.getElementById("prodWarranty");
  const prodDescription = document.getElementById("prodDescription");
  const deleteProductBtn = document.getElementById("deleteProduct");

  prodPhotoInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    readAndResizeImage(file, dataUrl => {
      currentPhoto = dataUrl;
      prodPhotoPreview.innerHTML = `<img src="${dataUrl}" alt="Product photo">`;
      prodPhotoPreview.classList.remove("hidden");
    });
  });

  prodCategory.addEventListener("change", () => {
    if (prodCategory.value === "__custom__") {
      const custom = prompt("Enter a new product category", "");
      if (custom && custom.trim()) {
        addToCustomList("dmnCustomProductCategories", custom.trim());
        prodCategory.innerHTML = categoryOptionsHtml(custom.trim());
      } else {
        prodCategory.innerHTML = categoryOptionsHtml("");
      }
    }
  });

  function renderPackSizesList() {
    const wrap = document.getElementById("prodPackSizesList");
    if (!currentPackSizes.length) {
      wrap.innerHTML = `<p class="crm-muted prod-packsize-empty">No pack sizes added.</p>`;
      return;
    }
    wrap.innerHTML = currentPackSizes.map((ps, i) => `
      <div class="prod-packsize-row" data-index="${i}">
        <input type="text" class="ps-size" placeholder="e.g. 4 L" value="${escapeHtml(ps.size)}">
        <input type="number" class="ps-price" placeholder="Price ₹" min="0" value="${ps.price ?? ""}">
        <button type="button" class="crm-icon-btn ps-remove" aria-label="Remove">×</button>
      </div>
    `).join("");

    wrap.querySelectorAll(".prod-packsize-row").forEach(row => {
      const i = Number(row.dataset.index);
      row.querySelector(".ps-size").addEventListener("input", e => { currentPackSizes[i].size = e.target.value; });
      row.querySelector(".ps-price").addEventListener("input", e => { currentPackSizes[i].price = e.target.value; });
      row.querySelector(".ps-remove").addEventListener("click", () => {
        currentPackSizes.splice(i, 1);
        renderPackSizesList();
      });
    });
  }

  document.getElementById("btnAddPackSize").onclick = () => {
    currentPackSizes.push({ size: "", price: "" });
    renderPackSizesList();
  };

  function renderFeaturesList() {
    const wrap = document.getElementById("prodFeaturesList");
    if (!currentFeatures.length) {
      wrap.innerHTML = `<p class="crm-muted prod-packsize-empty">No features added.</p>`;
      return;
    }
    wrap.innerHTML = currentFeatures.map((f, i) => `
      <div class="prod-feature-row" data-index="${i}">
        <input type="text" class="feat-text" placeholder="e.g. Anti-fungal &amp; washable" value="${escapeHtml(f)}">
        <button type="button" class="crm-icon-btn feat-remove" aria-label="Remove">×</button>
      </div>
    `).join("");

    wrap.querySelectorAll(".prod-feature-row").forEach(row => {
      const i = Number(row.dataset.index);
      row.querySelector(".feat-text").addEventListener("input", e => { currentFeatures[i] = e.target.value; });
      row.querySelector(".feat-remove").addEventListener("click", () => {
        currentFeatures.splice(i, 1);
        renderFeaturesList();
      });
    });
  }

  document.getElementById("btnAddFeature").onclick = () => {
    currentFeatures.push("");
    renderFeaturesList();
  };

  function openNewProduct() {
    editingProductId = null;
    productModalTitle.textContent = "Add product";
    deleteProductBtn.hidden = true;
    prodBrand.value = "";
    prodName.value = "";
    prodPhotoInput.value = "";
    currentPhoto = null;
    prodPhotoPreview.innerHTML = "";
    prodPhotoPreview.classList.add("hidden");
    prodCategory.innerHTML = categoryOptionsHtml("");
    prodFinish.value = "";
    prodCoverage.value = "";
    prodPrice.value = "";
    prodWarranty.value = "";
    prodDescription.value = "";
    currentPackSizes = [];
    renderPackSizesList();
    currentFeatures = [];
    renderFeaturesList();
    productModal.classList.remove("hidden");
    prodBrand.focus();
  }

  function openEditProduct(id) {
    const p = products.find(x => x.id === id);
    if (!p) return;
    editingProductId = id;
    productModalTitle.textContent = "Edit product";
    deleteProductBtn.hidden = false;
    prodBrand.value = p.brand || "";
    prodName.value = p.name || "";
    prodPhotoInput.value = "";
    currentPhoto = p.photo || null;
    if (currentPhoto) {
      prodPhotoPreview.innerHTML = `<img src="${currentPhoto}" alt="Product photo">`;
      prodPhotoPreview.classList.remove("hidden");
    } else {
      prodPhotoPreview.innerHTML = "";
      prodPhotoPreview.classList.add("hidden");
    }
    prodCategory.innerHTML = categoryOptionsHtml(p.category || "");
    prodFinish.value = p.finish || "";
    prodCoverage.value = p.coverage ?? "";
    prodPrice.value = p.pricePerLitre ?? "";
    prodWarranty.value = p.warrantyYears ?? "";
    prodDescription.value = p.description || "";
    currentPackSizes = Array.isArray(p.packSizes) ? p.packSizes.map(ps => ({ ...ps })) : [];
    renderPackSizesList();
    currentFeatures = Array.isArray(p.features) ? [...p.features] : [];
    renderFeaturesList();
    productModal.classList.remove("hidden");
  }

  function closeProductModal() {
    productModal.classList.add("hidden");
  }

  function saveProduct() {
    if (!prodBrand.value.trim() || !prodName.value.trim()) {
      alert("Brand and product name are required.");
      return;
    }
    if (prodCategory.value === "__custom__") {
      alert("Please select or enter a category.");
      return;
    }

    const record = {
      id: editingProductId || "PROD" + String(Date.now()).slice(-8),
      brand: prodBrand.value.trim(),
      name: prodName.value.trim(),
      photo: currentPhoto,
      category: prodCategory.value,
      finish: prodFinish.value.trim(),
      coverage: prodCoverage.value ? Number(prodCoverage.value) : null,
      pricePerLitre: prodPrice.value ? Number(prodPrice.value) : null,
      warrantyYears: prodWarranty.value ? Number(prodWarranty.value) : null,
      packSizes: currentPackSizes
        .filter(ps => ps.size && ps.size.trim())
        .map(ps => ({ size: ps.size.trim(), price: ps.price ? Number(ps.price) : null })),
      features: currentFeatures.filter(f => f && f.trim()).map(f => f.trim()),
      description: prodDescription.value.trim()
    };

    if (editingProductId) {
      const idx = products.findIndex(x => x.id === editingProductId);
      products[idx] = record;
    } else {
      products.push(record);
    }

    persistProducts();
    closeProductModal();
    render();
  }

  function deleteProduct() {
    if (!editingProductId) return;
    if (!confirm("Delete this product? This cannot be undone.")) return;
    products = products.filter(x => x.id !== editingProductId);
    persistProducts();
    closeProductModal();
    render();
  }

  document.getElementById("btnAddProduct").onclick = openNewProduct;
  document.getElementById("closeProductModal").onclick = closeProductModal;
  document.getElementById("cancelProductModal").onclick = closeProductModal;
  document.getElementById("saveProduct").onclick = saveProduct;
  deleteProductBtn.onclick = deleteProduct;
  productModal.addEventListener("click", (e) => { if (e.target === productModal) closeProductModal(); });

  // ---------- Detail preview (client-presentable) ----------

  const productDetailModal = document.getElementById("productDetailModal");
  const productDetailTitle = document.getElementById("productDetailTitle");
  const productDetailContent = document.getElementById("productDetailContent");
  let currentDetailProductId = null;

  function readFirmForStatement() {
    try {
      return (JSON.parse(localStorage.getItem("coatState")) || {}).firm || {};
    } catch {
      return {};
    }
  }

  function readPaintSystems() {
    try {
      const coatState = JSON.parse(localStorage.getItem("coatState")) || {};
      return Array.isArray(coatState.paintSystems) ? coatState.paintSystems : [];
    } catch {
      return [];
    }
  }

  function showProductDetail(id) {
    const p = products.find(x => x.id === id);
    if (!p) return;
    currentDetailProductId = id;

    const firm = readFirmForStatement();
    const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

    const matchingSystems = readPaintSystems().filter(s => (s.product || "").trim().toLowerCase() === p.name.trim().toLowerCase());

    productDetailTitle.textContent = `${p.brand} — ${p.name}`;
    productDetailContent.innerHTML = `
      <div class="report-doc-type">PRODUCT SHEET</div>
      <div class="report-header-row">
        <div class="report-company">
          <div><div class="report-brand">${escapeHtml(firm.name || "Decor My Nest")}</div></div>
        </div>
        <div class="report-date-block"><span>Date</span><strong>${today}</strong></div>
      </div>
      <div class="report-title">${escapeHtml(p.brand)} — ${escapeHtml(p.name)}</div>
      <div class="report-meta">${escapeHtml(p.category) || "Uncategorized"}${p.finish ? ` · ${escapeHtml(p.finish)} finish` : ""}${p.warrantyYears ? ` · Up to ${p.warrantyYears} years warranty` : ""}</div>
      ${p.photo ? `<img src="${p.photo}" class="prod-detail-photo" alt="${escapeHtml(p.name)}">` : ""}
      ${(p.features || []).length ? `
        <div class="prod-detail-features">
          <h4>Features &amp; Benefits</h4>
          <ul>${p.features.map(f => `<li>${escapeHtml(f)}</li>`).join("")}</ul>
        </div>
      ` : ""}
      <div class="report-table-wrap" style="margin-top:22px;">
        <table class="report-table">
          <tbody>
            <tr><td>Coverage</td><td>${p.coverage ? `${p.coverage} sq ft / litre` : "—"}</td></tr>
            <tr><td>Price per litre</td><td>${formatAmount(p.pricePerLitre)}</td></tr>
            ${(p.packSizes || []).map(ps => `<tr><td>${escapeHtml(ps.size)}</td><td>${formatAmount(ps.price)}</td></tr>`).join("")}
          </tbody>
        </table>
      </div>
      ${matchingSystems.length ? `
        <div class="prod-detail-features">
          <h4>Painting Systems &amp; Rates (from Live Rate Sheet)</h4>
          <table class="report-table">
            <thead><tr><th>Painting Type</th><th>Surface</th><th>Rate / sq ft</th></tr></thead>
            <tbody>${matchingSystems.map(s => `<tr><td>${escapeHtml(s.paintingType)}</td><td>${escapeHtml(s.substrate)}</td><td>${formatAmount(s.rate)}</td></tr>`).join("")}</tbody>
          </table>
        </div>
      ` : `<p class="crm-muted" style="margin-top:14px;">No matching entries found in the Live Rate Sheet — add "${escapeHtml(p.name)}" as a Product there to see systems and rates here automatically.</p>`}
      ${p.description ? `<p class="report-disclaimer">${escapeHtml(p.description)}</p>` : ""}
    `;
    productDetailModal.classList.remove("hidden");
  }

  function closeProductDetailModal() {
    productDetailModal.classList.add("hidden");
    productDetailContent.innerHTML = "";
  }

  async function saveProductDetailPdf() {
    const button = document.getElementById("saveProductDetailPdf");
    const originalLabel = button.textContent;
    button.textContent = "Generating PDF…";
    button.disabled = true;

    try {
      const canvas = await html2canvas(productDetailContent, { scale: 2, useCORS: true, backgroundColor: "#fffdf8" });
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

      const p = products.find(x => x.id === currentDetailProductId);
      pdf.save(`${(p ? `${p.brand}-${p.name}` : "product").replace(/[^a-z0-9]+/gi, "-")}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Couldn't generate the PDF — please try again.");
    } finally {
      button.textContent = originalLabel;
      button.disabled = false;
    }
  }

  document.getElementById("closeProductDetailModal").onclick = closeProductDetailModal;
  document.getElementById("cancelProductDetailModal").onclick = closeProductDetailModal;
  document.getElementById("saveProductDetailPdf").onclick = saveProductDetailPdf;
  document.getElementById("editProductFromDetail").onclick = () => {
    closeProductDetailModal();
    openEditProduct(currentDetailProductId);
  };
  productDetailModal.addEventListener("click", (e) => { if (e.target === productDetailModal) closeProductDetailModal(); });

  // ---------- Startup ----------

  render();

})();
