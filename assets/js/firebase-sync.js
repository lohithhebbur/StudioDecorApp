// ========================================
// Decor My Nest Studio App
// Firebase cross-device sync engine
//
// How this works, in plain terms:
// - Every persistent data key (customers, projects, quotations, etc.)
//   already lives in localStorage, and every module in this app reads
//   and writes it there exactly as before - nothing about that changes.
// - This script transparently keeps localStorage in sync with a
//   Firestore document per key, so the same data shows up on every
//   device signed into the same project.
// - On page load: pulls the latest version of each key from Firestore
//   (comparing timestamps against what's stored locally) BEFORE any
//   module is allowed to load, so every page always starts with the
//   most current data.
// - On every local write: pushes the updated value to Firestore
//   (debounced) so other devices pick it up.
// - Real-time listeners mean a change made on one device shows up on
//   another within a couple of seconds without needing a manual sync.
// ========================================

// ========================================
// Decor My Nest Studio App
// Firebase cross-device sync engine
//
// How this works, in plain terms:
// - Every persistent data key (customers, projects, quotations, etc.)
//   already lives in localStorage, and every module in this app reads
//   and writes it there exactly as before - nothing about that changes.
// - This script transparently keeps localStorage in sync with a
//   Firestore document per key, so the same data shows up on every
//   device signed into the same project.
// - On page load: pulls the latest version of each key from Firestore
//   (comparing timestamps against what's stored locally) BEFORE any
//   module is allowed to load, so every page always starts with the
//   most current data.
// - On every local write: pushes the updated value to Firestore
//   (debounced) so other devices pick it up.
// - Real-time listeners mean a change made on one device shows up on
//   another within a couple of seconds without needing a manual sync.
//
// IMPORTANT: sync is a nice-to-have layered on top of an app that
// already works fully offline from local storage. If Firebase is
// slow, blocked, or unreachable for any reason (network issue,
// browser privacy restrictions, etc.), window.dmnSyncReady must still
// resolve within a few seconds either way - the app should never get
// stuck waiting on the network to show a page that already has
// perfectly usable local data.
// ========================================

function setSyncStatus(status, detail) {
  window.dmnSyncStatus = status;
  if (detail) {
    window.dmnSyncErrors = window.dmnSyncErrors || [];
    window.dmnSyncErrors.push(String(detail));
  }
  window.dispatchEvent(new CustomEvent("dmn-sync-status", { detail: status }));
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("timed out")), ms))
  ]);
}

// Every persistent data key this app stores. Deliberately excludes
// transient/session-only handoff keys (dmnActiveProjectId,
// dmnOpenCustomerId, dmnOpenQuotationId, dmnQuotationDraft) which are
// meant to live only on the device that's mid-action, not sync.
const SYNCED_KEYS = [
  "dmnCustomers", "dmnProjects", "dmnQuotations", "dmnMeasurementsByCustomer", "coatState",
  "dmnProducts", "dmnProductPhotos", "dmnProductSheetUrl",
  "dmnWorkerContacts", "dmnVendorContacts", "dmnPaymentSources",
  "dmnCustomWorkers", "dmnCustomVendors", "dmnCustomPackSizes",
  "dmnCustomProductCategories", "dmnCustomQuoStatuses", "dmnCustomMaterialCategories",
  "dmnCustomSurfaces", "dmnCustomDeductionTypes", "dmnCustomProjectTypes",
  "dmnCustomLeadSources", "dmnNumberCounters"
];

const WORKSPACE_ID = "main";
const originalSetItem = localStorage.setItem.bind(localStorage);
const originalGetItem = localStorage.getItem.bind(localStorage);
const applyingRemoteUpdate = new Set();
const pushTimers = {};

