export enum WeaponType {
  PISTOL = 'PISTOL',
  RIFLE = 'RIFLE',
  BLADE = 'BLADE'
}

export interface Weapon {
  type: WeaponType;
  name: string;
  damage: number;
  fireRate: number; // ms between shots
  range: number;
  isMelee: boolean;
}

export interface Player {
  id: string;
  position: [number, number, number];
  rotation: [number, number, number];
  health: number;
  score: number;
  name: string;
  currentWeapon: WeaponType;
  deathTime?: number;
}

export interface Projectile {
  id: string;
  ownerId: string;
  position: [number, number, number];
  velocity: [number, number, number];
  timestamp: number;
  damage: number;
}

export interface Bot {
  id: string;
  position: [number, number, number];
  rotation: [number, number, number];
  health: number;
  name: string;
  targetId?: string;
}

export interface GameState {
  players: Record<string, Player>;
  projectiles: Projectile[];
  bots: Bot[];
}

export interface ServerToClientEvents {
  'game:init': (state: GameState, userId: string) => void;
  'game:update': (state: GameState) => void;
  'player:joined': (player: Player) => void;
  'player:left': (id: string) => void;
  'player:hit': (data: { victimId: string; attackerId: string; damage: number; health: number }) => void;
  'player:killed': (data: { victimId: string; attackerId: string }) => void;
  'player:respawn': (position: [number, number, number]) => void;
}

export interface ClientToServerEvents {
  'player:update': (data: { position: [number, number, number], rotation: [number, number, number], weapon: WeaponType }) => void;
  'player:shoot': (data: { id: string, position: [number, number, number], velocity: [number, number, number], damage: number }) => void;
  'player:melee': (data: { id: string }) => void; // victimId if hit is determined client-side for better feel, or just trigger
  'player:join': (name: string) => void;
  'player:switch': (weapon: WeaponType) => void;
}
