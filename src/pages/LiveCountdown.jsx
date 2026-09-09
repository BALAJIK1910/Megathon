import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import BackgroundCanvas from '../components/BackgroundCanvas';
import LaunchSequence from '../components/LaunchSequence';
import CountdownDisplay from '../components/CountdownDisplay';
import Header from '../components/Header';
import { audio } from '../utils/audio';
import { subscribeToStateChanges, getServerTime } from '../utils/storage';

export default function LiveCountdown() {
  const [configuredSeconds, setConfiguredSeconds] = useState(24 * 3600);
  const [targetTime, setTargetTime] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Problem statement repo & QR Code
  const [githubRepoUrl, setGithubRepoUrl] = useState('https://github.com/balajik1910');
  const [showQrCode, setShowQrCode] = useState(false);

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

  // Kiosk & Audio UX
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const lastSeqTimestamp = useRef(null);

  const updateDigitsFromTotalSec = (totalSec) => {
    const safeSec = Math.max(0, totalSec);
    const h = Math.floor(safeSec / 3600);
    const m = Math.floor((safeSec % 3600) / 60);
    const s = safeSec % 60;
    setDisplayHours(h);
    setDisplayMinutes(m);
    setDisplaySeconds(s);
  };

  const unlockAudio = () => {
    try {
      audio.init();
      setAudioUnlocked(true);
    } catch {
      // Audio unlock error fallback
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const triggerSequenceAnimationLocally = (sequenceStartTime) => {
    if (lastSeqTimestamp.current === sequenceStartTime) return;
    lastSeqTimestamp.current = sequenceStartTime;

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
      setShowQrCode(true);
    }, 4000);
  };

  // Sync state from Firebase Realtime Database
  const syncFromState = (state) => {
    if (!state) return;

    if (typeof state.configuredSeconds === 'number' && state.configuredSeconds > 0) {
      setConfiguredSeconds(state.configuredSeconds);
    }

    if (state.githubRepoUrl) {
      setGithubRepoUrl(state.githubRepoUrl);
    }

    if (typeof state.showQrCode === 'boolean') {
      setShowQrCode(state.showQrCode);
    }

    // Check for incoming launch sequence trigger (robust against device clock drift)
    if (state.action === 'sequence' && state.sequenceStartTime && state.sequenceStartTime > 0) {
      const now = getServerTime();
      const elapsed = now - state.sequenceStartTime;
      if (lastSeqTimestamp.current !== state.sequenceStartTime && Math.abs(elapsed) < 30000) {
        triggerSequenceAnimationLocally(state.sequenceStartTime);
      }
    }

    if (state.isCompleted) {
      setIsRunning(false);
      setTargetTime(null);
      setIsCompleted(true);
      updateDigitsFromTotalSec(0);
      return;
    }

    if (state.isTimerRunning && state.targetTime && state.targetTime > 0) {
      const now = getServerTime();
      const remainingMs = state.targetTime - now;
      if (remainingMs > 0) {
        setTargetTime(state.targetTime);
        setIsRunning(true);
        setIsCompleted(false);
        // Ensure QR code is visible when timer is active
        if (state.showQrCode !== false) {
          setShowQrCode(true);
        }
      } else {
        setIsRunning(false);
        setTargetTime(null);
        setIsCompleted(true);
        updateDigitsFromTotalSec(0);
      }
    } else {
      setIsRunning(false);
      setTargetTime(null);
      setIsCompleted(false);
      setShowQrCode(false);
      updateDigitsFromTotalSec(state.configuredSeconds || 24 * 3600);
    }
  };

  // Initial load & subscribe to live state changes from Firebase RTDB
  useEffect(() => {
    const unsubscribe = subscribeToStateChanges((newState) => {
      syncFromState(newState);
    });

    // Keep screen awake for 24-hour presentation
    let wakeLock = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch {
        // Wake lock optional fallback
      }
    };
    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Auto unlock audio on any first user click anywhere on screen
    const handleFirstClick = () => {
      unlockAudio();
      requestWakeLock();
      window.removeEventListener('click', handleFirstClick);
    };
    window.addEventListener('click', handleFirstClick);

    return () => {
      unsubscribe();
      window.removeEventListener('click', handleFirstClick);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock) {
        wakeLock.release().catch(() => {});
      }
    };
  }, []);

  // High-precision countdown tick interval with ZERO drift using server-synchronized time
  useEffect(() => {
    if (!isRunning || !targetTime) return;

    const tick = () => {
      const now = getServerTime();
      const remainingMs = targetTime - now;

      if (remainingMs <= 0) {
        setIsRunning(false);
        setTargetTime(null);
        setIsCompleted(true);
        updateDigitsFromTotalSec(0);
        audio.playBurst();
      } else {
        const totalSec = Math.floor(remainingMs / 1000);
        updateDigitsFromTotalSec(totalSec);
      }
    };

    tick();
    const interval = setInterval(tick, 100);

    return () => clearInterval(interval);
  }, [isRunning, targetTime]);

  return (
    <div
      onClick={unlockAudio}
      className={`relative min-h-screen w-full flex flex-col justify-between items-center overflow-x-hidden font-sans antialiased select-none ${shakeClass}`}
    >
      <BackgroundCanvas />

      {/* CRT Scanlines Overlay & Flash */}
      <div className="fixed inset-0 scanlines z-10 pointer-events-none" />
      <div className={`flash-overlay ${flashActive ? 'flash-active' : ''}`} />

      {/* Radar FX */}
      <div className="fixed inset-0 flex items-center justify-center z-0 pointer-events-none opacity-20">
        <div className="w-[750px] h-[750px] rounded-full border border-purple-500/30 animate-spin-slow flex items-center justify-center">
          <div className="w-[550px] h-[550px] rounded-full border border-dashed border-pink-500/40 animate-spin-reverse flex items-center justify-center">
            <div className="w-[380px] h-[380px] rounded-full border border-violet-400/20" />
          </div>
        </div>
      </div>

      {/* Stage Content */}
      <div className="relative z-20 w-full min-h-screen flex flex-col justify-between px-6 py-6 md:px-10 lg:px-12 md:py-8">
        <Header showAdminControls={false} />

        <main className="w-full max-w-6xl mx-auto my-auto flex flex-col items-center justify-center text-center py-4">
          {/* Subtitle Badge */}
          <div className="flex items-center space-x-3 mb-2">
            <span className="h-[1px] w-8 md:w-16 bg-gradient-to-r from-transparent to-pink-500" />
            <span className="font-mono text-xs md:text-sm tracking-[0.35em] text-pink-300 uppercase font-semibold">
              BUILD • CODE • CREATE • INNOVATE
            </span>
            <span className="h-[1px] w-8 md:w-16 bg-gradient-to-l from-transparent to-pink-500" />
          </div>

          {/* Event Title */}
          <div className="mb-6 flex flex-col items-center">
            <h1 className="font-orbitron font-black text-4xl sm:text-6xl md:text-7xl lg:text-8xl tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-white via-purple-100 to-purple-400 drop-shadow-2xl animate-glow-pulse">
              MEGATHON
            </h1>
            <span className="font-orbitron font-extrabold text-lg sm:text-2xl md:text-3xl tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-300 to-indigo-400 uppercase mt-1">
              FUSION FOR FUTURE '26
            </span>

            {/* Live Arena Status Pill */}
            <div className="mt-3 flex items-center space-x-2 px-4 py-1 rounded-full poster-glass border border-purple-500/30 text-xs font-mono">
              <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-400 animate-ping' : bombStage > 0 ? 'bg-pink-400 animate-bounce' : isCompleted ? 'bg-red-400' : 'bg-amber-400 animate-pulse'}`} />
              <span className="tracking-widest uppercase font-bold text-purple-200">
                {bombStage > 0
                  ? 'LAUNCH SEQUENCE INITIATED BY JUDGE'
                  : isRunning
                  ? 'HACKATHON IN PROGRESS • ROUND 1'
                  : isCompleted
                  ? 'MEGATHON 2026 CONCLUDED'
                  : 'STANDBY • AWAITING JUDGE LAUNCH BUZZER'}
              </span>
            </div>
          </div>

          {/* 3-2-1 Launch Sequence */}
          <LaunchSequence bombStage={bombStage} fuseBurnProgress={fuseProgress} seqNumber={seqNumber} />

          {/* Countdown Clock Display */}
          {bombStage === 0 && !isCompleted && (
            <div className="w-full flex flex-col items-center">
              <CountdownDisplay hours={displayHours} minutes={displayMinutes} seconds={displaySeconds} />
            </div>
          )}

          {/* PROBLEM STATEMENT GITHUB REPO QR CODE CARD (Revealed upon Buzzer Launch) */}
          {showQrCode && isRunning && !isCompleted && bombStage === 0 && (
            <div className="mt-8 w-full max-w-2xl poster-glass p-6 md:p-8 rounded-3xl border-2 border-purple-500/50 hover:border-pink-400 shadow-[0_0_40px_rgba(168,85,247,0.3)] transition-all relative overflow-hidden animate-fadeIn">
              <div className="tech-corner-tl"></div><div className="tech-corner-tr"></div>
              <div className="tech-corner-bl"></div><div className="tech-corner-br"></div>

              <div className="flex flex-col md:flex-row items-center justify-center gap-6 text-center md:text-left">
                {/* QR Code Container */}
                <div className="p-3 bg-white rounded-2xl shadow-[0_0_25px_rgba(236,72,153,0.5)] flex items-center justify-center flex-shrink-0">
                  <QRCodeSVG
                    value={githubRepoUrl || 'https://github.com/balajik1910'}
                    size={160}
                    bgColor="#ffffff"
                    fgColor="#0c051d"
                    level="H"
                    includeMargin={false}
                  />
                </div>

                {/* Details & Instructions */}
                <div className="flex flex-col items-center md:items-start space-y-2 max-w-sm">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-pink-400" viewBox="0 0 24 24" fill="currentColor">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                    </svg>
                    <span className="font-orbitron font-bold text-xs tracking-[0.2em] text-pink-300 uppercase">
                      OFFICIAL REPOSITORY
                    </span>
                  </div>

                  <h3 className="font-orbitron font-extrabold text-lg md:text-xl text-white tracking-wide">
                    PROBLEM STATEMENTS
                  </h3>

                  <p className="font-mono text-xs text-purple-200 leading-relaxed">
                    Scan the QR code with your phone or laptop camera to view challenge tracks, submission guidelines, and sample datasets.
                  </p>

                  <a
                    href={githubRepoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1.5 font-mono text-xs text-pink-400 hover:text-white underline underline-offset-4 decoration-pink-500/50 break-all transition-colors pt-1"
                  >
                    <span>{githubRepoUrl}</span>
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* MEGATHON CONCLUDED SCREEN */}
          {isCompleted && (
            <div className="my-8 p-8 poster-glass rounded-3xl max-w-3xl border-2 border-pink-400 shadow-[0_0_50px_rgba(236,72,153,0.5)] animate-bounce text-center relative overflow-hidden">
              <div className="tech-corner-tl"></div><div className="tech-corner-tr"></div>
              <div className="tech-corner-bl"></div><div className="tech-corner-br"></div>
              <div className="flex items-center justify-center space-x-3 mb-2">
                <span className="w-3 h-3 rounded-full bg-pink-500 animate-ping"></span>
                <span className="font-mono text-xs text-pink-400 tracking-[0.3em] font-bold uppercase">TIME EXPIRED</span>
              </div>
              <h2 className="font-orbitron font-black text-4xl sm:text-5xl md:text-6xl text-pink-300 text-glow-magenta mb-3 tracking-wider">
                MEGATHON HAS ENDED!
              </h2>
              <p className="font-mono text-sm md:text-base text-purple-200 tracking-widest font-semibold max-w-xl mx-auto">
                ALL SUBMISSIONS ARE NOW CLOSED. THANK YOU TO ALL HACKERS AND MENTORS!
              </p>
            </div>
          )}
        </main>

        {/* Bottom Status Bar for Kiosk Displays */}
        <footer className="w-full flex items-center justify-between text-xs font-mono text-purple-400/70 pt-4 border-t border-purple-500/20">
          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1.5">
              <span className={`w-2 h-2 rounded-full ${audioUnlocked ? 'bg-green-400' : 'bg-amber-400'}`} />
              <span className="text-[11px]">{audioUnlocked ? 'ARENA AUDIO ACTIVE' : 'TAP SCREEN TO UNMUTE AUDIO'}</span>
            </span>
          </div>

          <button
            onClick={toggleFullscreen}
            title="Toggle Fullscreen Presentation (F11)"
            className="flex items-center space-x-1 text-purple-300 hover:text-pink-300 transition-colors cursor-pointer px-2 py-1 rounded poster-glass border border-purple-500/30"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            <span className="text-[10px] tracking-wider uppercase font-bold">{isFullscreen ? 'EXIT FULLSCREEN' : 'FULLSCREEN'}</span>
          </button>
        </footer>
      </div>
    </div>
  );
}
