import { io } from 'socket.io-client';

// Storage Keys
export const STORAGE_KEY = 'MEGATHON_TIMER_STATE_V2';
export const CHANNEL_NAME = 'megathon_timer_sync_channel';

// Cloud Sync Fallback Endpoint (Firebase Realtime DB REST)
const CLOUD_SYNC_URL = 'https://megathon-timer-2026-default-rtdb.asia-southeast1.firebasedatabase.app/timer.json';

let socket = null;
let broadcastChannel = null;
let cloudSyncInterval = null;
let lastCloudUpdate = 0;

const listeners = new Set();
const statusListeners = new Set();

let currentSyncStatus = {
  isConnected: false,
  peerCount: 1,
  method: 'Local Storage'
};

if (typeof window !== 'undefined') {
  if ('BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  }
}

function notifyStatusChange() {
  statusListeners.forEach((fn) => fn(currentSyncStatus));
}

function notifyListeners(state) {
  if (!state) return;
  listeners.forEach((fn) => fn(state));
}

export function initSyncEngine() {
  if (typeof window === 'undefined') return;

  const socketUrl = window.location.origin;

  try {
    socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 50,
      reconnectionDelay: 1000,
      timeout: 4000
    });

    socket.on('connect', () => {
      currentSyncStatus = {
        isConnected: true,
        peerCount: currentSyncStatus.peerCount || 1,
        method: 'Realtime Sync Active'
      };
      notifyStatusChange();
    });

    socket.on('peers:count', (data) => {
      const count = typeof data === 'number' ? data : data?.count || 1;
      currentSyncStatus = {
        ...currentSyncStatus,
        peerCount: count
      };
      notifyStatusChange();
    });

    socket.on('timer:sync', (incomingState) => {
      if (!incomingState) return;
      if (incomingState.lastUpdated && incomingState.lastUpdated < lastCloudUpdate) return;
      lastCloudUpdate = incomingState.lastUpdated || Date.now();
      saveLocalState(incomingState, false); // Save locally without re-emitting socket
      notifyListeners(incomingState);
    });

    socket.on('disconnect', () => {
      currentSyncStatus = {
        isConnected: false,
        peerCount: 1,
        method: 'Reconnecting...'
      };
      notifyStatusChange();
    });

    socket.on('connect_error', () => {
      if (socket && !socket.connected && window.location.port !== '3001') {
        const directUrl = `${window.location.protocol}//${window.location.hostname}:3001`;
        socket.io.uri = directUrl;
      }
      currentSyncStatus = {
        isConnected: false,
        peerCount: 1,
        method: 'Local Tab Sync'
      };
      notifyStatusChange();
    });
  } catch (err) {
    console.warn('Socket.io error:', err);
  }

  // Initialize Cloud Sync Fallback via REST / Polling
  initCloudSync();

  // Listen to BroadcastChannel (tab-to-tab on same browser)
  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', (e) => {
      if (e.data) {
        notifyListeners(e.data);
      }
    });
  }

  // Listen to window storage events
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      const loaded = getLocalState();
      if (loaded) notifyListeners(loaded);
    }
  });
}

// Cloud Sync Fallback (Ensures multi-laptop sync over internet/cloud)
function initCloudSync() {
  fetchCloudState();

  cloudSyncInterval = setInterval(() => {
    fetchCloudState();
  }, 1000);
}

async function fetchCloudState() {
  try {
    const res = await fetch(CLOUD_SYNC_URL);
    if (res.ok) {
      const data = await res.json();
      if (data && data.lastUpdated && data.lastUpdated > lastCloudUpdate) {
        lastCloudUpdate = data.lastUpdated;
        saveLocalState(data, false);
        notifyListeners(data);
      }
    }
  } catch (e) {
    // Cloud sync offline/unreachable fallback
  }
}

async function pushToCloudSync(state) {
  try {
    lastCloudUpdate = Math.max(lastCloudUpdate, state.lastUpdated || Date.now());
    await fetch(CLOUD_SYNC_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state)
    });
  } catch (e) {
    // Cloud push error silent fallback
  }
}

export function getLocalState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveLocalState(state, broadcast = true) {
  try {
    const payload = {
      ...state,
      lastUpdated: state.lastUpdated || Date.now()
    };
    lastCloudUpdate = Math.max(lastCloudUpdate, payload.lastUpdated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

    if (broadcast) {
      if (broadcastChannel) {
        broadcastChannel.postMessage(payload);
      }
      if (socket && socket.connected) {
        socket.emit('timer:update', payload);
      }
      pushToCloudSync(payload);
    }
  } catch (err) {
    console.warn('Failed to save state:', err);
  }
}

export function broadcastTimerState(state) {
  saveLocalState(state, true);
  notifyListeners(state);
}

export function subscribeToSync(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function subscribeToSyncStatus(callback) {
  statusListeners.add(callback);
  callback(currentSyncStatus);
  return () => statusListeners.delete(callback);
}
