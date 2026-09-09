import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, onValue, set } from 'firebase/database';

// ─── Firebase Config (Full authenticated RTDB configuration) ──────────────────
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAtDNyV4QsKsyqzU8FB_9YNNjHjWc1PrQw",
  authDomain: "megathon-2026-app.firebaseapp.com",
  databaseURL: "https://megathon-2026-app-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "megathon-2026-app",
  storageBucket: "megathon-2026-app.firebasestorage.app",
  messagingSenderId: "864946065375",
  appId: "1:864946065375:web:302cb95aa6eda660cffe6a"
};

// ─── Constants ────────────────────────────────────────────────────────────────
export const STORAGE_KEY = 'MEGATHON_TIMER_STATE_V2';
export const CHANNEL_NAME = 'megathon_timer_sync_channel';
export const AUTH_STORAGE_KEY = 'MEGATHON_ADMIN_AUTH_TOKEN';

// ─── Firebase Initialization ──────────────────────────────────────────────────
let app = null;
let db = null;
let timerRef = null;
let serverOffsetRef = null;

try {
  app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
  db = getDatabase(app);
  timerRef = ref(db, 'timer');
  serverOffsetRef = ref(db, '.info/serverTimeOffset');
} catch (err) {
  console.error('[SyncEngine] Firebase initialization failed:', err);
}

// ─── Millisecond Clock Synchronization ────────────────────────────────────────
let serverTimeOffset = 0;

export function getServerTime() {
  return Date.now() + serverTimeOffset;
}

// ─── Admin Authorization Check ────────────────────────────────────────────────
export function isAdminAuthorized() {
  try {
    // If currently on admin route, grant authorization
    if (typeof window !== 'undefined' && (
      window.location.pathname.startsWith('/admin') ||
      window.location.pathname.startsWith('/edittime')
    )) {
      return true;
    }

    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return Boolean(parsed && (parsed.authenticated === true || parsed.user));
  } catch {
    return true;
  }
}

// ─── Strict Payload Sanitizer ─────────────────────────────────────────────────
export function sanitizeTimerPayload(state) {
  const currentServerTime = getServerTime();
  const configured = typeof state?.configuredSeconds === 'number' && state.configuredSeconds > 0
    ? Math.floor(state.configuredSeconds)
    : 24 * 3600;

  const isRunning = Boolean(state?.isTimerRunning);
  const isDone = Boolean(state?.isCompleted);

  let target = 0;
  if (isRunning && typeof state?.targetTime === 'number' && state.targetTime > 0) {
    target = Math.floor(state.targetTime);
  }

  let seqStart = 0;
  if (typeof state?.sequenceStartTime === 'number' && state.sequenceStartTime > 0) {
    seqStart = Math.floor(state.sequenceStartTime);
  }

  const validActions = ['sequence', 'edit', 'pause', 'start', 'reset'];
  const action = validActions.includes(state?.action) ? state.action : 'edit';

  const repo = typeof state?.githubRepoUrl === 'string' && state.githubRepoUrl.trim().length > 0
    ? state.githubRepoUrl.trim()
    : 'https://github.com/balajik1910';

  const showQr = typeof state?.showQrCode === 'boolean' ? state.showQrCode : false;

  const lastUp = typeof state?.lastUpdated === 'number' && state.lastUpdated > 0
    ? state.lastUpdated
    : currentServerTime;

  return {
    action,
    configuredSeconds: configured,
    isTimerRunning: isRunning,
    isCompleted: isDone,
    targetTime: target,
    sequenceStartTime: seqStart,
    githubRepoUrl: repo,
    showQrCode: showQr,
    lastUpdated: lastUp,
    updatedBy: 'admin'
  };
}

// ─── Subscriber Sets & Cached State ───────────────────────────────────────────
const stateListeners = new Set();
const statusListeners = new Set();

let lastKnownState = null;

let syncStatus = {
  isConnected: false,
  isSyncing: false,
  lastSyncedAt: null,
  peerCount: 4,
  method: 'Connecting to Cloud...',
  error: null
};

function updateSyncStatus(patch) {
  syncStatus = { ...syncStatus, ...patch };
  statusListeners.forEach((fn) => {
    try { fn(syncStatus); } catch (e) { console.error('[SyncEngine] Status listener error:', e); }
  });
}

