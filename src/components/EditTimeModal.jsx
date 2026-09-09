import React, { useState, useEffect } from 'react';
import { audio } from '../utils/audio';

export default function EditTimeModal({ isOpen, onClose, onApply, currentSec }) {
  const [hours, setHours] = useState(24);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (isOpen) {
      const h = Math.floor(currentSec / 3600);
      const m = Math.floor((currentSec % 3600) / 60);
      const s = currentSec % 60;
      setHours(h);
      setMinutes(m);
      setSeconds(s);
    }
  }, [isOpen, currentSec]);

  if (!isOpen) return null;

  const handlePreset = (h, m, s) => {
    audio.playClick();
    setHours(h);
    setMinutes(m);
    setSeconds(s);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    audio.playClick();
    let total = (parseInt(hours, 10) || 0) * 3600 + (parseInt(minutes, 10) || 0) * 60 + (parseInt(seconds, 10) || 0);
    if (total <= 0) total = 1;
    onApply(total);
    onClose();
  };

  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md transition-all duration-300">
      <div class="relative w-full max-w-md mx-4 p-6 poster-glass rounded-2xl border border-pink-500/40 shadow-[0_0_50px_rgba(236,72,153,0.3)]">
        <div class="tech-corner-tl"></div><div class="tech-corner-tr"></div>
        <div class="tech-corner-bl"></div><div class="tech-corner-br"></div>
        
        {/* Header */}
        <div class="flex items-center justify-between border-b border-purple-500/20 pb-4 mb-6">
          <div class="flex items-center space-x-2">
            <div class="w-2.5 h-2.5 bg-pink-400 rounded-full animate-pulse"></div>
            <h3 class="font-orbitron font-bold text-lg text-pink-300 tracking-wider">TIMER CONFIGURATION</h3>
          </div>
          <button onClick={onClose} class="text-gray-400 hover:text-pink-400 transition-colors cursor-pointer text-xl font-mono">&times;</button>
        </div>

        {/* Presets */}
        <div class="mb-6">
          <label class="block font-mono text-xs text-purple-300 mb-2 uppercase tracking-wider font-bold">QUICK PRESETS</label>
          <div class="grid grid-cols-4 gap-2">
            <button type="button" onClick={() => handlePreset(24, 0, 0)} class="poster-glass py-2 text-xs font-mono text-purple-200 hover:bg-purple-600/30 hover:border-pink-400 rounded-lg transition-all cursor-pointer">24H</button>
            <button type="button" onClick={() => handlePreset(12, 0, 0)} class="poster-glass py-2 text-xs font-mono text-purple-200 hover:bg-purple-600/30 hover:border-pink-400 rounded-lg transition-all cursor-pointer">12H</button>
            <button type="button" onClick={() => handlePreset(1, 0, 0)} class="poster-glass py-2 text-xs font-mono text-purple-200 hover:bg-purple-600/30 hover:border-pink-400 rounded-lg transition-all cursor-pointer">1H</button>
            <button type="button" onClick={() => handlePreset(0, 0, 10)} class="poster-glass py-2 text-xs font-mono text-pink-400 hover:bg-pink-600/30 hover:border-pink-400 rounded-lg transition-all cursor-pointer">10S TEST</button>
          </div>
        </div>

        {/* Inputs Form */}
        <form onSubmit={handleSubmit} class="space-y-4">
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block font-mono text-[11px] text-purple-300 mb-1 font-bold">HOURS</label>
              <input 
                type="number" 
                min="0" 
                max="999" 
                value={hours} 
                onChange={(e) => setHours(e.target.value)}
                class="w-full bg-slate-950/90 border border-purple-500/40 rounded-xl px-3 py-2 text-center font-orbitron font-bold text-xl text-white focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400"
              />
            </div>
            <div>
              <label class="block font-mono text-[11px] text-purple-300 mb-1 font-bold">MINUTES</label>
              <input 
                type="number" 
                min="0" 
                max="59" 
                value={minutes} 
                onChange={(e) => setMinutes(e.target.value)}
                class="w-full bg-slate-950/90 border border-purple-500/40 rounded-xl px-3 py-2 text-center font-orbitron font-bold text-xl text-white focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400"
              />
            </div>
            <div>
              <label class="block font-mono text-[11px] text-purple-300 mb-1 font-bold">SECONDS</label>
              <input 
                type="number" 
                min="0" 
                max="59" 
                value={seconds} 
                onChange={(e) => setSeconds(e.target.value)}
                class="w-full bg-slate-950/90 border border-purple-500/40 rounded-xl px-3 py-2 text-center font-orbitron font-bold text-xl text-white focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400"
              />
            </div>
          </div>

          <p class="font-mono text-[11px] text-purple-300/70 text-center pt-1">
            * Updating while active recalculates target countdown seamlessly.
          </p>

          <div class="flex items-center justify-end space-x-3 pt-4 border-t border-purple-500/20">
            <button type="button" onClick={onClose} class="px-4 py-2 text-xs font-mono text-gray-400 hover:text-white transition-colors cursor-pointer">CANCEL</button>
            <button type="submit" class="px-5 py-2.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-orbitron font-bold text-xs rounded-xl tracking-wider transition-all shadow-[0_0_15px_rgba(236,72,153,0.4)] cursor-pointer">APPLY PROTOCOL</button>
          </div>
        </form>
      </div>
    </div>
  );
}
