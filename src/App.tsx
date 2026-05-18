import { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { PointerLockControls, Sky, Stars, Environment } from '@react-three/drei';
import { io, Socket } from 'socket.io-client';
import { GameState, ServerToClientEvents, ClientToServerEvents } from './types.ts';
import Arena from './components/Arena.tsx';
import PlayerControls from './components/PlayerControls.tsx';
import RemotePlayer from './components/RemotePlayer.tsx';
import HUD from './components/HUD.tsx';
import BotRenderer from './components/BotRenderer.tsx';
import ProjectileRenderer from './components/ProjectileRenderer.tsx';
import { audioSynth } from './utils/audio.ts';

const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io();

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const [selectedArena, setSelectedArena] = useState<'space' | 'desert'>('space');
  const [arenaType, setArenaType] = useState<'space' | 'desert'>('space');

  const me = gameState?.players[myId || ''];
  const isDead = me && me.health <= 0;

  useEffect(() => {
    socket.on('game:init', (state, id, arena) => {
      setGameState(state);
      setMyId(id);
      setArenaType(arena as 'space' | 'desert');
    });

    socket.on('game:update', (state) => {
      setGameState(state);
    });

    return () => {
      socket.off('game:init');
      socket.off('game:update');
      audioSynth.stopBackgroundMusic();
    };
  }, []);

  // Spatial Combat Feedback Sounds (Hitmarker and Kills)
  useEffect(() => {
    const handlePlayerHit = (data: { victimId: string; attackerId: string; damage: number; health: number }) => {
      if (data.attackerId === myId) {
        audioSynth.playHitMarkerSound();
      }
    };

    const handlePlayerKilled = (data: { victimId: string; attackerId: string }) => {
      if (data.attackerId === myId) {
        // Double-tap bip for kills!
        audioSynth.playHitMarkerSound();
        setTimeout(() => audioSynth.playHitMarkerSound(), 60);
      }
    };

    socket.on('player:hit', handlePlayerHit);
    socket.on('player:killed', handlePlayerKilled);

    return () => {
      socket.off('player:hit', handlePlayerHit);
      socket.off('player:killed', handlePlayerKilled);
    };
  }, [myId]);

  // Listen to pointer lock changes to trigger Pause Menu
  useEffect(() => {
    const handlePointerLockChange = () => {
      if (!document.pointerLockElement && isJoined) {
        if (gameState && myId) {
          const currentMe = gameState.players[myId];
          if (currentMe && currentMe.health > 0) {
            setIsPaused(true);
            return;
          }
        }
      }
      setIsPaused(false);
    };

    document.addEventListener('pointerlockchange', handlePointerLockChange);
    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
    };
  }, [isJoined, gameState, myId]);

  // Unlock cursor and close pause menu automatically on death
  useEffect(() => {
    if (isJoined && isDead) {
      if (document.pointerLockElement) {
        document.exitPointerLock?.();
      }
      setIsPaused(false);
    }
  }, [isJoined, isDead]);

  // Smooth local countdown for resurrection HUD
  useEffect(() => {
    if (!isDead || !me?.deathTime) {
      setTimeLeft(10);
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Date.now() - me.deathTime!;
      const remaining = Math.max(0, 10000 - elapsed) / 1000;
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 30); // ~33 FPS tracking

    return () => clearInterval(interval);
  }, [isDead, me?.deathTime]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return;
    socket.emit('player:join', playerName, selectedArena);
    setIsJoined(true);
    audioSynth.startBackgroundMusic(selectedArena);
  };

  if (!isJoined) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-white font-sans relative overflow-hidden">
        {/* Subtle grid backdrop for lobby */}
        <div className="absolute inset-0 opacity-5 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        
        <div className="p-8 bg-slate-900/60 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-800 w-full max-w-lg z-10">
          <h1 className="text-4xl font-extrabold mb-2 text-center tracking-tighter bg-gradient-to-r from-cyan-400 to-amber-500 bg-clip-text text-transparent uppercase">
            Nova Frontier
          </h1>
          <p className="text-[10px] text-center text-slate-500 tracking-[0.2em] uppercase mb-8 font-mono">Tactical Sector Combat Simulation</p>
          
          <form onSubmit={handleJoin} className="space-y-6">
            <div className="space-y-1">
              <label className="block text-[10px] font-mono tracking-widest text-slate-400 uppercase">Pilot Callsign</label>
              <input
                id="player-name"
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter callsign..."
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-cyan-500/80 rounded-lg outline-none transition-all text-white font-mono text-sm tracking-wide"
                autoFocus
                autoComplete="off"
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-[10px] font-mono tracking-widest text-slate-400 uppercase">Select Combat Sector</label>
              <div className="grid grid-cols-2 gap-4">
                {/* Space Arena Button */}
                <button
                  type="button"
                  onClick={() => setSelectedArena('space')}
                  className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between h-28 cursor-pointer outline-none ${
                    selectedArena === 'space'
                      ? 'border-cyan-500 bg-cyan-950/20 shadow-lg shadow-cyan-500/10'
                      : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                  }`}
                >
                  <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/5 rounded-full blur-xl pointer-events-none"></div>
                  <div className="text-xs font-mono font-bold tracking-wider text-cyan-400 uppercase">Neon Void</div>
                  <div className="text-[9px] text-slate-500 font-mono leading-relaxed mt-2 uppercase">Space simulation, dark neon styling, floating platforms.</div>
                  <div className={`w-2 h-2 rounded-full absolute top-3.5 right-3.5 ${
                    selectedArena === 'space' ? 'bg-cyan-500 shadow-[0_0_8px_#06b6d4]' : 'bg-slate-800'
                  }`}></div>
                </button>

                {/* Desert Arena Button */}
                <button
                  type="button"
                  onClick={() => setSelectedArena('desert')}
                  className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between h-28 cursor-pointer outline-none ${
                    selectedArena === 'desert'
                      ? 'border-orange-500 bg-orange-950/20 shadow-lg shadow-orange-500/10'
                      : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                  }`}
                >
                  <div className="absolute top-0 right-0 w-16 h-16 bg-orange-500/5 rounded-full blur-xl pointer-events-none"></div>
                  <div className="text-xs font-mono font-bold tracking-wider text-orange-400 uppercase">Sandstorm Wastes</div>
                  <div className="text-[9px] text-slate-500 font-mono leading-relaxed mt-2 uppercase">Sunset lighting, clay terracotta fog, sandstone obelisks.</div>
                  <div className={`w-2 h-2 rounded-full absolute top-3.5 right-3.5 ${
                    selectedArena === 'desert' ? 'bg-orange-500 shadow-[0_0_8px_#ea580c]' : 'bg-slate-800'
                  }`}></div>
                </button>
              </div>
            </div>

            <button
              id="join-btn"
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-slate-950 font-extrabold rounded-lg transition-all shadow-lg shadow-cyan-900/10 uppercase tracking-widest text-xs cursor-pointer border-0 active:scale-[0.99]"
            >
              Initialize Combat Connection
            </button>
          </form>
          
          <div className="mt-6 flex justify-center gap-4 grayscale opacity-40 font-mono text-[9px]">
             <div className="uppercase border border-slate-800 px-2 py-0.5">Sector_Active</div>
             <div className="uppercase border border-slate-800 px-2 py-0.5">Neural_Links_Stable</div>
          </div>

          <div className="mt-6 flex justify-center gap-4 grayscale opacity-40 font-mono text-[9px]">
             <div className="uppercase border border-slate-800 px-2 py-0.5">Created by: Timothy Bibat</div>
          </div>
        </div>
      </div>
    );
  }

  if (!gameState || !myId) return <div className="h-screen flex items-center justify-center bg-slate-950 text-cyan-500 animate-pulse font-mono tracking-widest text-xs">ESTABLISHING NEURAL LINK...</div>;

  return (
    <div className="h-screen w-screen bg-black overflow-hidden relative">
      <Canvas shadows camera={{ fov: 75, position: [0, 1.6, 5] }}>
        {arenaType === 'desert' ? (
          <>
            <Sky sunPosition={[100, 20, 100]} inclination={0.6} azimuth={0.25} mieCoefficient={0.005} rayleigh={2} />
            <fog attach="fog" args={["#7c2d12", 15, 75]} />
            <ambientLight intensity={0.6} color="#ffe4e6" />
            <pointLight position={[10, 15, 10]} intensity={2.5} color="#f59e0b" castShadow />
          </>
        ) : (
          <>
            <Sky sunPosition={[100, 10, 100]} />
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
            <ambientLight intensity={0.4} />
            <pointLight position={[10, 15, 10]} intensity={1.5} castShadow />
          </>
        )}
        <Environment preset="city" />
        
        <Arena type={arenaType} />
        
        {/* Local Player POV */}
        <PlayerControls socket={socket} myId={myId} initialPos={me.position} health={me.health} />

        {/* Remote Players */}
        {Object.values(gameState.players).map((player) => (
          player.id !== myId && (
            <RemotePlayer key={player.id} player={player} />
          )
        ))}

        {/* Enemies (Bots) */}
        <BotRenderer bots={gameState.bots} />

        {/* Projectiles */}
        <ProjectileRenderer projectiles={gameState.projectiles} />

        <PointerLockControls />
      </Canvas>

      <HUD me={me} players={Object.values(gameState.players)} />

      {/* HUD Extra Overlay */}
      <div className="absolute top-4 left-4 flex flex-col gap-1 text-[9px] font-mono text-cyan-500/50 uppercase pointer-events-none">
        <div>System: Delta_0.19</div>
        <div>Uptime: {Math.floor(performance.now() / 1000)}s</div>
        <div>Sector: {arenaType === 'desert' ? 'SANDSTORM WASTES' : 'NEON VOID'}</div>
        <div>Bots Alive: {gameState.bots.length}</div>
      </div>

      {/* Pause Menu Overlay */}
      {isPaused && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-md z-50 animate-fade-in">
          <div className="p-8 bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl shadow-amber-500/5 max-w-md w-full font-mono text-white relative overflow-hidden">
            {/* Ambient amber tech background indicator */}
            <div className="absolute -top-12 -left-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl"></div>
            
            <h2 className="text-2xl font-bold tracking-widest text-center text-amber-500 uppercase border-b border-slate-800 pb-4 mb-6 flex items-center justify-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
              COMBAT SIMULATION PAUSED
            </h2>
            
            <div className="space-y-4 mb-8 text-xs text-slate-400">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span>PILOT CALLSIGN:</span>
                <span className="text-cyan-400 font-bold">{me?.name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span>SIMULATION SECTOR:</span>
                <span className="text-white font-bold uppercase">{arenaType}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span>SECTOR SCORE:</span>
                <span className="text-white font-bold">{me?.score}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span>CURRENT WEAPON:</span>
                <span className="text-white uppercase font-bold">{me?.currentWeapon}</span>
              </div>
              <div className="flex justify-between">
                <span>ACTIVE HOSTILES:</span>
                <span className="text-red-500 font-bold">{gameState.bots.length} BOTS</span>
              </div>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-[10px] text-slate-500 leading-relaxed uppercase tracking-wider mb-6">
              <div className="text-slate-300 font-bold mb-1 border-b border-slate-900 pb-1">OPERATIONS MANUAL:</div>
              <div>[WASD] Engage propulsion</div>
              <div>[MOUSE_1] Deploy active weapon</div>
              <div>[1-3] Cycle armaments</div>
              <div>[ESC] Release neural connection</div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  const canvas = document.querySelector('canvas');
                  canvas?.requestPointerLock();
                }}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-all uppercase tracking-wider pointer-events-auto shadow-lg shadow-amber-500/20 active:scale-98 cursor-pointer border-0"
              >
                Resume Combat Link
              </button>
              <button
                onClick={() => {
                  setIsJoined(false);
                  setIsPaused(false);
                  audioSynth.stopBackgroundMusic();
                }}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg transition-all uppercase text-xs tracking-wider pointer-events-auto active:scale-98 cursor-pointer border-0"
              >
                Deauthorise Pilot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Glitched Resurrection Overlay */}
      {isDead && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-950/60 backdrop-blur-[3px] z-50">
          <div className="p-8 bg-slate-950 border border-red-500/50 rounded-2xl shadow-2xl shadow-red-500/10 max-w-md w-full font-mono text-white relative overflow-hidden animate-fade-in">
            {/* Tech grid aesthetic backing */}
            <div className="absolute inset-0 opacity-5 bg-[linear-gradient(rgba(239,68,68,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(239,68,68,0.1)_1px,transparent_1px)] bg-[size:16px_16px]"></div>
            
            <h2 className="text-3xl font-extrabold tracking-widest text-center text-red-500 uppercase border-b border-red-900/30 pb-4 mb-6 flex flex-col items-center justify-center gap-1">
              <span className="text-[10px] tracking-[0.3em] text-red-400 font-bold animate-pulse mb-1">!!! SYSTEM EXTRUSION !!!</span>
              NEURAL LINK SEVERED
            </h2>
            
            <div className="text-center mb-8">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">RE-ESTABLISHING COGNITIVE UPLINK</div>
              <div className="text-5xl font-bold font-mono text-cyan-400 tracking-tighter tabular-nums drop-shadow-[0_0_10px_rgba(6,182,212,0.3)] animate-pulse">
                {timeLeft.toFixed(2)}s
              </div>
            </div>

            {/* Sci-fi segmented progress bar */}
            <div className="w-full bg-slate-900 border border-slate-800 h-4 p-0.5 rounded-sm mb-8 overflow-hidden flex gap-0.5">
              {Array.from({ length: 20 }).map((_, idx) => {
                const percentDone = ((10 - timeLeft) / 10) * 100;
                const barPercent = (idx / 20) * 100;
                const active = percentDone >= barPercent;
                return (
                  <div
                    key={idx}
                    className={`h-full flex-1 transition-colors duration-200 ${
                      active ? 'bg-cyan-500 shadow-[0_0_4px_#06b6d4]' : 'bg-slate-950'
                    }`}
                  ></div>
                );
              })}
            </div>

            <div className="p-4 bg-slate-900/50 border border-red-900/20 rounded-lg text-center text-xs text-slate-400 mb-6">
              <span className="text-red-400 font-semibold uppercase">DAMAGE REPORT:</span> Lethal kinetic payload registered. Relocating pilot unit to sector safe-zone.
            </div>
            
            <div className="text-[9px] text-slate-600 text-center uppercase tracking-widest animate-pulse">
              neural core calibrating... please hold connection
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
