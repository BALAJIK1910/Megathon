import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import BackgroundCanvas from '../components/BackgroundCanvas';
import LaunchSequence from '../components/LaunchSequence';
import CountdownDisplay from '../components/CountdownDisplay';
import Footer from '../components/Footer';
import { audio } from '../utils/audio';
import { saveStateToStorage, loadStateFromStorage, subscribeToStateChanges } from '../utils/storage';

export default function LiveCountdown() {
  const [configuredSeconds, setConfiguredSeconds] = useState(24 * 3600);
  const [targetTime, setTargetTime] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Digits
  const [displayHours, setDisplayHours] = useState(24);
  const [displayMinutes, setDisplayMinutes] = useState(0);
  const [displaySeconds, setDisplaySeconds] = useState(0);

  // Cinematic Sequence
  const [bombStage, setBombStage] = useState(0);
  const [fuseProgress, setFuseProgress] = useState(0);
  const [seqNumber, setSeqNumber] = useState("3");
  const [flashActive, setFlashActive] = useState(false);
  const [shakeClass, setShakeClass] = useState("");

  const updateDigitsFromTotalSec = (totalSec) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    setDisplayHours(h);
    setDisplayMinutes(m);
    setDisplaySeconds(s);
  };

  // Sync state from storage helper
  const syncFromState = (state) => {
    if (!state) return;

    if (typeof state.configuredSeconds === 'number' && state.configuredSeconds > 0) {
      setConfiguredSeconds(state.configuredSeconds);
    }

    if (state.isTimerRunning && state.targetTime) {
      const remainingMs = state.targetTime - Date.now();
      if (remainingMs > 0) {
        setTargetTime(state.targetTime);
        setIsRunning(true);
        setIsCompleted(false);
      } else {
        setIsRunning(false);
        setTargetTime(null);
        setIsCompleted(true);
      }
    } else {
      setIsRunning(false);
      setTargetTime(null);
      setIsCompleted(false);
      updateDigitsFromTotalSec(state.configuredSeconds || 24 * 3600);
    }
  };

  // Initial load & subscribe to live state changes from /edittime
  useEffect(() => {
    const initialState = loadStateFromStorage();
    syncFromState(initialState);

    const unsubscribe = subscribeToStateChanges((newState) => {
      syncFromState(newState);
    });

    return () => unsubscribe();
  }, []);

  // Countdown tick interval
  useEffect(() => {
    if (!isRunning || !targetTime) return;

    const interval = setInterval(() => {
      const remainingMs = Math.max(0, targetTime - Date.now());
      const totalSec = Math.floor(remainingMs / 1000);

      updateDigitsFromTotalSec(totalSec);

      if (remainingMs <= 0) {
        setIsRunning(false);
        setTargetTime(null);
        setIsCompleted(true);
        audio.playBurst();
        saveStateToStorage({ isTimerRunning: false, targetTime: null, configuredSeconds });
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, targetTime, configuredSeconds]);

  // Start sequence
  const handleStartSequence = () => {
    audio.init();
    audio.playClick();

    setBombStage(3);
    setFuseProgress(0.1);
    setSeqNumber("3");
    setShakeClass("");
    audio.playBeep(520, 0.2);

    setTimeout(() => {
      setBombStage(2);
      setFuseProgress(0.45);
      setSeqNumber("2");
      setShakeClass("shake-mild");
      audio.playBeep(650, 0.2);
    }, 1000);

    setTimeout(() => {
      setBombStage(1);
      setFuseProgress(0.85);
      setSeqNumber("1");
      setShakeClass("shake-intense");
      audio.playBeep(850, 0.25);
    }, 2000);

    setTimeout(() => {
      setBombStage(4);
      setFuseProgress(1.0);
      setSeqNumber("GO");
      setShakeClass("");
      setFlashActive(true);
      audio.playBurst();

      setTimeout(() => setFlashActive(false), 600);
    }, 3000);

    setTimeout(() => {
      setBombStage(0);
      const newTarget = Date.now() + configuredSeconds * 1000;
      setTargetTime(newTarget);
      setIsRunning(true);
      setIsCompleted(false);
      saveStateToStorage({ isTimerRunning: true, targetTime: newTarget, configuredSeconds });
    }, 4000);
  };

  const handleReset = () => {
    audio.playClick();
    setIsRunning(false);
    setTargetTime(null);
    setBombStage(0);
    setIsCompleted(false);
    updateDigitsFromTotalSec(configuredSeconds);
    saveStateToStorage({ isTimerRunning: false, targetTime: null, configuredSeconds });
  };

  return (
    <div class={`relative min-h-screen w-full flex flex-col justify-between items-center overflow-hidden font-sans antialiased ${shakeClass}`}>
      <BackgroundCanvas />

      <div class="fixed inset-0 scanlines z-10" />
      <div class={`flash-overlay ${flashActive ? 'flash-active' : ''}`} />

      {/* Radar FX */}
      <div class="fixed inset-0 flex items-center justify-center z-0 pointer-events-none opacity-25">
        <div class="w-[750px] h-[750px] rounded-full border border-purple-500/30 animate-spin-slow flex items-center justify-center">
          <div class="w-[550px] h-[550px] rounded-full border border-dashed border-pink-500/40 animate-spin-reverse flex items-center justify-center">
            <div class="w-[380px] h-[380px] rounded-full border border-violet-400/20" />
          </div>
        </div>
      </div>

      <div class="relative z-20 w-full min-h-screen flex flex-col justify-between px-6 py-6 md:px-10 lg:px-12 md:py-8">
        {/* CLEAN HEADER: Edge-to-edge fitting full screen width */}
        <header class="w-full flex flex-row items-center justify-between border-b border-purple-500/30 pb-4 gap-4">
          <div class="flex items-center space-x-4">
            <div class="flex flex-col text-left">
              <div class="flex items-center space-x-2">
                <span class="font-orbitron font-extrabold text-lg md:text-xl text-white tracking-widest">SAVEETHA</span>
                <span class="bg-pink-600 text-white text-[10px] font-bold px-2 py-0.5 rounded tracking-wider uppercase">AUTONOMOUS</span>
              </div>
              <span class="font-rajdhani font-semibold text-xs text-purple-300 tracking-wider">ENGINEERING COLLEGE // AFFILIATED TO ANNA UNIVERSITY</span>
              <span class="font-mono text-[10px] text-pink-400 font-bold mt-0.5">25 YEARS OF EXCELLENCE</span>
            </div>
          </div>

          <div class="flex items-center space-x-4">
            <img src="/dres.png" alt="DRESTEIN '26 Logo" class="h-10 sm:h-12 md:h-14 lg:h-16 object-contain filter drop-shadow-[0_0_20px_rgba(168,85,247,0.7)]" />
          </div>
        </header>

        <main class="w-full max-w-6xl mx-auto my-auto flex flex-col items-center justify-center text-center py-6">
          <div class="flex items-center space-x-3 mb-2">
            <span class="h-[1px] w-8 md:w-16 bg-gradient-to-r from-transparent to-pink-500" />
            <span class="font-mono text-xs md:text-sm tracking-[0.35em] text-pink-300 uppercase font-semibold">
              BUILD • CODE • CREATE • INNOVATE
            </span>
            <span class="h-[1px] w-8 md:w-16 bg-gradient-to-l from-transparent to-pink-500" />
          </div>

          <div class="mb-6 flex flex-col items-center">
            <h1 class="font-orbitron font-black text-4xl sm:text-6xl md:text-7xl lg:text-8xl tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-white via-purple-100 to-purple-400 drop-shadow-2xl animate-glow-pulse">
              MEGATHON
            </h1>
            <span class="font-orbitron font-extrabold text-lg sm:text-2xl md:text-3xl tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-300 to-indigo-400 uppercase mt-1">
              FUSION FOR FUTURE '26
            </span>
          </div>

          <LaunchSequence bombStage={bombStage} fuseBurnProgress={fuseProgress} seqNumber={seqNumber} />

          {bombStage === 0 && !isCompleted && (
            <CountdownDisplay hours={displayHours} minutes={displayMinutes} seconds={displaySeconds} />
          )}

          {isCompleted && (
            <div class="my-8 p-6 poster-glass rounded-2xl max-w-2xl border-2 border-pink-400 animate-bounce">
              <h2 class="font-orbitron font-black text-3xl md:text-5xl text-pink-300 text-glow-magenta mb-2">
                MEGATHON HAS ENDED!
              </h2>
              <p class="font-mono text-sm text-purple-200 tracking-wider">
                THANK YOU FOR JOINING THE 24-HOUR HACKATHON ARENA. SEE YOU NEXT TIME!
              </p>
            </div>
          )}

          <div class="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4 z-30">
            <button
              onClick={handleStartSequence}
              disabled={isRunning || bombStage > 0}
              class={`group relative px-10 py-4 bg-gradient-to-r from-purple-600/30 to-pink-600/30 hover:from-purple-600/50 hover:to-pink-600/50 text-white font-orbitron font-bold text-sm md:text-base tracking-[0.25em] rounded-xl border border-purple-400/60 hover:border-pink-400 transition-all duration-300 shadow-[0_0_25px_rgba(168,85,247,0.3)] hover:shadow-[0_0_40px_rgba(236,72,153,0.7)] active:scale-95 cursor-pointer ${isRunning || bombStage > 0 ? 'opacity-70 cursor-not-allowed' : ''
                }`}
            >
              <div class="tech-corner-tl"></div><div class="tech-corner-tr"></div>
              <div class="tech-corner-bl"></div><div class="tech-corner-br"></div>
              <span class="flex items-center space-x-3">
                <svg class="w-5 h-5 text-pink-400 group-hover:animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{isRunning ? 'COUNTDOWN RUNNING' : bombStage > 0 ? 'INITIALIZING PROTOCOL...' : 'START COUNTDOWN'}</span>
              </span>
            </button>

            {(isRunning || isCompleted) && (
              <button
                onClick={handleReset}
                class="px-6 py-3.5 poster-glass rounded-xl font-mono text-xs text-purple-300 hover:text-pink-300 transition-colors border border-purple-700 hover:border-pink-500/50 cursor-pointer"
              >
                RESET PROTOCOL
              </button>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
