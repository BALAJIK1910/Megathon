import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, DEFAULT_ADMIN_USER, DEFAULT_ADMIN_PASS } from '../context/AuthContext';
import BackgroundCanvas from '../components/BackgroundCanvas';
import { audio } from '../utils/audio';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shakeClass, setShakeClass] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/admin';

  const handleSubmit = (e) => {
    e.preventDefault();
    audio.playClick();
    setErrorMsg('');

    if (!username.trim() || !password) {
      setErrorMsg('PLEASE PROVIDE BOTH ADMIN ID AND SECURITY PASSWORD');
      setShakeClass('shake-mild');
      setTimeout(() => setShakeClass(''), 500);
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const res = login(username, password);
      setIsSubmitting(false);

      if (res.success) {
        audio.playBeep(880, 0.3);
        navigate(from, { replace: true });
      } else {
        audio.playBeep(250, 0.4);
        setErrorMsg(res.error || 'ACCESS DENIED: INVALID CREDENTIALS');
        setShakeClass('shake-intense');
        setTimeout(() => setShakeClass(''), 500);
      }
    }, 400);
  };

  const handleQuickFill = () => {
    audio.playClick();
    setUsername(DEFAULT_ADMIN_USER);
    setPassword(DEFAULT_ADMIN_PASS);
    setErrorMsg('');
  };

  return (
    <div class={`relative min-h-screen w-full flex flex-col justify-between items-center p-4 md:p-8 overflow-hidden font-sans ${shakeClass}`}>
      <BackgroundCanvas />
      <div class="fixed inset-0 scanlines z-10" />

      {/* Cyber Grid Radar Graphic */}
      <div class="fixed inset-0 flex items-center justify-center z-0 pointer-events-none opacity-20">
        <div class="w-[700px] h-[700px] rounded-full border border-purple-500/30 animate-spin-slow flex items-center justify-center">
          <div class="w-[500px] h-[500px] rounded-full border border-dashed border-pink-500/40 animate-spin-reverse" />
        </div>
      </div>

      <div class="relative z-20 w-full max-w-md my-auto flex flex-col items-center">
        {/* Institutional & Event Branding */}
        <header className="w-full flex flex-col items-center mb-6 text-center">
          <img
            src="/logo.png"
            alt="Saveetha Autonomous Engineering College Logo"
            className="h-12 sm:h-14 w-auto object-contain mb-2 filter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]"
          />

          <img src="/dres.png" alt="DRESTEIN '26 Logo" class="h-16 md:h-20 object-contain my-3 filter drop-shadow-[0_0_20px_rgba(168,85,247,0.7)]" />

          <h1 class="font-orbitron font-black text-2xl md:text-3xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-pink-400">
            MEGATHON '26
          </h1>
          <span class="font-mono text-xs text-pink-400 tracking-[0.3em] font-bold uppercase mt-1">
            ADMIN GATEWAY ACCESS
          </span>
        </header>

        {/* LOGIN CARD */}
        <div class="w-full poster-glass rounded-2xl p-6 md:p-8 relative border border-purple-500/40 shadow-[0_0_40px_rgba(168,85,247,0.25)]">
          <div class="tech-corner-tl"></div><div class="tech-corner-tr"></div>
          <div class="tech-corner-bl"></div><div class="tech-corner-br"></div>

          <div class="flex items-center space-x-3 border-b border-purple-500/20 pb-4 mb-6">
            <div class="w-3 h-3 rounded-full bg-pink-500 animate-pulse"></div>
            <div>
              <h2 class="font-orbitron font-bold text-base text-white tracking-wider">ADMIN AUTHENTICATION</h2>
              <p class="font-mono text-[11px] text-purple-300/80">AUTHENTICATE TO ACCESS SYNCED TIMER</p>
            </div>
          </div>

          {errorMsg && (
            <div class="mb-5 p-3 rounded-xl bg-pink-950/80 border border-pink-500 text-pink-300 font-mono text-xs font-bold flex items-center space-x-2 animate-bounce">
              <svg class="w-4 h-4 text-pink-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} class="space-y-5">
            <div>
              <label class="block font-mono text-xs text-purple-300 mb-2 font-bold tracking-wider">ADMIN ID / USERNAME</label>
              <div class="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter admin ID"
                  required
                  class="w-full bg-slate-950/90 border border-purple-500/50 rounded-xl px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-500/40 shadow-inner tracking-wider"
                />
                <span class="absolute right-3 top-3 text-purple-400">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
              </div>
            </div>

            <div>
              <label class="block font-mono text-xs text-purple-300 mb-2 font-bold tracking-wider">SECURITY PASSWORD</label>
              <div class="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  class="w-full bg-slate-950/90 border border-purple-500/50 rounded-xl px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-500/40 shadow-inner tracking-wider pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  class="absolute right-3 top-3 text-purple-400 hover:text-pink-300 transition-colors cursor-pointer"
                >
                  {showPassword ? (
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.03 10.03 0 013.682-.821c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m-4.686-3.23a3 3 0 00-3.328-3.328" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              class="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-orbitron font-bold text-sm tracking-[0.2em] rounded-xl border border-purple-400/50 transition-all duration-300 shadow-[0_0_25px_rgba(236,72,153,0.4)] cursor-pointer active:scale-95 flex items-center justify-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <span class="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                  <span>VERIFYING CREDENTIALS...</span>
                </>
              ) : (
                <>
                  <svg class="w-5 h-5 text-pink-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  <span>LOGIN TO MEGATHON ADMIN</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Fill Helper */}
          <div class="mt-6 pt-4 border-t border-purple-500/20 text-center">
            <button
              type="button"
              onClick={handleQuickFill}
              class="font-mono text-xs text-purple-300 hover:text-pink-300 underline cursor-pointer transition-colors"
            >
              Auto-fill Default Admin Credentials ({DEFAULT_ADMIN_USER} / {DEFAULT_ADMIN_PASS})
            </button>
          </div>
        </div>

        <p class="font-mono text-[11px] text-purple-300/60 mt-4 text-center">
          * MULTI-DEVICE SYNC: Log in with this Admin ID on multiple laptops to sync live timers synchronously.
        </p>
      </div>
    </div>
  );
}
