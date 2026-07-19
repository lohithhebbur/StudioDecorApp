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

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC-Ku4Az2c3y5K9lORWcF1Ad223a52dmfo",
  authDomain: "decor-my-nest-app.firebaseapp.com",
  projectId: "decor-my-nest-app",
  storageBucket: "decor-my-nest-app.firebasestorage.app",
  messagingSenderId: "8914690849",
  appId: "1:8914690849:web:ab30f0ca4e4a41bacd5460"
};

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

// A single shared "workspace" document ID. Since this is one person's
// business data (not a multi-tenant product), everything syncs under
// one fixed workspace rather than needing user accounts/login.
const WORKSPACE_ID = "main";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function docRefFor(key) {
  return doc(db, "workspaces", WORKSPACE_ID, "data", key);
}

function setSyncStatus(status) {
  window.dmnSyncStatus = status;
  window.dispatchEvent(new CustomEvent("dmn-sync-status", { detail: status }));
}

// Tracks keys currently being written locally as a *result* of an
// incoming cloud update, so the localStorage.setItem patch below
// doesn't immediately re-push the same data straight back to the
// cloud in a pointless loop.
const applyingRemoteUpdate = new Set();

const originalSetItem = localStorage.setItem.bind(localStorage);
const originalGetItem = localStorage.getItem.bind(localStorage);

const pushTimers = {};

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
    await setDoc(docRefFor(key), {
      value: raw,
      updatedAt: serverTimestamp(),
      updatedAtLocal: ts
    });
    setSyncStatus("synced");
  } catch (err) {
    console.error("[sync] push failed for", key, err);
    setSyncStatus("error");
  }
}

// Patch localStorage.setItem so every existing module's normal
// localStorage.setItem(key, value) calls automatically trigger a
// background push, with zero changes needed anywhere else in the app.
localStorage.setItem = function (key, value) {
  originalSetItem(key, value);
  if (SYNCED_KEYS.includes(key) && !applyingRemoteUpdate.has(key)) {
    // Stamp this as "known as of right now" immediately (synchronously),
    // before the actual network push even starts, so a slightly-stale
    // pull that happens to land in the meantime can't clobber this
    // fresher local edit.
    originalSetItem(`__syncTs_${key}`, String(Date.now()));
  }
  schedulePush(key);
};

async function pullKeyOnce(key) {
  try {
    const snap = await getDoc(docRefFor(key));
    if (!snap.exists()) {
      // Nothing in the cloud yet for this key - if there's a local
      // value, push it up now so the cloud has a starting point.
      const localValue = originalGetItem(key);
      if (localValue !== null) await pushKey(key);
      return;
    }
    const remote = snap.data();
    const remoteLocalTs = remote.updatedAtLocal || 0;
    const localTsKey = `__syncTs_${key}`;
    const lastKnownLocalTs = Number(originalGetItem(localTsKey) || 0);

    // Only overwrite local data if the cloud version is actually newer
    // than the last version this device knew about - protects against
    // an older cloud snapshot clobbering a very recent local edit that
    // just hasn't finished pushing yet.
    if (remoteLocalTs > lastKnownLocalTs) {
      applyingRemoteUpdate.add(key);
      originalSetItem(key, remote.value);
      originalSetItem(localTsKey, String(remoteLocalTs));
      applyingRemoteUpdate.delete(key);
    }
  } catch (err) {
    console.error("[sync] pull failed for", key, err);
    setSyncStatus("error");
  }
}

function listenForRemoteChanges(key) {
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

    // Let the current page know fresh data landed, in case it wants to
    // re-render (modules can optionally listen for this).
    window.dispatchEvent(new CustomEvent("dmn-remote-update", { detail: { key } }));
  }, (err) => {
    console.error("[sync] listener failed for", key, err);
  });
}

// The promise every entry point (shell.js, the estimator) awaits
// before loading any module or reading persisted state, so the page
// never renders with stale data on a fresh load.
window.dmnSyncReady = (async () => {
  setSyncStatus("syncing");
  await Promise.all(SYNCED_KEYS.map(pullKeyOnce));
  SYNCED_KEYS.forEach(listenForRemoteChanges);
  setSyncStatus("synced");
})();
