import React, { useEffect, useRef } from 'react';

export default function LaunchSequence({ bombStage, fuseBurnProgress, seqNumber }) {
  const canvasRef = useRef(null);
  const fuseSparksRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    const renderBomb = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (bombStage === 0) return;

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2 + 10;
      const radius = 45;

      const shadowGrad = ctx.createRadialGradient(centerX, centerY + 50, 5, centerX, centerY + 50, 60);
      shadowGrad.addColorStop(0, 'rgba(236, 72, 153, 0.4)');
      shadowGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = shadowGrad;
      ctx.fillRect(centerX - 60, centerY + 20, 120, 40);

      const bombGrad = ctx.createRadialGradient(
        centerX - 15, centerY - 15, 5,
        centerX, centerY, radius
      );
      bombGrad.addColorStop(0, '#4c1d95');
      bombGrad.addColorStop(0.4, '#2e1065');
      bombGrad.addColorStop(0.8, '#1e1b4b');
      bombGrad.addColorStop(1, '#0c051d');

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = bombGrad;
      ctx.shadowBlur = 25;
      ctx.shadowColor = bombStage >= 1 ? '#ec4899' : 'rgba(0,0,0,0.8)';
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, Math.PI * 0.7, Math.PI * 1.3);
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.6)';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = '#6b21a8';
      ctx.fillRect(centerX - 10, centerY - radius - 6, 20, 8);
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 1;
      ctx.strokeRect(centerX - 10, centerY - radius - 6, 20, 8);

      const capX = centerX;
      const capY = centerY - radius - 6;
      const fuseMaxLen = 45;
      const fuseCurrentLen = fuseMaxLen * (1 - fuseBurnProgress);
      const tipX = capX + Math.sin(fuseBurnProgress * 2) * 20 + 20;
      const tipY = capY - fuseCurrentLen;

      ctx.beginPath();
      ctx.moveTo(capX, capY);
      ctx.quadraticCurveTo(capX + 15, capY - 20, tipX, tipY);
      ctx.strokeStyle = '#9a3412';
      ctx.lineWidth = 4;
      ctx.stroke();

      if (fuseBurnProgress < 1.0) {
        const sparkGrad = ctx.createRadialGradient(tipX, tipY, 1, tipX, tipY, 15);
        sparkGrad.addColorStop(0, '#ffffff');
        sparkGrad.addColorStop(0.3, '#ec4899');
        sparkGrad.addColorStop(0.7, '#a855f7');
        sparkGrad.addColorStop(1, 'transparent');

        ctx.fillStyle = sparkGrad;
        ctx.beginPath();
        ctx.arc(tipX, tipY, 16, 0, Math.PI * 2);
        ctx.fill();

        if (Math.random() < 0.7) {
          fuseSparksRef.current.push({
            x: tipX,
            y: tipY,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4 - 1,
            life: 1.0,
            color: Math.random() > 0.4 ? '#ec4899' : '#a855f7'
          });
        }
      }

      for (let i = fuseSparksRef.current.length - 1; i >= 0; i--) {
        const s = fuseSparksRef.current[i];
        s.x += s.vx;
        s.y += s.vy;
        s.life -= 0.05;
        if (s.life <= 0) { fuseSparksRef.current.splice(i, 1); continue; }

        ctx.beginPath();
        ctx.arc(s.x, s.y, Math.random() * 2 + 1, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.globalAlpha = s.life;
        ctx.shadowBlur = 6;
        ctx.shadowColor = s.color;
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;
      }

      animId = requestAnimationFrame(renderBomb);
    };

    renderBomb();

    return () => cancelAnimationFrame(animId);
  }, [bombStage, fuseBurnProgress]);

  if (bombStage === 0) return null;

  return (
    <div class="relative w-full max-w-lg h-72 flex flex-col items-center justify-center my-4">
      <canvas ref={canvasRef} width="400" height="300" class="absolute inset-0 mx-auto z-10 pointer-events-none" />
      <div class="relative z-20 flex items-center justify-center mt-28">
        <span class="font-orbitron font-black text-7xl md:text-8xl text-transparent bg-clip-text bg-gradient-to-b from-pink-200 to-purple-500 drop-shadow-[0_0_40px_rgba(236,72,153,0.9)] animate-pulse">
          {seqNumber}
        </span>
      </div>
    </div>
  );
}
