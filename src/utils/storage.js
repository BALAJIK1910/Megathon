import {
  saveLocalState,
  getLocalState,
  subscribeToSync,
  subscribeToSyncStatus,
  broadcastTimerState,
  initSyncEngine,
  STORAGE_KEY,
  CHANNEL_NAME
} from './syncEngine';

export {
  STORAGE_KEY,
  CHANNEL_NAME,
  initSyncEngine,
  subscribeToSyncStatus
};

export function saveStateToStorage(state) {
  broadcastTimerState(state);
}

export function loadStateFromStorage() {
  return getLocalState();
}

export function subscribeToStateChanges(callback) {
  return subscribeToSync(callback);
}
