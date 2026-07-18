console.log("shell.js loaded");

const moduleContainer = document.getElementById("moduleContainer");

// Maps a sidebar module id to its file name under Modules/,
// for cases where the two don't match (e.g. "crm" button -> customers.html).
const MODULE_FILE_MAP = {
  crm: "customers"
};

let isApplyingHistoryState = false;

async function loadModule(moduleName, options = {}) {

  const { pushHistory = true } = options;
  const fileName = MODULE_FILE_MAP[moduleName] || moduleName;

  try {

    const response = await fetch(`Modules/${fileName}.html`);

    if (!response.ok) {
      moduleContainer.innerHTML = `
        <div style="padding:40px">
          <h2>Module Not Found</h2>
          <p>${fileName}.html was not found.</p>
        </div>`;
      return;
    }

    moduleContainer.innerHTML = await response.text();

    // innerHTML does not execute injected <script> tags, so we
    // recreate each one and re-attach it to make the module interactive.
    moduleContainer.querySelectorAll("script").forEach(oldScript => {

      const newScript = document.createElement("script");

      if (oldScript.src) {
        newScript.src = oldScript.src;
      } else {
        newScript.textContent = oldScript.textContent;
      }

      oldScript.replaceWith(newScript);

    });

    // Keep the sidebar's active highlight in sync no matter how
    // loadModule() was triggered (sidebar click, another module's
    // code, or browser back/forward).
    document.querySelectorAll(".menu").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.module === moduleName);
    });

    // Push a real browser history entry so back/forward actually
    // works between modules (e.g. Reports -> Quotations -> back
    // returns to Reports, not the very first page loaded).
    if (pushHistory && !isApplyingHistoryState) {
      const url = `${window.location.pathname}?module=${encodeURIComponent(moduleName)}`;
      history.pushState({ module: moduleName }, "", url);
    }

  } catch (err) {

    console.error(err);

    moduleContainer.innerHTML = `
      <div style="padding:40px;color:red">
        Failed to load module.
      </div>`;
  }
}

document.querySelectorAll(".menu").forEach(button => {

  button.addEventListener("click", () => {
    loadModule(button.dataset.module);
  });

});

window.addEventListener("popstate", (event) => {
  const moduleName = (event.state && event.state.module) || "dashboard";
  isApplyingHistoryState = true;
  loadModule(moduleName, { pushHistory: false }).finally(() => {
    isApplyingHistoryState = false;
  });
});

window.loadModule = loadModule;

const requestedModule = new URLSearchParams(window.location.search).get("module");
const requestedButton = requestedModule && document.querySelector(`.menu[data-module="${requestedModule}"]`);
const initialModule = requestedButton ? requestedModule : "dashboard";

// Replace (not push) so the very first load establishes a baseline
// history entry, rather than creating an extra back-stop.
history.replaceState({ module: initialModule }, "", `${window.location.pathname}?module=${encodeURIComponent(initialModule)}`);

document.querySelectorAll(".menu").forEach(btn => {
  btn.classList.toggle("active", btn.dataset.module === initialModule);
});

loadModule(initialModule, { pushHistory: false });
