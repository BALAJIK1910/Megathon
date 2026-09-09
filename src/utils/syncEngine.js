import { io } from 'socket.io-client';

// Storage Keys
export const STORAGE_KEY = 'MEGATHON_TIMER_STATE_V2';
export const CHANNEL_NAME = 'megathon_timer_sync_channel';

// Default configuration for local WebSocket relay
const DEFAULT_SOCKET_URL = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : 'http://localhost:3001';

let socket = null;
let broadcastChannel = null;
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

export function initSyncEngine() {
  if (typeof window === 'undefined') return;

  // Initialize Socket.io Connection
  try {
    socket = io(DEFAULT_SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      timeout: 5000
    });

    socket.on('connect', () => {
      currentSyncStatus = {
        isConnected: true,
        peerCount: currentSyncStatus.peerCount || 1,
        method: 'WebSocket Realtime Sync'
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
      saveLocalState(incomingState, false); // save locally without re-broadcasting
      notifyListeners(incomingState);
    });

    socket.on('disconnect', () => {
      currentSyncStatus = {
        isConnected: false,
        peerCount: 1,
        method: 'Local Storage Fallback'
      };
      notifyStatusChange();
    });

    socket.on('connect_error', () => {
      currentSyncStatus = {
        isConnected: false,
        peerCount: 1,
        method: 'Local Tab Sync'
      };
      notifyStatusChange();
    });
  } catch (err) {
    console.warn('Socket.io connection error:', err);
  }

  // Listen to BroadcastChannel
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

function notifyListeners(state) {
  listeners.forEach((fn) => fn(state));
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
      lastUpdated: Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

    if (broadcast) {
      if (broadcastChannel) {
        broadcastChannel.postMessage(payload);
      }
      if (socket && socket.connected) {
        socket.emit('timer:update', payload);
      }
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
  // Send immediate status
  callback(currentSyncStatus);
  return () => statusListeners.delete(callback);
}
