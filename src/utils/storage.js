// storage.js — thin shim that re-exports syncEngine public API
// All actual sync logic lives in syncEngine.js

export {
  initSyncEngine,
  saveStateToStorage,
  loadStateFromStorage,
  subscribeToStateChanges,
  subscribeToSyncStatus,
  getServerTime,
  isAdminAuthorized,
  sanitizeTimerPayload,
  STORAGE_KEY,
  CHANNEL_NAME,
} from './syncEngine';
