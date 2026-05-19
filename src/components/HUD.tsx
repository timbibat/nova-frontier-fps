import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Player, WeaponType, Bot } from '../types.ts';
import { WEAPONS } from '../constants.ts';
import { getRadarCoordinates } from '../utils/wasmLoader.ts';

interface Props {
  me: Player;
  players: Player[];
  bots: Bot[];
  arenaType: 'space' | 'desert' | 'forest';
  roomCode?: string;
}

export default function HUD({ me, players, bots, arenaType, roomCode }: Props) {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const currentWeapon = WEAPONS[me.currentWeapon || WeaponType.PISTOL];

  // Refs to always read the latest props inside requestAnimationFrame
  const playersRef = useRef<Player[]>(players);
  const botsRef = useRef<Bot[]>(bots);

  // Sync refs when props change
  playersRef.current = players;
  botsRef.current = bots;

  const MAX_RANGE = 25; // Matching radar visual boundary limit

  const otherPlayers = players.filter((p) => p.id !== me.id && p.health > 0);
  const activeBots = bots ? bots.filter((b) => b.health > 0) : [];

  const interpolatedPositions = useRef<Record<string, [number, number]>>({});

  useEffect(() => {
    let active = true;

    // High-performance helper to position and style a single radar blip element
    const updateBlipElement = (
      id: string,
      tx: number,
      tz: number,
      entityId: string,
      mePos: number[],
      cosYaw: number,
      sinYaw: number
    ) => {
      const el = document.getElementById(id);
      if (!el) return;

      // Smoothly interpolate the 2D target position by 0.2 to match WebGL 3D models exactly
      let currentPos = interpolatedPositions.current[entityId];
      if (!currentPos) {
        currentPos = [tx, tz];
      } else {
        currentPos[0] += (tx - currentPos[0]) * 0.2;
        currentPos[1] += (tz - currentPos[1]) * 0.2;
      }
      interpolatedPositions.current[entityId] = currentPos;

      const coords = getRadarCoordinates(
        currentPos[0],
        currentPos[1],
        mePos[0],
        mePos[2],
        cosYaw,
        sinYaw,
        MAX_RANGE
      );

      el.style.left = `${coords.left}%`;
      el.style.top = `${coords.top}%`;
      el.style.display = 'block';

      const arrowContainer = el.querySelector('.radar-blip-arrow-container') as HTMLElement;
      const circleContainer = el.querySelector('.radar-blip-circle-container') as HTMLElement;

      if (coords.isClamped) {
        if (arrowContainer) arrowContainer.style.display = 'flex';
        if (circleContainer) circleContainer.style.display = 'none';
        const arrow = el.querySelector('.radar-blip-arrow') as HTMLElement;
        if (arrow) arrow.style.transform = `rotate(${coords.rotationDeg}deg)`;
      } else {
        if (arrowContainer) arrowContainer.style.display = 'none';
        if (circleContainer) circleContainer.style.display = 'flex';
      }
    };

    const updateRadar = () => {
      if (!active) return;
      const camera = (window as any).localCamera;
      if (camera) {
        const mePos = [camera.position.x, camera.position.y, camera.position.z];
        
        // Calculate robust camera forward vector on the horizontal plane
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        const yaw = Math.atan2(-dir.x, -dir.z);
        const cosYaw = Math.cos(yaw);
        const sinYaw = Math.sin(yaw);

        // Update player blips directly in the DOM for zero delay
        playersRef.current.forEach((player) => {
          const el = document.getElementById(`radar-blip-player-${player.id}`);
          if (player.id === me.id || player.health <= 0) {
            if (el) el.style.display = 'none';
            return;
          }
          updateBlipElement(
            `radar-blip-player-${player.id}`,
            player.position[0],
            player.position[2],
            player.id,
            mePos,
            cosYaw,
            sinYaw
          );
        });

        // Update bot blips directly in the DOM for zero delay
        botsRef.current.forEach((bot) => {
          const el = document.getElementById(`radar-blip-bot-${bot.id}`);
          if (bot.health <= 0) {
            if (el) el.style.display = 'none';
            return;
          }
          updateBlipElement(
            `radar-blip-bot-${bot.id}`,
            bot.position[0],
            bot.position[2],
            bot.id,
            mePos,
            cosYaw,
            sinYaw
          );
        });
      }
      requestAnimationFrame(updateRadar);
    };

    requestAnimationFrame(updateRadar);
    return () => {
      active = false;
    };
  }, [me.id]);

  return (
    <div className="absolute inset-0 pointer-events-none font-mono">
      {/* Crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center">
        <div className="absolute w-full h-[1px] bg-cyan-400 opacity-60"></div>
        <div className="absolute h-full w-[1px] bg-cyan-400 opacity-60"></div>
        <div className="w-1 h-1 bg-cyan-400 rounded-full"></div>
      </div>

      {/* Tactical Radar HUD Panel */}
      <div className="absolute top-6 left-6 flex items-start gap-4 pointer-events-none select-none">
        {/* Radar Circular Display */}
        <div className="relative w-36 h-36 rounded-full border border-cyan-500/40 bg-slate-950/85 backdrop-blur-md overflow-hidden flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.15)]">
          {/* Concentric Grid Rings */}
          <div className="absolute w-full h-full rounded-full border border-cyan-500/10 pointer-events-none"></div>
          <div className="absolute w-2/3 h-2/3 rounded-full border border-dashed border-cyan-500/15 pointer-events-none"></div>
          <div className="absolute w-1/3 h-1/3 rounded-full border border-dashed border-cyan-500/15 pointer-events-none"></div>
          
          {/* Axis Crosshairs */}
          <div className="absolute w-full h-[1px] border-t border-dashed border-cyan-500/10 pointer-events-none"></div>
          <div className="absolute h-full w-[1px] border-l border-dashed border-cyan-500/10 pointer-events-none"></div>

          {/* Radar Sweep Effect */}
          <div 
            className="absolute inset-0 rounded-full pointer-events-none origin-center animate-radar-sweep"
            style={{
              background: 'conic-gradient(from 0deg, transparent 50%, rgba(6,182,212,0.12) 100%)',
            }}
          />

          {/* Central Local Player Indicator */}
          <div className="absolute w-3 h-3 flex items-center justify-center pointer-events-none z-20">
            {/* Ping animation under the player icon */}
            <div className="absolute w-full h-full bg-cyan-400/25 rounded-full animate-ping pointer-events-none"></div>
            {/* Mini vector arrow pointing straight up (viewer POV is locked looking forward) */}
            <svg className="w-3 h-3 text-cyan-400 drop-shadow-[0_0_4px_#22d3ee]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 22h20L12 2z" />
            </svg>
          </div>

          {/* Player Target Blips Pool */}
          {otherPlayers.map((player) => (
            <div
              key={player.id}
              id={`radar-blip-player-${player.id}`}
              className="absolute pointer-events-none z-10"
              style={{
                transform: 'translate(-50%, -50%)'
              }}
            >
              {/* Out of range arrow */}
              <div className="w-3 h-3 flex items-center justify-center radar-blip-arrow-container">
                <svg 
                  className="w-2.5 h-2.5 text-amber-500 drop-shadow-[0_0_3px_rgba(245,158,11,0.8)] radar-blip-arrow"
                  viewBox="0 0 24 24" 
                  fill="currentColor"
                >
                  <path d="M12 2L2 22h20L12 2z" />
                </svg>
              </div>
              {/* In range circle */}
              <div className="relative flex items-center justify-center w-3 h-3 radar-blip-circle-container">
                <div className="w-2 h-2 rounded-full shadow-lg bg-amber-500 shadow-amber-500/50" />
              </div>
            </div>
          ))}

          {/* Bot Target Blips Pool */}
          {activeBots.map((bot) => (
            <div
              key={bot.id}
              id={`radar-blip-bot-${bot.id}`}
              className="absolute pointer-events-none z-10"
              style={{
                transform: 'translate(-50%, -50%)'
              }}
            >
              {/* Out of range arrow */}
              <div className="w-3 h-3 flex items-center justify-center radar-blip-arrow-container">
                <svg 
                  className="w-2.5 h-2.5 text-red-500 drop-shadow-[0_0_3px_rgba(239,68,68,0.8)] radar-blip-arrow"
                  viewBox="0 0 24 24" 
                  fill="currentColor"
                >
                  <path d="M12 2L2 22h20L12 2z" />
                </svg>
              </div>
              {/* In range circle */}
              <div className="relative flex items-center justify-center w-3 h-3 radar-blip-circle-container">
                <div className="absolute w-5 h-5 rounded-full border border-red-500/20 animate-ping opacity-60 pointer-events-none"></div>
                <div className="w-2 h-2 rounded-full shadow-lg bg-red-500 shadow-red-500/50 animate-pulse" />
              </div>
            </div>
          ))}
        </div>

        {/* HUD Tactical Info Box */}
        <div className="flex flex-col gap-1 text-[9px] font-mono text-cyan-400/80 uppercase bg-slate-950/80 border border-cyan-500/25 p-3 rounded-lg backdrop-blur-md shadow-[0_0_15px_rgba(6,182,212,0.1)]">
          <div className="text-[10px] font-bold text-cyan-400 tracking-wider border-b border-cyan-500/20 pb-1 mb-1 flex justify-between items-center gap-6">
            <span>TACTICAL RADAR</span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
          </div>
          <div>Sector: <span className="text-white font-bold">{arenaType === 'desert' ? 'SANDSTORM WASTES' : arenaType === 'forest' ? 'OVERGROWN RUINS' : 'NEON VOID'}</span></div>
          {roomCode && (
            <div className="text-amber-400 font-bold border border-amber-500/30 px-1.5 py-0.5 rounded bg-amber-500/5 mt-0.5 mb-0.5 text-center tracking-widest animate-pulse">
              Link Key: {roomCode}
            </div>
          )}
          <div>Active Hostiles: <span className="text-red-500 font-bold">{activeBots.length} BOTS</span></div>
          <div>Remote Pilots: <span className="text-amber-400 font-bold">{otherPlayers.length} UNITS</span></div>
          
          <div className="border-t border-cyan-500/10 mt-1.5 pt-1.5 text-[8px] text-cyan-500/60 space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full shadow-[0_0_4px_rgba(239,68,68,0.8)]"></span>
              <span>HOSTILE BOT</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full shadow-[0_0_4px_rgba(245,158,11,0.8)]"></span>
              <span>REMOTE PILOT</span>
            </div>
          </div>
        </div>
      </div>

      {/* Health Bar Wrapper */}
      <div className="absolute bottom-10 left-10 w-64 h-12 bg-slate-900/80 border border-slate-700/50 p-1 backdrop-blur-sm">
        <div className="relative w-full h-full bg-slate-950 overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 ${me.health > 30 ? 'bg-cyan-500' : 'bg-red-500'}`}
            style={{ width: `${me.health}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
          </div>
          <div className="absolute inset-0 flex items-center justify-between px-3 text-white font-bold tracking-widest text-sm">
            <span>HEALTH</span>
            <span>{me.health}</span>
          </div>
        </div>
      </div>

      {/* Weapon Selector Overlay */}
      <div className="absolute bottom-28 left-10 flex gap-2">
        {[WeaponType.PISTOL, WeaponType.RIFLE, WeaponType.BLADE].map((type, idx) => (
          <div 
            key={type}
            className={`px-3 py-1 text-[10px] border ${me.currentWeapon === type ? 'bg-cyan-500/20 border-cyan-500 text-white' : 'bg-slate-900/50 border-slate-700 text-slate-500'}`}
          >
            {idx + 1}. {WEAPONS[type].name}
          </div>
        ))}
      </div>

      {/* Scoreboard */}
      <div className="absolute top-6 right-6 w-56 bg-slate-900/80 border border-slate-700/50 p-4 backdrop-blur-sm">
        <h3 className="text-cyan-500 text-xs font-bold mb-3 tracking-widest uppercase border-b border-slate-700 pb-2">SCOREBOARD</h3>
        <div className="space-y-2">
          {sortedPlayers.slice(0, 5).map((player, idx) => (
            <div key={player.id} className={`flex justify-between items-center text-[11px] ${player.id === me.id ? 'text-cyan-400 font-bold' : 'text-slate-300'}`}>
              <div className="flex items-center gap-2">
                <span className="text-slate-600">0{idx + 1}</span>
                <span className="truncate max-w-[100px]">{player.name}</span>
              </div>
              <span>{player.score}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Player Stats Corner */}
      <div className="absolute bottom-6 right-10 text-right opacity-80">
        <div className="text-[10px] text-slate-500 uppercase tracking-widest">ACTIVE_WEAPON</div>
        <div className="text-white font-bold text-sm mb-2">{currentWeapon.name}</div>
        <div className="text-[10px] text-slate-500 uppercase tracking-widest">CALLSIGN</div>
        <div className="text-cyan-400 font-bold text-lg">{me.name}</div>
        <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">TOTAL_SCORE</div>
        <div className="text-white font-bold">{me.score}</div>
      </div>

      {/* Control Instructions */}
      <div className="absolute bottom-4 right-1/2 translate-x-1/2 text-white/30 text-[9px] uppercase tracking-widest font-bold">
        [1-3] SWITCH WEAPON | [CLICK] ATTACK | [WASD] MOVE
      </div>
    </div>
  );
}
