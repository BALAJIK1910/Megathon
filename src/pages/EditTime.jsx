import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import BackgroundCanvas from '../components/BackgroundCanvas';
import Header from '../components/Header';
import { audio } from '../utils/audio';
import {
  saveStateToStorage,
  subscribeToStateChanges,
  subscribeToSyncStatus,
  getServerTime
} from '../utils/storage';

export default function EditTime() {
  const [hours, setHours] = useState(24);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);

  const [githubRepoUrl, setGithubRepoUrl] = useState('https://github.com/balajik1910');
  const [showQrCode, setShowQrCode] = useState(false);

  const [state, setState] = useState({
    targetTime: 0,
    isTimerRunning: false,
    configuredSeconds: 24 * 3600,
    isCompleted: false,
    githubRepoUrl: 'https://github.com/balajik1910',
    showQrCode: false,
    lastUpdated: Date.now()
  });

  const [previewText, setPreviewText] = useState("24:00:00");
  const [statusLabel, setStatusLabel] = useState("INITIALIZING");
  const [statusClass, setStatusClass] = useState("bg-purple-500/20 text-purple-300 border-purple-400");
  const [toastMsg, setToastMsg] = useState("");
  const [buzzerPressed, setBuzzerPressed] = useState(false);
  const [isSavingDb, setIsSavingDb] = useState(false);
  const initialSyncDone = useRef(false);

  const [syncStatus, setSyncStatus] = useState({
    isConnected: false,
    isSyncing: false,
    lastSyncedAt: null,
    peerCount: 4,
    method: 'Connecting to Firebase...',
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
    setTimeout(() => setToastMsg(""), 4000);
  };

  const updateViewFromState = (currState) => {
    if (!currState) return;
    setState(currState);

    // Only populate input form controls on the initial load so the user can type freely
    if (!initialSyncDone.current) {
      initialSyncDone.current = true;
      if (currState.githubRepoUrl) {
        setGithubRepoUrl(currState.githubRepoUrl);
      }
      const now = getServerTime();
      const currentSec = currState.isTimerRunning && currState.targetTime && currState.targetTime > 0
        ? Math.max(0, Math.floor((currState.targetTime - now) / 1000))
        : (currState.configuredSeconds || 24 * 3600);
      setHours(Math.floor(currentSec / 3600));
      setMinutes(Math.floor((currentSec % 3600) / 60));
      setSeconds(currentSec % 60);
    }

    if (typeof currState.showQrCode === 'boolean') {
      setShowQrCode(currState.showQrCode);
    }

    const now = getServerTime();
    let remainingSec = currState.configuredSeconds || 24 * 3600;

    if (currState.isCompleted) {
      setPreviewText("00:00:00");
      setStatusLabel("MEGATHON CONCLUDED");
      setStatusClass("bg-pink-500/30 text-pink-300 border-pink-400");
      return;
    }

    if (currState.isTimerRunning && currState.targetTime && currState.targetTime > 0) {
      const diffMs = currState.targetTime - now;
      if (diffMs > 0) {
        remainingSec = Math.floor(diffMs / 1000);
        setStatusLabel("COUNTDOWN RUNNING");
        setStatusClass("bg-emerald-500/20 text-emerald-300 border-emerald-400");
      } else {
        remainingSec = 0;
        setStatusLabel("MEGATHON CONCLUDED");
        setStatusClass("bg-pink-500/30 text-pink-300 border-pink-400");
      }
    } else {
      setStatusLabel("STANDBY / PAUSED");
      setStatusClass("bg-amber-500/20 text-amber-300 border-amber-400");
    }

    setPreviewText(formatTime(remainingSec));
  };

  useEffect(() => {
    const unsubscribeState = subscribeToStateChanges((newState) => {
      updateViewFromState(newState);
    });

    const unsubscribeStatus = subscribeToSyncStatus((status) => {
      setSyncStatus(status);
    });

    return () => {
      unsubscribeState();
      unsubscribeStatus();
    };
  }, []);

  // Update preview ticker ONLY for live countdown clock display (NEVER touches user input fields)
  useEffect(() => {
    const interval = setInterval(() => {
      if (state.isTimerRunning && state.targetTime && state.targetTime > 0) {
        const now = getServerTime();
        const diffMs = state.targetTime - now;
        if (diffMs > 0) {
          const remainingSec = Math.floor(diffMs / 1000);
          setPreviewText(formatTime(remainingSec));
          setStatusLabel("COUNTDOWN RUNNING");
          setStatusClass("bg-emerald-500/20 text-emerald-300 border-emerald-400");
        } else {
          setPreviewText("00:00:00");
          setStatusLabel("MEGATHON CONCLUDED");
          setStatusClass("bg-pink-500/30 text-pink-300 border-pink-400");
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [state.isTimerRunning, state.targetTime]);

  // Safe wrapper for all database writes with visual feedback
  const executeDbWrite = async (payload, successMsg) => {
    setIsSavingDb(true);
    try {
      await saveStateToStorage(payload);
      showToast(`✓ ${successMsg}`);
    } catch (err) {
      console.error('[Admin] Database update failed:', err);
      showToast(`❌ Database Write Failed: ${err.message}`);
    } finally {
      setIsSavingDb(false);
    }
  };

  // ----------------------------------------------------
  // JUDGE BUZZER TRIGGER (Designed for Mobile Phone Tap)
  // ----------------------------------------------------
  const handleJudgeBuzzerPress = async () => {
    audio.init();
    audio.playBurst();

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([150, 75, 250]);
    }

    setBuzzerPressed(true);
    setTimeout(() => setBuzzerPressed(false), 500);

    const totalSec = state.configuredSeconds || (hours * 3600 + minutes * 60 + seconds) || 24 * 3600;
    const seqStart = getServerTime();
    const newTarget = seqStart + 4000 + totalSec * 1000;

    const newState = {
      action: 'sequence',
      sequenceStartTime: seqStart,
      isTimerRunning: true,
      targetTime: newTarget,
      configuredSeconds: totalSec,
      isCompleted: false,
      showQrCode: true,
      githubRepoUrl: githubRepoUrl.trim() || 'https://github.com/balajik1910'
    };

    await executeDbWrite(newState, "BUZZER ACTIVATED! Database updated & broadcasted to all area screens!");
  };

  const handlePreset = (h, m, s) => {
    audio.playClick();
    setHours(h);
    setMinutes(m);
    setSeconds(s);
  };

  const handleAdjustMinutes = async (deltaMin) => {
    audio.playClick();
    const now = getServerTime();

    if (state.isTimerRunning && state.targetTime && state.targetTime > 0) {
      const newTarget = state.targetTime + deltaMin * 60 * 1000;
      const remainingSec = Math.max(1, Math.floor((newTarget - now) / 1000));
      const newState = {
        ...state,
        action: 'edit',
        targetTime: newTarget,
        configuredSeconds: remainingSec,
        isTimerRunning: true
      };
      await executeDbWrite(newState, `${deltaMin > 0 ? '+' : ''}${deltaMin} minutes applied to active timer & saved to database!`);
    } else {
      const currentSec = (hours * 3600 + minutes * 60 + seconds) + deltaMin * 60;
      const safeSec = Math.max(10, currentSec);
      setHours(Math.floor(safeSec / 3600));
      setMinutes(Math.floor((safeSec % 3600) / 60));
      setSeconds(safeSec % 60);
      showToast(`${deltaMin > 0 ? '+' : ''}${deltaMin} minutes adjusted locally. Click "SET CUSTOM TIME" to sync.`);
    }
  };

  const handleApply = async (e) => {
    e.preventDefault();
    audio.playClick();

    const h = parseInt(hours, 10) || 0;
    const m = parseInt(minutes, 10) || 0;
    const s = parseInt(seconds, 10) || 0;
    let totalSec = h * 3600 + m * 60 + s;
    if (totalSec <= 0) totalSec = 1;

    const now = getServerTime();
    const newState = {
      action: 'edit',
      configuredSeconds: totalSec,
      isCompleted: false,
      targetTime: state.isTimerRunning ? now + totalSec * 1000 : 0,
      isTimerRunning: state.isTimerRunning,
      githubRepoUrl: githubRepoUrl.trim() || 'https://github.com/balajik1910',
      showQrCode
    };

    await executeDbWrite(newState, `Timer updated to ${formatTime(totalSec)} and saved to database!`);
  };

  const handleSaveRepoUrl = async (e) => {
    e?.preventDefault();
    audio.playClick();
    const cleanUrl = githubRepoUrl.trim() || 'https://github.com/balajik1910';
    setGithubRepoUrl(cleanUrl);

    const newState = {
      ...state,
      githubRepoUrl: cleanUrl,
      showQrCode: state.isTimerRunning ? Boolean(state.showQrCode) : false
    };
    await executeDbWrite(newState, "GitHub Repo link saved & synced with database! (QR will appear on screens when buzzer is triggered)");
  };

  const handleToggleQrCode = async () => {
    audio.playClick();
    const newShow = !showQrCode;
    setShowQrCode(newShow);

    const newState = {
      ...state,
      showQrCode: newShow
    };
    await executeDbWrite(newState, newShow ? "Problem Statement QR code is now VISIBLE on screens!" : "QR code HIDDEN on screens.");
  };

  const handlePauseResume = async () => {
    audio.playClick();
    const now = getServerTime();

    let newState;
    if (state.isTimerRunning) {
      // Pause
      const remainingMs = state.targetTime ? Math.max(0, state.targetTime - now) : 0;
      newState = {
        ...state,
        action: 'pause',
        configuredSeconds: Math.floor(remainingMs / 1000),
        isTimerRunning: false,
        isCompleted: false,
        targetTime: 0
      };
      await executeDbWrite(newState, "Timer PAUSED & database updated.");
    } else {
      // Resume
      const totalSec = state.configuredSeconds || 24 * 3600;
      newState = {
        ...state,
        action: 'start',
        configuredSeconds: totalSec,
        isTimerRunning: true,
        isCompleted: false,
        targetTime: now + totalSec * 1000
      };
      await executeDbWrite(newState, "Timer RESUMED & database updated.");
    }
  };

  const handleReset = async () => {
    if (!window.confirm("ARE YOU SURE? This will reset the countdown back to 24:00:00 on all 4 areas! (Repo link will be preserved)")) {
      return;
    }
    audio.playClick();
    const preservedRepo = githubRepoUrl.trim() || state.githubRepoUrl || 'https://github.com/balajik1910';
    const newState = {
      action: 'reset',
      targetTime: 0,
      sequenceStartTime: 0,
      isTimerRunning: false,
      isCompleted: false,
      configuredSeconds: 24 * 3600,
      showQrCode: false,
      githubRepoUrl: preservedRepo
    };
    // ONLY TIME CHANGES!
    setHours(24);
    setMinutes(0);
    setSeconds(0);
    // Preserved: githubRepoUrl is kept intact!
    setShowQrCode(false);
    setPreviewText("24:00:00");
    setStatusLabel("STANDBY / PAUSED");
    setStatusClass("bg-amber-500/20 text-amber-300 border-amber-400");
    await executeDbWrite(newState, "Countdown reset to 24:00:00! (GitHub Repo link preserved)");
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between items-center p-4 md:p-8 overflow-x-hidden font-sans select-none">
      <BackgroundCanvas />
      <div className="fixed inset-0 scanlines z-10 pointer-events-none" />

      <div className="relative z-20 w-full max-w-4xl flex flex-col items-center my-auto">
        <Header showAdminControls={true} />

        {/* Page Title */}
        <div className="w-full text-center my-4">
          <div className="inline-flex items-center space-x-2 mb-1 px-3 py-1 rounded-full poster-glass border border-purple-500/40 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-pink-400 animate-ping" />
            <span className="text-purple-200 font-bold tracking-widest">
              ADMIN CONTROL DECK // JUDGE BUZZER SYSTEM
            </span>
          </div>
          <h1 className="font-orbitron font-black text-2xl sm:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-pink-500 tracking-wider">
            MEGATHON '26 MASTER PANEL
          </h1>
        </div>

        {/* Database Connection & Sync Status Monitor */}
        <div className="w-full max-w-4xl mb-4 poster-glass rounded-2xl p-4 border border-purple-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center space-x-3">
            <span className={`w-3 h-3 rounded-full ${syncStatus.isConnected ? 'bg-emerald-400 shadow-[0_0_10px_#34d399]' : 'bg-amber-400 animate-pulse'}`} />
            <div>
              <span className="text-white font-bold block">
                {syncStatus.isConnected ? 'DATABASE CONNECTED' : 'CONNECTING TO DATABASE...'}
              </span>
              <span className="text-purple-300/80 text-[11px]">
                {syncStatus.method} &bull; Region: asia-southeast1
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {isSavingDb || syncStatus.isSyncing ? (
              <span className="inline-flex items-center space-x-2 text-pink-300 font-bold animate-pulse">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>SAVING TO CLOUD...</span>
              </span>
            ) : syncStatus.lastSyncedAt ? (
              <span className="text-emerald-300 text-[11px]">
                Last Synced: {new Date(syncStatus.lastSyncedAt).toLocaleTimeString()} ✓
              </span>
            ) : null}

            <div className="px-2.5 py-1 bg-purple-900/60 rounded-lg border border-purple-400/30 text-[11px] text-purple-200">
              Admin Authenticated
            </div>
          </div>
        </div>

        {/* Toast Alert */}
        {toastMsg && (
          <div className="w-full max-w-3xl mb-4 p-3 rounded-xl bg-purple-950/95 border border-pink-400 text-pink-200 font-mono text-xs font-bold text-center shadow-[0_0_25px_rgba(236,72,153,0.5)]">
            {toastMsg}
          </div>
        )}

        {/* ==================================================== */}
        {/* JUDGE MOBILE BUZZER HERO SECTION (RESPONSIVE FOR PHONE) */}
        {/* ==================================================== */}
        <div className="w-full poster-glass rounded-3xl p-6 md:p-8 mb-6 relative border-2 border-pink-500/40 shadow-[0_0_50px_rgba(236,72,153,0.25)] flex flex-col items-center text-center">
          <div className="tech-corner-tl"></div><div className="tech-corner-tr"></div>
          <div className="tech-corner-bl"></div><div className="tech-corner-br"></div>

          <span className="font-mono text-xs text-pink-400 font-bold tracking-[0.3em] uppercase mb-1">
            VIP / JUDGE LAUNCH TRIGGER
          </span>
          <h2 className="font-orbitron font-black text-xl sm:text-2xl text-white mb-4">
            THE MEGATHON BUZZER
          </h2>

          <p className="font-mono text-xs text-purple-200 max-w-md mb-6">
            Pressing this buzzer launches the 3-2-1 cinematic audio explosion, starts the 24-hr clock, and reveals the Problem Statement QR Code across all 4 area screens!
          </p>

          {/* Glowing 3D Buzzer Button */}
          <div className="relative my-2 flex items-center justify-center">
            {/* Buzzer Outer Pulse Aura */}
            {!state.isTimerRunning && (
              <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-pink-600 to-purple-600 opacity-60 blur-xl animate-pulse pointer-events-none" />
            )}

            <button
              onClick={handleJudgeBuzzerPress}
              disabled={isSavingDb}
              className={`group relative w-48 h-48 sm:w-56 sm:h-56 rounded-full flex flex-col items-center justify-center transition-all duration-200 shadow-2xl cursor-pointer ${
                buzzerPressed ? 'scale-90 brightness-125' : 'active:scale-95'
              } ${
                state.isTimerRunning
                  ? 'bg-gradient-to-b from-pink-600 via-purple-700 to-slate-900 border-4 border-pink-400 hover:border-white shadow-[0_0_50px_rgba(236,72,153,0.7)]'
                  : 'bg-gradient-to-b from-pink-500 via-red-600 to-purple-900 border-4 border-pink-300 hover:border-white shadow-[0_0_60px_rgba(236,72,153,0.8)]'
              }`}
            >
              {/* Inner Rim */}
              <div className="absolute inset-3 rounded-full border-2 border-white/30 pointer-events-none" />

              {/* Buzzer Icon */}
              <svg className="w-12 h-12 sm:w-16 sm:h-16 text-white group-hover:scale-110 transition-transform mb-1 drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="font-orbitron font-black text-sm sm:text-base tracking-[0.2em] text-white text-center px-4 drop-shadow-lg">
                {state.isTimerRunning ? 'RE-TRIGGER BUZZER' : 'PRESS BUZZER TO LAUNCH'}
              </span>
              {state.isTimerRunning && (
                <span className="font-mono text-[10px] text-pink-200 tracking-wider mt-1 uppercase">
                  (3-2-1 Sequence)
                </span>
              )}
            </button>
          </div>

          {/* Quick Pause / Resume & Emergency Reset for Admin */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 w-full max-w-md">
            <button
              onClick={handlePauseResume}
              disabled={isSavingDb}
              className="flex-1 py-3 px-4 poster-glass rounded-xl font-mono text-xs font-bold text-purple-200 hover:text-white border border-purple-500/40 hover:border-pink-400 transition-colors cursor-pointer"
            >
              {state.isTimerRunning ? '⏸️ PAUSE COUNTDOWN' : '▶️ RESUME COUNTDOWN'}
            </button>

            <button
              onClick={handleReset}
              disabled={isSavingDb}
              className="py-3 px-4 poster-glass rounded-xl font-mono text-xs font-bold text-pink-400 hover:text-white border border-pink-500/40 hover:border-pink-400 transition-colors cursor-pointer"
            >
              ⚠️ EMERGENCY RESET
            </button>
          </div>
        </div>

        {/* ==================================================== */}
        {/* PROBLEM STATEMENT GITHUB REPOSITORY CONFIGURATION */}
        {/* ==================================================== */}
        <div className="w-full poster-glass rounded-2xl p-6 mb-6 relative border border-purple-500/30">
          <div className="tech-corner-tl"></div><div className="tech-corner-tr"></div>
          <div className="tech-corner-bl"></div><div className="tech-corner-br"></div>

          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Live QR Preview */}
            <div className="p-3 bg-white rounded-2xl flex-shrink-0 shadow-[0_0_20px_rgba(168,85,247,0.4)]">
              <QRCodeSVG
                value={githubRepoUrl || 'https://github.com/balajik1910'}
                size={110}
                bgColor="#ffffff"
                fgColor="#0c051d"
                level="M"
              />
            </div>

            {/* Input & Broadcast Controls */}
            <div className="flex-1 w-full text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start space-x-2 mb-1">
                <svg className="w-4 h-4 text-pink-400" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                <h3 className="font-orbitron font-bold text-sm text-purple-200 tracking-wider">
                  PROBLEM STATEMENT REPOSITORY URL
                </h3>
              </div>
              <p className="font-mono text-xs text-purple-300/80 mb-3">
                This link will be encoded into the QR Code and presented on the 4 auditorium/lab projector screens.
              </p>

              <form onSubmit={handleSaveRepoUrl} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="url"
                  value={githubRepoUrl}
                  onChange={(e) => setGithubRepoUrl(e.target.value)}
                  placeholder="https://github.com/..."
                  className="flex-1 bg-slate-950/90 border border-purple-500/40 rounded-xl px-4 py-2.5 font-mono text-xs text-white focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-500 shadow-inner"
                  required
                />
                <button
                  type="submit"
                  disabled={isSavingDb}
                  className="py-2.5 px-5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-orbitron font-bold text-xs tracking-wider rounded-xl transition-all shadow-[0_0_15px_rgba(236,72,153,0.4)] cursor-pointer"
                >
                  SAVE LINK & SYNC TO DB
                </button>
              </form>

              <div className="mt-3 flex items-center space-x-2 text-xs font-mono text-purple-300/80">
                <span className="w-2 h-2 rounded-full bg-pink-400" />
                <span>Note: QR code stays hidden on viewer screens until the Buzzer is triggered.</span>
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================== */}
        {/* LIVE TIME TICKER & QUICK TIME BUMPERS */}
        {/* ==================================================== */}
        <div className="w-full poster-glass rounded-2xl p-6 mb-6 relative">
          <div className="tech-corner-tl"></div><div className="tech-corner-tr"></div>
          <div className="tech-corner-bl"></div><div className="tech-corner-br"></div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-purple-500/20 pb-4 mb-4">
            <div>
              <span className="font-mono text-xs text-gray-400 block mb-1">ARENA COUNTDOWN STATUS</span>
              <span className={`inline-flex items-center space-x-2 px-3 py-1 rounded border font-mono text-xs font-bold ${statusClass}`}>
                <span className="w-2 h-2 rounded-full bg-pink-400 animate-pulse" />
                <span>{statusLabel}</span>
              </span>
            </div>

            <div className="text-center sm:text-right">
              <span className="font-mono text-xs text-gray-400 block mb-1">LIVE TIME REMAINING</span>
              <span className="font-orbitron font-extrabold text-3xl md:text-4xl text-pink-400 text-glow-purple">
                {previewText}
              </span>
            </div>
          </div>

          {/* Quick Bumpers (+15m, +30m, etc.) */}
          <div>
            <span className="font-mono text-xs text-purple-300 block mb-2 font-bold tracking-wider">
              QUICK TIME ADJUSTMENT (DURING LIVE EVENT)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleAdjustMinutes(15)}
                disabled={isSavingDb}
                className="py-2.5 px-3 poster-glass rounded-xl font-mono text-xs font-bold text-emerald-300 hover:text-white hover:bg-emerald-600/30 border border-emerald-500/40 transition-all cursor-pointer"
              >
                +15 MINUTES
              </button>
              <button
                type="button"
                onClick={() => handleAdjustMinutes(30)}
                disabled={isSavingDb}
                className="py-2.5 px-3 poster-glass rounded-xl font-mono text-xs font-bold text-emerald-300 hover:text-white hover:bg-emerald-600/30 border border-emerald-500/40 transition-all cursor-pointer"
              >
                +30 MINUTES
              </button>
              <button
                type="button"
                onClick={() => handleAdjustMinutes(60)}
                disabled={isSavingDb}
                className="py-2.5 px-3 poster-glass rounded-xl font-mono text-xs font-bold text-purple-200 hover:text-white hover:bg-purple-600/30 border border-purple-500/40 transition-all cursor-pointer"
              >
                +1 HOUR
              </button>
              <button
                type="button"
                onClick={() => handleAdjustMinutes(-15)}
                disabled={isSavingDb}
                className="py-2.5 px-3 poster-glass rounded-xl font-mono text-xs font-bold text-pink-400 hover:text-white hover:bg-pink-600/30 border border-pink-500/40 transition-all cursor-pointer"
              >
                -15 MINUTES
              </button>
            </div>
          </div>
        </div>

        {/* ==================================================== */}
        {/* CUSTOM TIME CONFIGURATION & PRESETS */}
        {/* ==================================================== */}
        <div className="w-full poster-glass rounded-2xl p-6 md:p-8 relative mb-6">
          <div className="tech-corner-tl"></div><div className="tech-corner-tr"></div>
          <div className="tech-corner-bl"></div><div className="tech-corner-br"></div>

          {/* Quick Presets */}
          <div className="mb-6">
            <h3 className="font-orbitron font-bold text-sm text-purple-300 mb-3 tracking-wider flex items-center">
              <svg className="w-4 h-4 mr-2 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              DEFAULT PRESETS
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button type="button" onClick={() => handlePreset(24, 0, 0)} className="poster-glass py-3 px-4 rounded-xl font-mono text-xs font-bold text-purple-200 hover:text-white hover:bg-purple-600/30 hover:border-pink-400 transition-all cursor-pointer text-center">
                24 HOURS
              </button>
              <button type="button" onClick={() => handlePreset(12, 0, 0)} className="poster-glass py-3 px-4 rounded-xl font-mono text-xs font-bold text-purple-200 hover:text-white hover:bg-purple-600/30 hover:border-pink-400 transition-all cursor-pointer text-center">
                12 HOURS
              </button>
              <button type="button" onClick={() => handlePreset(1, 0, 0)} className="poster-glass py-3 px-4 rounded-xl font-mono text-xs font-bold text-purple-200 hover:text-white hover:bg-purple-600/30 hover:border-pink-400 transition-all cursor-pointer text-center">
                1 HOUR
              </button>
              <button type="button" onClick={() => handlePreset(0, 0, 10)} className="poster-glass py-3 px-4 rounded-xl font-mono text-xs font-bold text-pink-400 hover:text-white hover:bg-pink-600/30 hover:border-pink-400 transition-all cursor-pointer text-center border-pink-500/40">
                10 SEC TEST
              </button>
            </div>
          </div>

          {/* Custom Form */}
          <form onSubmit={handleApply} className="space-y-6">
            <h3 className="font-orbitron font-bold text-sm text-purple-300 tracking-wider flex items-center">
              <svg className="w-4 h-4 mr-2 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              CUSTOM TIME SPECIFICATION
            </h3>

            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col">
                <label className="font-mono text-xs text-purple-300 mb-2 font-bold tracking-wider">HOURS</label>
                <input
                  type="number"
                  min="0"
                  max="999"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  className="w-full bg-slate-950/90 border border-purple-500/40 rounded-xl px-4 py-3 text-center font-orbitron font-bold text-2xl text-white focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-500/50 shadow-inner"
                />
              </div>

              <div className="flex flex-col">
                <label className="font-mono text-xs text-purple-300 mb-2 font-bold tracking-wider">MINUTES</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  className="w-full bg-slate-950/90 border border-purple-500/40 rounded-xl px-4 py-3 text-center font-orbitron font-bold text-2xl text-white focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-500/50 shadow-inner"
                />
              </div>

              <div className="flex flex-col">
                <label className="font-mono text-xs text-purple-300 mb-2 font-bold tracking-wider">SECONDS</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={seconds}
                  onChange={(e) => setSeconds(e.target.value)}
                  className="w-full bg-slate-950/90 border border-purple-500/40 rounded-xl px-4 py-3 text-center font-orbitron font-bold text-2xl text-white focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-500/50 shadow-inner"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingDb}
              className="w-full py-4 px-6 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-orbitron font-bold text-sm tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(236,72,153,0.4)] cursor-pointer active:scale-95"
            >
              SET CUSTOM TIME & BROADCAST
            </button>
          </form>
        </div>

        {/* Footer Navigation Link */}
        <div className="w-full flex items-center justify-center pt-2">
          <Link
            to="/"
            target="_blank"
            className="text-center px-8 py-3.5 bg-purple-950/90 hover:bg-purple-900 border border-purple-400/50 hover:border-pink-400 rounded-xl font-orbitron text-xs text-purple-200 hover:text-white transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] flex items-center space-x-2"
          >
            <span>OPEN PUBLIC LIVE DISPLAY PAGE ( / ) IN NEW TAB &rarr;</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
