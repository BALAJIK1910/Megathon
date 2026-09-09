export const STORAGE_KEY = 'MEGATHON_TIMER_STATE_V2';
export const CHANNEL_NAME = 'megathon_timer_sync_channel';

let syncChannel = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  syncChannel = new BroadcastChannel(CHANNEL_NAME);
}

export function saveStateToStorage(state) {
  try {
    const payload = {
      ...state,
      lastUpdated: Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    if (syncChannel) {
      syncChannel.postMessage(payload);
    }
  } catch (e) {
    console.warn('Storage save failed:', e);
  }
}

export function loadStateFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Storage load failed:', e);
    return null;
  }
}

export function subscribeToStateChanges(callback) {
  const handleStorageEvent = (e) => {
    if (e.key === STORAGE_KEY) {
      callback(loadStateFromStorage());
    }
  };

  window.addEventListener('storage', handleStorageEvent);

  let channelListener = null;
  if (syncChannel) {
    channelListener = (e) => callback(e.data);
    syncChannel.addEventListener('message', channelListener);
  }

  // Fast 250ms fallback polling for instant sync within same tab context
  const pollInterval = setInterval(() => {
    callback(loadStateFromStorage());
  }, 250);

  return () => {
    window.removeEventListener('storage', handleStorageEvent);
    if (syncChannel && channelListener) {
      syncChannel.removeEventListener('message', channelListener);
    }
    clearInterval(pollInterval);
  };
}
