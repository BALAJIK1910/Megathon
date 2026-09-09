import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import BackgroundCanvas from '../components/BackgroundCanvas';
import Header from '../components/Header';
import { audio } from '../utils/audio';
import {
  saveStateToStorage,
  subscribeToStateChanges,
  subscribeToSyncStatus,
  getServerTime
} from '../utils/storage';

export default function JudgeBuzzer() {
  const [state, setState] = useState({
    targetTime: 0,
    isTimerRunning: false,
    configuredSeconds: 24 * 3600,
    isCompleted: false,
    githubRepoUrl: 'https://github.com/balajik1910',
    showQrCode: false,
    lastUpdated: Date.now()
  });

  const [buzzerPressed, setBuzzerPressed] = useState(false);
  const [isSavingDb, setIsSavingDb] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [previewText, setPreviewText] = useState('24:00:00');

  const [syncStatus, setSyncStatus] = useState({
    isConnected: false,
    isSyncing: false,
    lastSyncedAt: null,
    peerCount: 4,
    method: 'Connecting to Cloud...',
    error: null
  });

  const formatTime = (totalSec) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  useEffect(() => {
    const unsubscribeState = subscribeToStateChanges((newState) => {
      if (!newState) return;
      setState(newState);

      const now = getServerTime();
      if (newState.isTimerRunning && newState.targetTime && newState.targetTime > 0) {
        const diffMs = newState.targetTime - now;
        setPreviewText(formatTime(Math.max(0, Math.floor(diffMs / 1000))));
      } else {
        setPreviewText(formatTime(newState.configuredSeconds || 24 * 3600));
      }
    });

    const unsubscribeStatus = subscribeToSyncStatus((status) => {
      setSyncStatus(status);
    });

    return () => {
      unsubscribeState();
      unsubscribeStatus();
    };
  }, []);

  // Live countdown preview ticker
  useEffect(() => {
    const interval = setInterval(() => {
      if (state.isTimerRunning && state.targetTime && state.targetTime > 0) {
        const now = getServerTime();
        const diffMs = state.targetTime - now;
        setPreviewText(formatTime(Math.max(0, Math.floor(diffMs / 1000))));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [state.isTimerRunning, state.targetTime]);

  // ----------------------------------------------------
  // JUDGE BUZZER TRIGGER
  // ----------------------------------------------------
  const handleJudgeBuzzerPress = async () => {
    audio.init();
    audio.playBurst();

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([150, 75, 250]);
    }

    setBuzzerPressed(true);
    setTimeout(() => setBuzzerPressed(false), 500);

    const totalSec = state.configuredSeconds || 24 * 3600;
    const seqStart = getServerTime();
    const newTarget = seqStart + 11200 + totalSec * 1000;

    const newState = {
      ...state,
      action: 'sequence',
      sequenceStartTime: seqStart,
      isTimerRunning: true,
      targetTime: newTarget,
      configuredSeconds: totalSec,
      isCompleted: false,
      showQrCode: true,
      githubRepoUrl: state.githubRepoUrl || 'https://github.com/balajik1910'
    };

    setIsSavingDb(true);
    try {
      await saveStateToStorage(newState);
      showToast("🚀 BUZZER ACTIVATED! 10-Second Countdown & QR Code broadcasted to all stage screens!");
    } catch (err) {
      console.error('[Buzzer] Save error:', err);
      showToast(`❌ Write Error: ${err.message}`);
    } finally {
      setIsSavingDb(false);
    }
  };

  return (
    <div className="relative h-screen w-full flex flex-col justify-between items-center p-4 sm:p-6 overflow-hidden font-sans select-none">
      <BackgroundCanvas />
      <div className="fixed inset-0 scanlines z-10 pointer-events-none" />

      {/* Header with official logo */}
      <div className="relative z-20 w-full max-w-lg">
        <Header showAdminControls={false} />
      </div>

      {/* Event Title Section */}
      <div className="relative z-20 w-full max-w-lg text-center my-auto flex flex-col items-center">
        <div className="inline-flex items-center space-x-2 mb-2 px-3 py-1 rounded-full poster-glass border border-purple-500/40 text-xs font-mono">
          <span className={`w-2 h-2 rounded-full ${state.isTimerRunning ? 'bg-emerald-400 animate-ping' : 'bg-pink-400 animate-pulse'}`} />
          <span className="text-purple-200 font-bold tracking-widest uppercase">
            {state.isTimerRunning ? 'HACKATHON ACTIVE' : 'VIP LAUNCH TRIGGER'}
          </span>
        </div>

        <h1 className="font-orbitron font-black text-2xl sm:text-3xl text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-pink-500 tracking-wider mb-1">
          MEGATHON '26
        </h1>

        <p className="font-mono text-xs text-purple-300 max-w-xs mb-4">
          Tap the buzzer to trigger the 10-second launch sequence, start the countdown, and display the Problem Statement QR Code.
        </p>

        {/* Toast Alert */}
        {toastMsg && (
          <div className="w-full mb-3 p-2.5 rounded-xl bg-purple-950/95 border border-pink-400 text-pink-200 font-mono text-xs font-bold text-center shadow-[0_0_25px_rgba(236,72,153,0.5)] animate-bounce">
            {toastMsg}
          </div>
        )}

        {/* Centered Giant 3D Buzzer Button */}
        <div className="relative my-4 flex items-center justify-center">
          {!state.isTimerRunning && (
            <div className="absolute -inset-6 rounded-full bg-gradient-to-r from-pink-600 to-purple-600 opacity-60 blur-2xl animate-pulse pointer-events-none" />
          )}

          <button
            onClick={handleJudgeBuzzerPress}
            disabled={isSavingDb}
            className={`group relative w-52 h-52 sm:w-64 sm:h-64 rounded-full flex flex-col items-center justify-center transition-all duration-200 shadow-2xl cursor-pointer ${
              buzzerPressed ? 'scale-90 brightness-125' : 'active:scale-95'
            } ${
              state.isTimerRunning
                ? 'bg-gradient-to-b from-pink-600 via-purple-700 to-slate-900 border-4 border-pink-400 hover:border-white shadow-[0_0_60px_rgba(236,72,153,0.8)]'
                : 'bg-gradient-to-b from-pink-500 via-red-600 to-purple-900 border-4 border-pink-300 hover:border-white shadow-[0_0_70px_rgba(236,72,153,0.9)]'
            }`}
          >
            {/* Inner Ring */}
            <div className="absolute inset-3.5 rounded-full border-2 border-white/30 pointer-events-none" />

            {/* Icon */}
            <svg
              className="w-14 h-14 sm:w-18 sm:h-18 text-white group-hover:scale-110 transition-transform mb-1.5 drop-shadow-md"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>

            {/* Label */}
            <span className="font-orbitron font-black text-base sm:text-lg tracking-[0.2em] text-white text-center px-4 drop-shadow-lg">
              {state.isTimerRunning ? 'RE-TRIGGER BUZZER' : 'PRESS BUZZER TO LAUNCH'}
            </span>

            {state.isTimerRunning && (
              <span className="font-mono text-[10px] text-pink-200 tracking-wider mt-1 uppercase">
                (10-Sec Launch Countdown)
              </span>
            )}
          </button>
        </div>

        {/* Live Ticker Display */}
        <div className="mt-2 flex items-center space-x-2 text-xs font-mono">
          <span className="text-purple-300">Live Arena Clock:</span>
          <span className="font-orbitron font-bold text-lg text-pink-400 tracking-wider">
            {previewText}
          </span>
        </div>
      </div>

      {/* Footer Controls & Link to Full Admin Deck */}
      <footer className="relative z-20 w-full max-w-lg flex items-center justify-between pt-3 border-t border-purple-500/20 text-xs font-mono">
        <div className="flex items-center space-x-2">
          <span className={`w-2 h-2 rounded-full ${syncStatus.isConnected ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-amber-400 animate-pulse'}`} />
          <span className="text-purple-300/80 text-[11px]">
            {syncStatus.isConnected ? 'Cloud Synced ✓' : 'Connecting...'}
          </span>
        </div>

        <Link
          to="/admin"
          className="py-1.5 px-3 rounded-lg poster-glass border border-purple-400/40 text-purple-200 hover:text-white hover:border-pink-400 transition-colors text-[11px] font-bold flex items-center space-x-1"
        >
          <span>⚙️ Admin Settings</span>
          <span>&rarr;</span>
        </Link>
      </footer>
    </div>
  );
}
