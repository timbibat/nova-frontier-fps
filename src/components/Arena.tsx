import SpaceArena from './maps/SpaceArena.tsx';
import DesertArena from './maps/DesertArena.tsx';

interface ArenaProps {
  type: 'space' | 'desert';
}

export default function Arena({ type }: ArenaProps) {
  return type === 'desert' ? <DesertArena /> : <SpaceArena />;
}