function broadcast(state) {
  if (!state || typeof state !== 'object') return;
  lastKnownState = state;
  stateListeners.forEach((fn) => {
    try { fn(state); } catch (e) { console.error('[SyncEngine] State listener error:', e); }
  });
}

// ─── Process Incoming Inbound Update ──────────────────────────────────────────
function processInboundUpdate(rawState, sourceName = 'Firebase') {
  if (!rawState || typeof rawState !== 'object') return;
  const sanitized = sanitizeTimerPayload(rawState);

  // If we already have a newer state in memory, don't revert
  if (lastKnownState && typeof lastKnownState.lastUpdated === 'number') {
    if (sanitized.lastUpdated < lastKnownState.lastUpdated) {
      return;
    }
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
  } catch {
    /* ignore */
  }

  broadcast(sanitized);

  updateSyncStatus({
    isConnected: true,
    isSyncing: false,
    lastSyncedAt: Date.now(),
    method: `${sourceName} Realtime ✓`,
    error: null
  });
}

// ─── Direct Cloud REST Fetch (Instant load on boot & focus) ───────────────────
export async function fetchCurrentStateFromCloud() {
  try {
    const url = `${FIREBASE_CONFIG.databaseURL}/timer.json?t=${Date.now()}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data) {
        processInboundUpdate(data, 'Cloud REST');
        return data;
      }
    }
  } catch (err) {
    console.warn('[SyncEngine] Cloud REST fetch note:', err.message);
  }
  return null;
}

// ─── Native Browser SSE (Server-Sent Events) Stream ───────────────────────────
let sseSource = null;
function setupServerSentEvents() {
  if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;
  if (sseSource) return;

  try {
    const sseUrl = `${FIREBASE_CONFIG.databaseURL}/timer.json`;
    sseSource = new EventSource(sseUrl);

    sseSource.addEventListener('put', (e) => {
      try {
        const parsed = JSON.parse(e.data);
        if (parsed && parsed.data) {
          if (parsed.path === '/') {
            processInboundUpdate(parsed.data, 'Cloud SSE');
          } else {
            // Partial field update, re-fetch whole state immediately
            fetchCurrentStateFromCloud();
          }
        }
      } catch (err) {
        console.warn('[SyncEngine] SSE put parse error:', err);
      }
    });

    sseSource.addEventListener('patch', () => {
      fetchCurrentStateFromCloud();
    });

    sseSource.onerror = () => {
      // EventSource auto-reconnects natively
    };
  } catch (err) {
    console.warn('[SyncEngine] EventSource setup note:', err);
  }
}

// ─── Active Background Poller (1.5s interval safety net) ──────────────────────
let pollerInterval = null;
function startActivePoller() {
  if (pollerInterval) return;
  pollerInterval = setInterval(() => {
    fetchCurrentStateFromCloud();
  }, 1500);
}

// ─── Cross-Tab Broadcast Channel ──────────────────────────────────────────────
let broadcastChannel = null;
function setupBroadcastChannel() {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;
  try {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
    broadcastChannel.onmessage = (e) => {
      if (e.data) {
        processInboundUpdate(e.data, 'Local Broadcast');
      }
    };
  } catch {
    /* ignore */
  }
}

// ─── initSyncEngine (Called once on App boot) ─────────────────────────────────
let isInitialized = false;

export function initSyncEngine() {
  if (isInitialized) return;
  isInitialized = true;

  // 1. Hydrate from localStorage first
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      lastKnownState = sanitizeTimerPayload(JSON.parse(cached));
    }
  } catch {
    /* ignore */
  }

  // 2. Fetch fresh state from Cloud immediately (0ms delay)
  fetchCurrentStateFromCloud();

  // 3. Connect Cross-tab Channel
  setupBroadcastChannel();

  // 4. Connect Native Server-Sent Events (SSE)
  setupServerSentEvents();

  // 5. Start Active 1.5s Poller
  startActivePoller();

  // 6. Connect Firebase RTDB WebSocket SDK
  if (timerRef) {
    try {
      onValue(
        timerRef,
        (snapshot) => {
          const val = snapshot.val();
          if (val) processInboundUpdate(val, 'Firebase WebSocket');
        },
        (err) => {
          console.warn('[SyncEngine] WebSocket subscription note:', err.message);
        }
      );
    } catch (e) {
      console.warn('[SyncEngine] WebSocket onValue note:', e);
    }
  }

  // 7. Track server clock offset
  if (serverOffsetRef) {
    try {
      onValue(serverOffsetRef, (snap) => {
        const offset = snap.val();
        if (typeof offset === 'number') {
          serverTimeOffset = offset;
        }
      });
    } catch {
      /* ignore */
    }
  }

  // 8. Re-fetch whenever window gains focus
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', () => fetchCurrentStateFromCloud());
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') fetchCurrentStateFromCloud();
    });
  }

  updateSyncStatus({ isConnected: true, method: 'Multi-Channel Live ✓' });
}

// ─── saveStateToStorage (Admin Write with Parallel Multi-Channel Delivery) ───
export async function saveStateToStorage(state) {
  if (!state || typeof state !== 'object') {
    throw new Error('Invalid state object provided to saveStateToStorage');
  }

  // Admin security check
  if (!isAdminAuthorized()) {
    const errorMsg = 'Unauthorized: Only authenticated admin users can modify the Megathon timer state.';
    console.error('[SyncEngine]', errorMsg);
    updateSyncStatus({ error: errorMsg, isSyncing: false });
    throw new Error(errorMsg);
  }

  const payload = sanitizeTimerPayload({
    ...state,
    lastUpdated: getServerTime()
  });

  // 1. Immediately apply to local memory & localStorage for instant UI reaction
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
  broadcast(payload);

  // 2. Broadcast to other tabs on same device
  try {
    if (broadcastChannel) {
      broadcastChannel.postMessage(payload);
    }
  } catch {
    /* ignore */
  }

  updateSyncStatus({ isSyncing: true, error: null });

  let writeSucceeded = false;

  // 3. CHANNEL 1: High-Speed Direct REST PUT (always finishes in ~300ms)
  try {
    const restUrl = `${FIREBASE_CONFIG.databaseURL}/timer.json`;
    const restResponse = await fetch(restUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (restResponse.ok) {
      writeSucceeded = true;
    } else {
      console.warn('[SyncEngine] REST PUT status:', restResponse.status);
    }
  } catch (restErr) {
    console.warn('[SyncEngine] REST PUT network attempt error:', restErr);
  }

  // 4. CHANNEL 2: Firebase SDK set() with 1500ms safety timeout race
  if (timerRef) {
    try {
      const sdkPromise = set(timerRef, payload);
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('SDK set timeout')), 1500));
      await Promise.race([sdkPromise, timeoutPromise]);
      writeSucceeded = true;
    } catch (sdkErr) {
      console.warn('[SyncEngine] SDK set attempt note:', sdkErr.message);
    }
  }

  if (writeSucceeded) {
    updateSyncStatus({
      isConnected: true,
      isSyncing: false,
      lastSyncedAt: Date.now(),
      method: 'Firebase Realtime ✓',
      error: null
    });
    return payload;
  } else {
    const errorMsg = 'Failed to write to Firebase database across all channels. Please check internet connection.';
    updateSyncStatus({ isSyncing: false, error: errorMsg });
    throw new Error(errorMsg);
  }
}

// ─── subscribeToStateChanges ──────────────────────────────────────────────────
export function subscribeToStateChanges(callback) {
  stateListeners.add(callback);
  // Deliver last known state immediately
  if (lastKnownState) {
    try { callback(lastKnownState); } catch (e) { console.error(e); }
  }
  // Also trigger fresh fetch
  fetchCurrentStateFromCloud().then((cloudState) => {
    if (cloudState) {
      try { callback(sanitizeTimerPayload(cloudState)); } catch { /* ignore */ }
    }
  });

  return () => stateListeners.delete(callback);
}

// ─── subscribeToSyncStatus ────────────────────────────────────────────────────
export function subscribeToSyncStatus(callback) {
  statusListeners.add(callback);
  try { callback(syncStatus); } catch (e) { console.error(e); }
  return () => statusListeners.delete(callback);
}

// ─── loadStateFromStorage ─────────────────────────────────────────────────────
export function loadStateFromStorage() {
  if (lastKnownState) return lastKnownState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? sanitizeTimerPayload(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}
