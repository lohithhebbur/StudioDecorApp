console.log("shell.js loaded");

const moduleContainer = document.getElementById("moduleContainer");

window.addEventListener("dmn-sync-status", (e) => {
  const badge = document.getElementById("syncStatusBadge");
  if (!badge) return;
  badge.classList.remove("sync-status-syncing", "sync-status-synced", "sync-status-error");
  if (e.detail === "synced") {
    badge.textContent = "☁ Synced";
    badge.classList.add("sync-status-synced");
  } else if (e.detail === "error") {
    badge.textContent = "⚠ Sync issue";
    badge.classList.add("sync-status-error");
  } else {
    badge.textContent = "⟳ Syncing…";
    badge.classList.add("sync-status-syncing");
  }
});

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

// Wait for the Firebase sync module to be ready before loading any
// module, so the very first thing rendered reflects the latest data
// from other devices - not stale local data. Polls for
// window.dmnSyncReady rather than assuming it already exists, since
// firebase-sync.js is loaded as an ES module and those defer
// differently than this regular script, so execution order between
// the two isn't guaranteed. A hard 4-second cap means a slow network
// or Firebase hiccup can never leave the app stuck on a blank screen.
function waitForSync() {
  return new Promise(resolve => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    setTimeout(finish, 4000);
    (function check() {
      if (settled) return;
      if (window.dmnSyncReady) {
        window.dmnSyncReady.then(finish).catch(finish);
      } else {
        setTimeout(check, 50);
      }
    })();
  });
}

moduleContainer.innerHTML = `<div style="padding:60px;text-align:center;color:#6b7d70;">Syncing your data…</div>`;
waitForSync().then(() => {
  loadModule(initialModule, { pushHistory: false });
});
