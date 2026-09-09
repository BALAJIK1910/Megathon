import React from 'react';

export default function LaunchSequence({ isActive, count, progress = 1 }) {
  if (!isActive) return null;

  const isGo = count === 'GO' || count === 0;
  // Circular gauge math for r=110 (perimeter = 2 * PI * 110 ≈ 691.15)
  const radius = 110;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - Math.max(0, Math.min(1, progress)));

  return (
    <div className="relative w-full max-w-lg my-6 flex flex-col items-center justify-center select-none animate-fadeIn">
      {/* Outer Pulse Glow Aura */}
      <div className={`absolute -inset-4 rounded-full blur-3xl opacity-60 pointer-events-none transition-all duration-300 ${
        isGo ? 'bg-emerald-500 animate-pulse' : 'bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 animate-pulse'
      }`} />

      {/* Cyber Circular Progress HUD */}
      <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 260 260">
          {/* Background Track */}
          <circle
            cx="130"
            cy="130"
            r={radius}
            stroke="rgba(168, 85, 247, 0.2)"
            strokeWidth="8"
            fill="transparent"
          />
          {/* Outer Dashed Orbit Ring */}
          <circle
            cx="130"
            cy="130"
            r={radius + 12}
            stroke="rgba(236, 72, 153, 0.3)"
            strokeWidth="1.5"
            strokeDasharray="6 6"
            fill="transparent"
            className="animate-spin-slow"
          />
          {/* Active Depleting Progress Ring */}
          <circle
            cx="130"
            cy="130"
            r={radius}
            stroke={isGo ? '#34d399' : '#ec4899'}
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }}
            filter="drop-shadow(0 0 12px rgba(236, 72, 153, 0.8))"
          />
        </svg>

        {/* Center Countdown Number */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-mono text-[10px] sm:text-xs text-purple-300 tracking-[0.3em] uppercase mb-1 font-bold">
            {isGo ? 'SYSTEM LAUNCHED' : 'T-MINUS'}
          </span>

          <span
            key={count}
            className={`font-orbitron font-black tracking-wider leading-none transition-transform animate-scaleIn ${
              isGo
                ? 'text-5xl sm:text-6xl text-emerald-300 drop-shadow-[0_0_35px_rgba(52,211,153,0.9)]'
                : 'text-7xl sm:text-8xl text-transparent bg-clip-text bg-gradient-to-b from-white via-pink-200 to-purple-400 drop-shadow-[0_0_40px_rgba(236,72,153,0.9)]'
            }`}
          >
            {count}
          </span>

          <span className="font-mono text-[10px] sm:text-xs text-pink-300/80 tracking-widest uppercase mt-2 font-semibold">
            {isGo ? 'ALL SYSTEMS ACTIVE' : 'SECONDS TO LAUNCH'}
          </span>
        </div>
      </div>

      {/* Futuristic Status Bar Below Gauge */}
      <div className="mt-4 px-4 py-1.5 rounded-full poster-glass border border-purple-500/40 text-xs font-mono flex items-center space-x-2">
        <span className={`w-2 h-2 rounded-full ${isGo ? 'bg-emerald-400 animate-ping' : 'bg-pink-400 animate-pulse'}`} />
        <span className="text-purple-200 font-bold tracking-widest uppercase">
          {isGo ? 'HACKATHON IS NOW LIVE!' : 'ARENA LAUNCH COUNTDOWN IN PROGRESS'}
        </span>
      </div>
    </div>
  );
}
