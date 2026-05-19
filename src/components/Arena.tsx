import SpaceArena from './maps/SpaceArena.tsx';
import DesertArena from './maps/DesertArena.tsx';
import ForestArena from './maps/ForestArena.tsx';

interface ArenaProps {
  type: 'space' | 'desert' | 'forest';
}

export default function Arena({ type }: ArenaProps) {
  if (type === 'forest') return <ForestArena />;
  if (type === 'desert') return <DesertArena />;
  return <SpaceArena />;
}
