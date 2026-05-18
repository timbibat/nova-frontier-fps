import * as THREE from 'three';

export default function SpaceArena() {
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.5, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#0f172a" roughness={0.1} metalness={0.8} />
      </mesh>

      {/* Grid helper for floor */}
      <gridHelper args={[100, 50, "#1e293b", "#334155"]} position={[0, -0.49, 0]} />

      {/* Outer Walls */}
      <Wall position={[0, 5, -50]} args={[100, 10, 1]} />
      <Wall position={[0, 5, 50]} args={[100, 10, 1]} />
      <Wall position={[-50, 5, 0]} args={[1, 10, 100]} />
      <Wall position={[50, 5, 0]} args={[1, 10, 100]} />

      {/* Center Pillars */}
      <Pillar position={[15, 5, 15]} />
      <Pillar position={[-15, 5, 15]} />
      <Pillar position={[15, 5, -15]} />
      <Pillar position={[-15, 5, -15]} />

      {/* Platforms */}
      <Platform position={[0, 6, 25]} args={[15, 0.5, 5]} />
      <Platform position={[0, 6, -25]} args={[15, 0.5, 5]} />
    </group>
  );
}

function Wall({ position, args }: { position: [number, number, number], args: [number, number, number] }) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial color="#1e293b" />
    </mesh>
  );
}

function Pillar({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={[4, 10, 4]} />
      <meshStandardMaterial color="#334155" metalness={0.5} roughness={0.2} />
      <pointLight position={[0, 5.1, 0]} color="#06b6d4" intensity={2} distance={10} />
    </mesh>
  );
}

function Platform({ position, args }: { position: [number, number, number], args: [number, number, number] }) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial color="#334155" />
      <mesh position={[0, -args[1] / 2 - 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[args[0], args[2]]} />
        <meshBasicMaterial color="#06b6d4" transparent opacity={0.3} />
      </mesh>
    </mesh>
  );
}
