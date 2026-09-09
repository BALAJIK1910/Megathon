import React from 'react';

export default function Header({ onOpenEdit }) {
  return (
    <header class="w-full flex flex-col md:flex-row items-center justify-between border-b border-purple-500/30 pb-4 gap-4">
      {/* Institutional Branding */}
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

      {/* DRESTEIN '26 LOGO & EDIT TIME BUTTON */}
      <div class="flex items-center space-x-4">
        <img src="/dres.jpeg" alt="Drestein Logo" class="h-14 md:h-16 object-contain filter drop-shadow-[0_0_15px_rgba(168,85,247,0.6)]" />
        
        {/* EDIT TIME BUTTON */}
        <button 
          onClick={onOpenEdit}
          title="Configure Countdown Time" 
          class="poster-glass px-4 py-2 rounded-xl text-xs font-mono flex items-center space-x-2 text-pink-300 hover:text-white border border-purple-400/50 hover:border-pink-400 transition-all cursor-pointer shadow-[0_0_15px_rgba(168,85,247,0.3)]"
        >
          <svg class="w-4 h-4 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span class="font-bold">EDIT TIME</span>
        </button>
      </div>
    </header>
  );
}
