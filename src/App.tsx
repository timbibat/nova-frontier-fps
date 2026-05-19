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

const generateRoomCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const [selectedArena, setSelectedArena] = useState<'space' | 'desert'>('space');
  const [arenaType, setArenaType] = useState<'space' | 'desert'>('space');

  // Online Private Room States
  const [matchMode, setMatchMode] = useState<'public' | 'room'>('public');
  const [roomAction, setRoomAction] = useState<'create' | 'join'>('create');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [roomError, setRoomError] = useState<string | null>(null);
  const [createdRoomCode, setCreatedRoomCode] = useState('');
  const [activeRoomCode, setActiveRoomCode] = useState<string | null>(null);

  const me = gameState?.players[myId || ''];
  const isDead = me && me.health <= 0;

  useEffect(() => {
    if (matchMode === 'room' && roomAction === 'create' && !createdRoomCode) {
      setCreatedRoomCode(generateRoomCode());
    }
  }, [matchMode, roomAction, createdRoomCode]);

  useEffect(() => {
    socket.on('game:init', (state, id, arena, roomCode) => {
      setGameState(state);
      setMyId(id);
      setArenaType(arena as 'space' | 'desert');
      setActiveRoomCode(roomCode || null);
      setIsJoined(true);
      setRoomError(null);
    });

    socket.on('game:update', (state) => {
      setGameState(state);
    });

    socket.on('room:error', (msg) => {
      setRoomError(msg);
      setIsJoined(false);
    });

    return () => {
      socket.off('game:init');
      socket.off('game:update');
      socket.off('room:error');
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

    if (matchMode === 'public') {
      socket.emit('player:join', playerName, selectedArena);
      setIsJoined(true);
      audioSynth.startBackgroundMusic(selectedArena);
    } else {
      if (roomAction === 'create') {
        socket.emit('player:join', playerName, selectedArena, createdRoomCode);
        setIsJoined(true);
        audioSynth.startBackgroundMusic(selectedArena);
      } else {
        if (!roomCodeInput.trim()) {
          setRoomError("Please enter a valid private sector key.");
          return;
        }
        socket.emit('player:join', playerName, '', roomCodeInput);
      }
    }
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
            {/* Pilot Callsign */}
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
                required
              />
            </div>

            {/* Neural Gateway tabs */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-mono tracking-widest text-slate-400 uppercase">Neural Gateway Mode</label>
              <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 border border-slate-800 rounded-lg">
                <button
                  type="button"
                  onClick={() => { setMatchMode('public'); setRoomError(null); }}
                  className={`py-2 rounded font-mono text-xs uppercase cursor-pointer border-0 font-bold transition-all ${
                    matchMode === 'public' 
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-bold' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Public Combat
                </button>
                <button
                  type="button"
                  onClick={() => { setMatchMode('room'); setRoomError(null); }}
                  className={`py-2 rounded font-mono text-xs uppercase cursor-pointer border-0 font-bold transition-all ${
                    matchMode === 'room' 
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Neural Link Code
                </button>
              </div>
            </div>

            {/* Error alerts */}
            {roomError && (
              <div className="p-3 bg-red-950/20 border border-red-500/40 rounded-lg text-[10px] font-mono text-red-400 uppercase tracking-wide leading-relaxed animate-pulse">
                💥 TERMINAL ERROR: {roomError}
              </div>
            )}

            {/* Public Setup */}
            {matchMode === 'public' && (
              <div className="space-y-2 animate-fade-in">
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
            )}

            {/* Room Private Setup */}
            {matchMode === 'room' && (
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-2 gap-2 border-b border-slate-800 pb-2">
                  <button
                    type="button"
                    onClick={() => { setRoomAction('create'); setRoomError(null); }}
                    className={`py-1.5 font-mono text-[10px] uppercase cursor-pointer border-0 font-bold transition-all ${
                      roomAction === 'create'
                        ? 'text-cyan-400 border-b-2 border-cyan-500 pb-1'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Create Link Code
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRoomAction('join'); setRoomError(null); }}
                    className={`py-1.5 font-mono text-[10px] uppercase cursor-pointer border-0 font-bold transition-all ${
                      roomAction === 'join'
                        ? 'text-cyan-400 border-b-2 border-cyan-500 pb-1'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Enter Link Code
                  </button>
                </div>

                {roomAction === 'create' && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="flex flex-col items-center justify-center p-4 bg-slate-950 border border-slate-800 rounded-lg text-center relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent"></div>
                      <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-1">Generated Private Neural Key</span>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-black font-mono tracking-widest text-cyan-400">{createdRoomCode}</span>
                        <button
                          type="button"
                          onClick={() => setCreatedRoomCode(generateRoomCode())}
                          className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[8px] font-mono rounded cursor-pointer uppercase text-slate-400 font-bold active:scale-95"
                        >
                          Regen
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[10px] font-mono tracking-widest text-slate-400 uppercase">Sector Architecture Style</label>
                      <div className="grid grid-cols-2 gap-4">
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
                  </div>
                )}

                {roomAction === 'join' && (
                  <div className="space-y-2 animate-fade-in">
                    <label className="block text-[10px] font-mono tracking-widest text-slate-400 uppercase">Enter Dynamic Sector Key</label>
                    <input
                      type="text"
                      maxLength={8}
                      value={roomCodeInput}
                      onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase().trim())}
                      placeholder="ENTER PRIVATE CODE (E.G. XJ98F)..."
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-amber-500/80 rounded-lg outline-none transition-all text-amber-400 font-mono text-center text-lg tracking-[0.3em] uppercase"
                      required
                    />
                  </div>
                )}
              </div>
            )}

            <button
              id="join-btn"
              type="submit"
              className={`w-full py-3.5 text-slate-950 font-extrabold rounded-lg transition-all shadow-lg uppercase tracking-widest text-xs cursor-pointer border-0 active:scale-[0.99] ${
                matchMode === 'public'
                  ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 shadow-cyan-900/10'
                  : roomAction === 'create'
                    ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 shadow-cyan-900/10'
                    : 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 shadow-amber-900/10'
              }`}
            >
              {matchMode === 'public'
                ? 'Initialize Combat Connection'
                : roomAction === 'create'
                  ? 'Establish Custom Private Sector'
                  : 'Synchronise Private Gateway'}
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

      <HUD 
        me={me} 
        players={Object.values(gameState.players)} 
        bots={gameState.bots}
        arenaType={arenaType}
        roomCode={activeRoomCode || undefined}
      />

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
              {activeRoomCode && (
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span>NEURAL LINK CODE:</span>
                  <span className="text-amber-400 font-bold">{activeRoomCode}</span>
                </div>
              )}
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
                  socket.emit('player:leave');
                  setIsJoined(false);
                  setIsPaused(false);
                  setGameState(null);
                  setMyId(null);
                  setActiveRoomCode(null);
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
