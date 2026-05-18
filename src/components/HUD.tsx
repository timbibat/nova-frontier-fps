import { Player, WeaponType } from '../types.ts';
import { WEAPONS } from '../constants.ts';

interface Props {
  me: Player;
  players: Player[];
}

export default function HUD({ me, players }: Props) {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const currentWeapon = WEAPONS[me.currentWeapon || WeaponType.PISTOL];

  return (
    <div className="absolute inset-0 pointer-events-none font-mono">
      {/* Crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center">
        <div className="absolute w-full h-[1px] bg-cyan-400 opacity-60"></div>
        <div className="absolute h-full w-[1px] bg-cyan-400 opacity-60"></div>
        <div className="w-1 h-1 bg-cyan-400 rounded-full"></div>
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
