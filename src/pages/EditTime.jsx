import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import BackgroundCanvas from '../components/BackgroundCanvas';
import Header from '../components/Header';
import { audio } from '../utils/audio';
import { saveStateToStorage, loadStateFromStorage, subscribeToStateChanges } from '../utils/storage';

export default function EditTime() {
  const [hours, setHours] = useState(24);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);

  const [state, setState] = useState({
    targetTime: null,
    isTimerRunning: false,
    configuredSeconds: 24 * 3600,
    isCompleted: false,
    lastUpdated: Date.now()
  });

  const [previewText, setPreviewText] = useState("24:00:00");
  const [statusLabel, setStatusLabel] = useState("INITIALIZING");
  const [statusClass, setStatusClass] = useState("bg-purple-500/20 text-purple-300 border-purple-400");
  const [toggleBtnText, setToggleBtnText] = useState("START COUNTDOWN");
  const [toastMsg, setToastMsg] = useState("");

  const formatTime = (totalSec) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const updateViewFromState = (currState) => {
    if (!currState) return;
    setState(currState);

    const now = Date.now();
    let remainingSec = currState.configuredSeconds || 24 * 3600;

    if (currState.isCompleted) {
      setPreviewText("00:00:00");
      setStatusLabel("MEGATHON ENDED");
      setStatusClass("bg-pink-500/30 text-pink-300 border-pink-400");
      setToggleBtnText("RESTART COUNTDOWN");
      return;
    }

    if (currState.isTimerRunning && currState.targetTime) {
      const diffMs = currState.targetTime - now;
      if (diffMs > 0) {
        remainingSec = Math.floor(diffMs / 1000);
        setStatusLabel("COUNTDOWN ACTIVE");
        setStatusClass("bg-pink-500/20 text-pink-300 border-pink-400");
        setToggleBtnText("PAUSE COUNTDOWN");
      } else {
        remainingSec = 0;
        setStatusLabel("MEGATHON ENDED");
        setStatusClass("bg-pink-500/30 text-pink-300 border-pink-400");
        setToggleBtnText("START COUNTDOWN");
      }
    } else {
      setStatusLabel("READY / PAUSED");
      setStatusClass("bg-purple-500/20 text-purple-300 border-purple-400");
      setToggleBtnText("START COUNTDOWN");
    }

    setPreviewText(formatTime(remainingSec));
  };

  useEffect(() => {
    const st = loadStateFromStorage();
    if (st) {
      updateViewFromState(st);
      const currentSec = st.isTimerRunning && st.targetTime ? Math.max(0, Math.floor((st.targetTime - Date.now()) / 1000)) : (st.configuredSeconds || 24 * 3600);
      setHours(Math.floor(currentSec / 3600));
      setMinutes(Math.floor((currentSec % 3600) / 60));
      setSeconds(currentSec % 60);
    }

    const unsubscribe = subscribeToStateChanges((newState) => {
      updateViewFromState(newState);
    });

    return () => unsubscribe();
  }, []);

  // Update preview ticker
  useEffect(() => {
    const interval = setInterval(() => {
      const st = loadStateFromStorage();
      if (st) updateViewFromState(st);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handlePreset = (h, m, s) => {
    audio.playClick();
    setHours(h);
    setMinutes(m);
    setSeconds(s);
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const handleApply = (e) => {
    e.preventDefault();
    audio.playClick();

    const h = parseInt(hours, 10) || 0;
    const m = parseInt(minutes, 10) || 0;
    const s = parseInt(seconds, 10) || 0;
    let totalSec = h * 3600 + m * 60 + s;
    if (totalSec <= 0) totalSec = 1;

    const newState = {
      ...state,
      action: 'edit',
      configuredSeconds: totalSec,
      isCompleted: false,
      targetTime: state.isTimerRunning ? Date.now() + totalSec * 1000 : state.targetTime
    };

    saveStateToStorage(newState);
    updateViewFromState(newState);
    showToast(`Timer updated to ${formatTime(totalSec)}! Synced to all connected laptops.`);
  };

  const handleStartPauseToggle = () => {
    audio.playClick();
    const currentSt = loadStateFromStorage() || state;

    const h = parseInt(hours, 10) || 0;
    const m = parseInt(minutes, 10) || 0;
    const s = parseInt(seconds, 10) || 0;
    let totalSec = h * 3600 + m * 60 + s;
    if (totalSec <= 0) totalSec = 1;

    let newState;
    if (currentSt.isTimerRunning) {
      // Pause
      const remainingMs = currentSt.targetTime ? Math.max(0, currentSt.targetTime - Date.now()) : 0;
      newState = {
        action: 'pause',
        configuredSeconds: Math.floor(remainingMs / 1000),
        isTimerRunning: false,
        isCompleted: false,
        targetTime: null
      };
    } else {
      // Start
      newState = {
        action: 'start',
        configuredSeconds: totalSec,
        isTimerRunning: true,
        isCompleted: false,
        targetTime: Date.now() + totalSec * 1000
      };
    }

    saveStateToStorage(newState);
    updateViewFromState(newState);
  };

  const handleReset = () => {
    audio.playClick();
    const newState = {
      action: 'reset',
      targetTime: null,
      isTimerRunning: false,
      isCompleted: false,
      configuredSeconds: 24 * 3600
    };
    saveStateToStorage(newState);
    setHours(24);
    setMinutes(0);
    setSeconds(0);
    updateViewFromState(newState);
    showToast('Reset protocol applied! All laptops set to 24 hours.');
  };

  return (
    <div class="relative min-h-screen w-full flex flex-col justify-between items-center p-4 md:p-8 overflow-hidden font-sans">
      <BackgroundCanvas />
      <div class="fixed inset-0 scanlines z-10" />

      <div class="relative z-20 w-full max-w-4xl flex flex-col items-center my-auto">
        <Header showAdminControls={true} />

        <div class="w-full text-center my-6">
          <div class="inline-flex items-center space-x-2 mb-1">
            <span class="w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping" />
            <span class="font-mono text-xs text-purple-300 tracking-[0.25em] uppercase font-bold">ADMIN CONTROL PANEL // /EDITTIME</span>
          </div>
          <h1 class="font-orbitron font-black text-2xl sm:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-pink-500 tracking-wider">
            MEGATHON '26 TIMER EDITOR
          </h1>
        </div>

        {toastMsg && (
          <div class="w-full max-w-3xl mb-4 p-3 rounded-xl bg-purple-950/90 border border-pink-400 text-pink-300 font-mono text-xs font-bold text-center animate-bounce shadow-[0_0_20px_rgba(236,72,153,0.3)]">
            {toastMsg}
          </div>
        )}

        {/* STATUS CARD */}
        <div class="w-full poster-glass rounded-2xl p-6 mb-6 relative">
          <div class="tech-corner-tl"></div><div class="tech-corner-tr"></div>
          <div class="tech-corner-bl"></div><div class="tech-corner-br"></div>

          <div class="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-purple-500/20 pb-4 mb-4">
            <div>
              <span class="font-mono text-xs text-gray-400 block mb-1">CURRENT STATUS</span>
              <span class={`inline-flex items-center space-x-2 px-3 py-1 rounded border font-mono text-xs font-bold ${statusClass}`}>
                <span class="w-2 h-2 rounded-full bg-pink-400 animate-pulse" />
                <span>{statusLabel}</span>
              </span>
            </div>
            
            <div class="text-center sm:text-right">
              <span class="font-mono text-xs text-gray-400 block mb-1">LIVE REMAINING COUNTDOWN</span>
              <span class="font-orbitron font-extrabold text-2xl md:text-3xl text-pink-400 text-glow-purple">
                {previewText}
              </span>
            </div>
          </div>

          <p class="font-mono text-xs text-purple-300/80 text-center sm:text-left font-semibold">
            * Changes saved here instantly update the live countdown page (/) across all logged-in laptops in real-time!
          </p>
        </div>

        {/* FORM CARD */}
        <div class="w-full poster-glass rounded-2xl p-6 md:p-8 relative mb-6">
          <div class="tech-corner-tl"></div><div class="tech-corner-tr"></div>
          <div class="tech-corner-bl"></div><div class="tech-corner-br"></div>

          {/* Quick Presets */}
          <div class="mb-8">
            <h3 class="font-orbitron font-bold text-sm text-purple-300 mb-3 tracking-wider flex items-center">
              <svg class="w-4 h-4 mr-2 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              QUICK PRESET SELECTION
            </h3>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button type="button" onClick={() => handlePreset(24, 0, 0)} class="poster-glass py-3 px-4 rounded-xl font-mono text-xs font-bold text-purple-200 hover:text-white hover:bg-purple-600/30 hover:border-pink-400 transition-all cursor-pointer text-center">
                24 HOURS
              </button>
              <button type="button" onClick={() => handlePreset(12, 0, 0)} class="poster-glass py-3 px-4 rounded-xl font-mono text-xs font-bold text-purple-200 hover:text-white hover:bg-purple-600/30 hover:border-pink-400 transition-all cursor-pointer text-center">
                12 HOURS
              </button>
              <button type="button" onClick={() => handlePreset(1, 0, 0)} class="poster-glass py-3 px-4 rounded-xl font-mono text-xs font-bold text-purple-200 hover:text-white hover:bg-purple-600/30 hover:border-pink-400 transition-all cursor-pointer text-center">
                1 HOUR
              </button>
              <button type="button" onClick={() => handlePreset(0, 0, 10)} class="poster-glass py-3 px-4 rounded-xl font-mono text-xs font-bold text-pink-400 hover:text-white hover:bg-pink-600/30 hover:border-pink-400 transition-all cursor-pointer text-center border-pink-500/40">
                10 SEC TEST
              </button>
            </div>
          </div>

          {/* Custom Time Form */}
          <form onSubmit={handleApply} class="space-y-6">
            <h3 class="font-orbitron font-bold text-sm text-purple-300 tracking-wider flex items-center">
              <svg class="w-4 h-4 mr-2 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              CUSTOM TIME CONFIGURATION
            </h3>

            <div class="grid grid-cols-3 gap-4">
              <div class="flex flex-col">
                <label class="font-mono text-xs text-purple-300 mb-2 font-bold tracking-wider">HOURS</label>
                <input 
                  type="number" 
                  min="0" 
                  max="999" 
                  value={hours} 
                  onChange={(e) => setHours(e.target.value)}
                  class="w-full bg-slate-950/90 border border-purple-500/40 rounded-xl px-4 py-3 text-center font-orbitron font-bold text-2xl text-white focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-500/50 shadow-inner"
                />
              </div>

              <div class="flex flex-col">
                <label class="font-mono text-xs text-purple-300 mb-2 font-bold tracking-wider">MINUTES</label>
                <input 
                  type="number" 
                  min="0" 
                  max="59" 
                  value={minutes} 
                  onChange={(e) => setMinutes(e.target.value)}
                  class="w-full bg-slate-950/90 border border-purple-500/40 rounded-xl px-4 py-3 text-center font-orbitron font-bold text-2xl text-white focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-500/50 shadow-inner"
                />
              </div>

              <div class="flex flex-col">
                <label class="font-mono text-xs text-purple-300 mb-2 font-bold tracking-wider">SECONDS</label>
                <input 
                  type="number" 
                  min="0" 
                  max="59" 
                  value={seconds} 
                  onChange={(e) => setSeconds(e.target.value)}
                  class="w-full bg-slate-950/90 border border-purple-500/40 rounded-xl px-4 py-3 text-center font-orbitron font-bold text-2xl text-white focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-500/50 shadow-inner"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-purple-500/20">
              <button 
                type="button" 
                onClick={handleStartPauseToggle}
                class="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-orbitron font-bold text-sm tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)] cursor-pointer active:scale-95"
              >
                {toggleBtnText}
              </button>

              <button 
                type="submit" 
                class="w-full py-4 px-6 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-orbitron font-bold text-sm tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(236,72,153,0.4)] cursor-pointer active:scale-95"
              >
                APPLY & UPDATE TIME
              </button>
            </div>
          </form>
        </div>

        <div class="w-full flex flex-col sm:flex-row items-center justify-between gap-4">
          <button onClick={handleReset} class="w-full sm:w-auto px-6 py-3 poster-glass rounded-xl font-mono text-xs text-pink-400 hover:text-white hover:border-pink-400 transition-all cursor-pointer">
            RESET TO 24 HOURS
          </button>

          <Link to="/" class="w-full sm:w-auto text-center px-8 py-3 bg-purple-950/80 hover:bg-purple-900 border border-purple-400/50 rounded-xl font-orbitron text-xs text-purple-200 hover:text-white transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)]">
            &larr; OPEN LIVE COUNTDOWN PAGE ( / )
          </Link>
        </div>
      </div>
    </div>
  );
}
