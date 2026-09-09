import React, { useEffect, useState } from 'react';

function DigitCard({ value, label, isSeconds = false }) {
  const [anim, setAnim] = useState(false);
  const formatted = String(value).padStart(2, '0');

  useEffect(() => {
    setAnim(true);
    const timer = setTimeout(() => setAnim(false), 300);
    return () => clearTimeout(timer);
  }, [formatted]);

  return (
    <div class="poster-glass rounded-2xl p-4 md:p-8 flex flex-col items-center justify-center relative group">
      <div class="tech-corner-tl"></div><div class="tech-corner-tr"></div>
      <div class="tech-corner-bl"></div><div class="tech-corner-br"></div>
      <div 
        class={`digit-card font-orbitron font-black text-4xl sm:text-6xl md:text-7xl lg:text-8xl ${
          isSeconds ? 'text-pink-400 text-glow-magenta' : 'text-purple-300 text-glow-purple'
        } ${anim ? 'digit-pop' : ''}`}
      >
        {formatted}
      </div>
      <span class="font-mono text-[10px] sm:text-xs md:text-sm text-pink-300/80 tracking-[0.25em] mt-2 sm:mt-4 font-bold">
        {label}
      </span>
    </div>
  );
}

export default function CountdownDisplay({ hours, minutes, seconds }) {
  return (
    <div class="relative w-full max-w-4xl my-4">
      <div class="absolute -top-3 left-1/2 transform -translate-x-1/2 font-mono text-[10px] md:text-xs text-purple-300 tracking-[0.3em] bg-[#0c051d] px-4 font-bold">
        24-HOURS INNOVATION JOURNEY
      </div>

      <div class="grid grid-cols-3 gap-3 sm:gap-6 md:gap-8 my-4">
        <DigitCard value={hours} label="HOURS" />
        <DigitCard value={minutes} label="MINUTES" />
        <DigitCard value={seconds} label="SECONDS" isSeconds />
      </div>

      <div class="mt-4 font-mono text-xs md:text-sm text-purple-300/90 tracking-[0.25em] uppercase font-bold text-center">
        WHERE IDEAS TURN INTO IMPACT
      </div>
    </div>
  );
}
