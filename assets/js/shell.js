console.log("shell.js loaded");

const moduleContainer = document.getElementById("moduleContainer");

// Maps a sidebar module id to its file name under Modules/,
// for cases where the two don't match (e.g. "crm" button -> customers.html).
const MODULE_FILE_MAP = {
  crm: "customers"
};

async function loadModule(moduleName) {

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

    document
      .querySelectorAll(".menu")
      .forEach(btn => btn.classList.remove("active"));

    button.classList.add("active");

    loadModule(button.dataset.module);

  });

});

window.loadModule = loadModule;

const requestedModule = new URLSearchParams(window.location.search).get("module");
const requestedButton = requestedModule && document.querySelector(`.menu[data-module="${requestedModule}"]`);
const initialModule = requestedButton ? requestedModule : "dashboard";

document.querySelectorAll(".menu").forEach(btn => {
  btn.classList.toggle("active", btn.dataset.module === initialModule);
});

loadModule(initialModule);
