// Registers sw.js, which always lives at the site root (one level up from
// estimator/, same level as index.html at the top). window.SW_ROOT is set
// by each page before this script loads, so paths still work no matter
// what sub-path the site is hosted under on GitHub Pages.
if ("serviceWorker" in navigator) {
  const swRoot = window.SW_ROOT || "./";
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`${swRoot}sw.js`, { scope: swRoot })
      .catch((err) => console.warn("Service worker registration failed:", err));
  });
}