// Everything below only activates if Firebase itself loads
// successfully within the timeout - otherwise this whole block is
// skipped and window.dmnSyncReady resolves immediately.
window.dmnSyncReady = (async () => {
  setSyncStatus("syncing");

  let firebaseModules;
  try {
    firebaseModules = await withTimeout((async () => {
      const [{ initializeApp }, firestoreModule] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js")
      ]);
      return { initializeApp, ...firestoreModule };
    })(), 20000);
  } catch (err) {
    console.error("[sync] Firebase SDK failed to load in time, continuing offline-only:", err);
    setSyncStatus("error", "SDK load: " + (err && err.message || err));
    return;
  }

  const { initializeApp, getFirestore, doc, getDoc, setDoc, onSnapshot, serverTimestamp } = firebaseModules;

  const firebaseConfig = {
    apiKey: "AIzaSyC-Ku4Az2c3y5K9lORWcF1Ad223a52dmfo",
    authDomain: "decor-my-nest-app.firebaseapp.com",
    projectId: "decor-my-nest-app",
    storageBucket: "decor-my-nest-app.firebasestorage.app",
    messagingSenderId: "8914690849",
    appId: "1:8914690849:web:ab30f0ca4e4a41bacd5460"
  };

  let db;
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
  } catch (err) {
    console.error("[sync] Firebase init failed, continuing offline-only:", err);
    setSyncStatus("error", "Init: " + (err && err.message || err));
    return;
  }

  function docRefFor(key) {
    return doc(db, "workspaces", WORKSPACE_ID, "data", key);
  }

  function schedulePush(key) {
    if (!SYNCED_KEYS.includes(key)) return;
    if (applyingRemoteUpdate.has(key)) return;
    clearTimeout(pushTimers[key]);
    pushTimers[key] = setTimeout(() => pushKey(key), 800);
  }

  async function pushKey(key) {
    try {
      const raw = originalGetItem(key);
      if (raw === null) return;
      const ts = Number(originalGetItem(`__syncTs_${key}`)) || Date.now();
      await setDoc(docRefFor(key), { value: raw, updatedAt: serverTimestamp(), updatedAtLocal: ts });
      setSyncStatus("synced");
    } catch (err) {
      console.error("[sync] push failed for", key, err);
      setSyncStatus("error", "Push " + key + ": " + (err && err.message || err));
    }
  }

  // Patch localStorage.setItem so every existing module's normal
  // localStorage.setItem(key, value) calls automatically trigger a
  // background push, with zero changes needed anywhere else in the app.
  localStorage.setItem = function (key, value) {
    originalSetItem(key, value);
    if (SYNCED_KEYS.includes(key) && !applyingRemoteUpdate.has(key)) {
      originalSetItem(`__syncTs_${key}`, String(Date.now()));
    }
    schedulePush(key);
  };

  async function pullKeyOnce(key) {
    try {
      const snap = await withTimeout(getDoc(docRefFor(key)), 8000);
      if (!snap.exists()) {
        const localValue = originalGetItem(key);
        if (localValue !== null) await pushKey(key);
        return true;
      }
      const remote = snap.data();
      const remoteLocalTs = remote.updatedAtLocal || 0;
      const localTsKey = `__syncTs_${key}`;
      const lastKnownLocalTs = Number(originalGetItem(localTsKey) || 0);

      if (remoteLocalTs > lastKnownLocalTs) {
        applyingRemoteUpdate.add(key);
        originalSetItem(key, remote.value);
        originalSetItem(localTsKey, String(remoteLocalTs));
        applyingRemoteUpdate.delete(key);
      }
      return true;
    } catch (err) {
      console.error("[sync] pull failed for", key, err);
      window.dmnSyncErrors = window.dmnSyncErrors || [];
      window.dmnSyncErrors.push(`Pull ${key}: ${(err && err.message) || err}`);
      return false;
    }
  }

  function listenForRemoteChanges(key) {
    try {
      onSnapshot(docRefFor(key), (snap) => {
        if (!snap.exists()) return;
        const remote = snap.data();
        const remoteLocalTs = remote.updatedAtLocal || 0;
        const localTsKey = `__syncTs_${key}`;
        const lastKnownLocalTs = Number(originalGetItem(localTsKey) || 0);
        if (remoteLocalTs <= lastKnownLocalTs) return;

        applyingRemoteUpdate.add(key);
        originalSetItem(key, remote.value);
        originalSetItem(localTsKey, String(remoteLocalTs));
        applyingRemoteUpdate.delete(key);

        window.dispatchEvent(new CustomEvent("dmn-remote-update", { detail: { key } }));
      }, (err) => {
        console.error("[sync] listener failed for", key, err);
      });
    } catch (err) {
      console.error("[sync] could not attach listener for", key, err);
    }
  }

  // Give the initial pull a genuinely realistic window for a real
  // mobile connection pulling 22 documents - too short a timeout here
  // was the actual bug (pulls silently timing out while still
  // reporting 'synced'). Tracks real success/failure so the status
  // badge is honest rather than always claiming success.
  let allPullsSucceeded = true;
  try {
    const results = await withTimeout(Promise.all(SYNCED_KEYS.map(pullKeyOnce)), 15000);
    allPullsSucceeded = results.every(Boolean);
  } catch (err) {
    console.error("[sync] initial pull did not finish in time, proceeding with whatever completed:", err);
    allPullsSucceeded = false;
  }

  SYNCED_KEYS.forEach(listenForRemoteChanges);
  setSyncStatus(allPullsSucceeded ? "synced" : "error");
  window.dispatchEvent(new CustomEvent("dmn-initial-sync-done"));
})();
