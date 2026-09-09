import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { subscribeToSyncStatus } from '../utils/storage';

export default function Header({ showAdminControls = false, onOpenEdit }) {
  const { logout, adminUser } = useAuth();
  const navigate = useNavigate();
  const [syncStatus, setSyncStatus] = useState({
    isConnected: false,
    peerCount: 1,
    method: 'Local Storage'
  });

  useEffect(() => {
    if (!showAdminControls) return;
    const unsubscribe = subscribeToSyncStatus((status) => {
      setSyncStatus(status);
    });
    return () => unsubscribe();
  }, [showAdminControls]);

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out from this laptop?')) {
      logout();
      navigate('/login');
    }
  };

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

      {/* DRESTEIN '26 Logo & Admin Controls (Shown ONLY on /edittime page) */}
      <div class="flex flex-wrap items-center justify-center md:justify-end gap-3">
        {showAdminControls && (
          <>
            {/* Realtime Sync Status Badge */}
            <div class="poster-glass px-3 py-1.5 rounded-xl border border-purple-500/40 flex items-center space-x-2 text-xs font-mono">
              <span class={`w-2 h-2 rounded-full ${syncStatus.isConnected ? 'bg-green-400 animate-pulse' : 'bg-amber-400'}`}></span>
              <span class="text-purple-200 font-bold">
                {syncStatus.isConnected ? `SYNCED (${syncStatus.peerCount} LAPTOPS)` : 'LOCAL SYNC'}
              </span>
            </div>

            {onOpenEdit && (
              <button
                onClick={onOpenEdit}
                title="Configure Countdown Time"
                class="poster-glass px-3 py-2 rounded-xl text-xs font-mono flex items-center space-x-2 text-pink-300 hover:text-white border border-purple-400/50 hover:border-pink-400 transition-all cursor-pointer shadow-[0_0_15px_rgba(168,85,247,0.3)]"
              >
                <svg class="w-4 h-4 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span class="font-bold">EDIT TIME</span>
              </button>
            )}
          </>
        )}

        <img src="/dres.png" alt="Drestein Logo" class="h-10 md:h-14 object-contain filter drop-shadow-[0_0_15px_rgba(168,85,247,0.6)]" />

        {showAdminControls && (
          <div class="flex items-center space-x-2 pl-2 border-l border-purple-500/30">
            <span class="font-mono text-xs text-purple-300 hidden lg:inline font-semibold">
              ID: <span class="text-white font-bold">{adminUser || 'ADMIN'}</span>
            </span>

            <button
              onClick={handleLogout}
              title="Logout from Admin Account"
              class="poster-glass px-3 py-2 rounded-xl text-xs font-mono flex items-center space-x-1 text-pink-400 hover:text-white hover:bg-pink-600/30 border border-pink-500/40 hover:border-pink-400 transition-all cursor-pointer"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span class="font-bold">LOGOUT</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
