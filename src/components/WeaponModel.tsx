import * as THREE from 'three';
import { WeaponType } from '../types';

function Arm({ side = 'right' }: { side: 'left' | 'right' }) {
  return (
    <group position={[side === 'right' ? 0.35 : -0.35, -0.4, 0]}>
      {/* Shoulder/Upper arm */}
      <mesh castShadow>
        <boxGeometry args={[0.15, 0.15, 0.4]} />
        <meshStandardMaterial color="#475569" metalness={0.5} roughness={0.5} />
      </mesh>
      {/* Forearm */}
      <mesh position={[0, -0.05, -0.3]} castShadow>
        <boxGeometry args={[0.12, 0.12, 0.4]} />
        <meshStandardMaterial color="#475569" metalness={0.5} roughness={0.5} />
      </mesh>
    </group>
  );
}

export default function WeaponModel({ type, isLocal = false }: { type: WeaponType, isLocal?: boolean }) {
  // POV Arms
  const arms = isLocal ? (
    <group>
      <Arm side="right" />
      {type === WeaponType.RIFLE && <Arm side="left" />}
    </group>
  ) : null;

  switch (type) {
    case WeaponType.PISTOL:
      return (
        <group>
          {arms}
          <group position={isLocal ? [0.35, -0.35, -0.6] : [0.3, 0, 0.4]}>
            {/* Body */}
            <mesh castShadow>
              <boxGeometry args={[0.12, 0.22, 0.45]} />
              <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.1} />
            </mesh>
            {/* Slide */}
            <mesh position={[0, 0.08, 0]} castShadow>
              <boxGeometry args={[0.12, 0.08, 0.48]} />
              <meshStandardMaterial color="#1e293b" metalness={1} roughness={0} />
            </mesh>
            {/* Barrel Glow */}
            <mesh position={[0, 0.06, -0.24]}>
              <boxGeometry args={[0.08, 0.06, 0.02]} />
              <meshBasicMaterial color="#06b6d4" />
            </mesh>
            {/* Handle */}
            <mesh position={[0, -0.18, 0.1]} rotation={[0.2, 0, 0]} castShadow>
              <boxGeometry args={[0.12, 0.25, 0.12]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
          </group>
        </group>
      );
    case WeaponType.RIFLE:
      return (
        <group>
          {arms}
          <group position={isLocal ? [0.3, -0.35, -0.8] : [0.3, 0, 0.5]}>
            {/* Main Body */}
            <mesh castShadow>
              <boxGeometry args={[0.15, 0.28, 1.3]} />
              <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.1} />
            </mesh>
            {/* Stock */}
            <mesh position={[0, -0.05, 0.7]} castShadow>
              <boxGeometry args={[0.14, 0.35, 0.4]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
            {/* Barrel */}
            <mesh position={[0, 0.05, -0.8]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.04, 0.04, 0.6]} />
              <meshStandardMaterial color="#000" />
            </mesh>
            {/* Magazine */}
            <mesh position={[0, -0.3, 0]} rotation={[0.2, 0, 0]} castShadow>
              <boxGeometry args={[0.1, 0.4, 0.15]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
            {/* Tech Glows */}
            <mesh position={[0, 0.05, 0.2]}>
              <boxGeometry args={[0.16, 0.1, 0.3]} />
              <meshBasicMaterial color="#06b6d4" transparent opacity={0.3} />
            </mesh>
            <mesh position={[0, 0, -0.6]} rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.06, 0.08, 16]} />
              <meshBasicMaterial color="#06b6d4" side={THREE.DoubleSide} />
            </mesh>
          </group>
        </group>
      );
    case WeaponType.BLADE:
      return (
        <group>
          {arms}
          <group position={isLocal ? [0.5, -0.6, -1] : [0.5, -0.2, 0.6]} rotation={isLocal ? [0.2, -0.2, 0] : [Math.PI / 2, 0, 0]}>
            {/* Hilt */}
            <mesh castShadow position={[0, 0, 0.7]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.08, 0.1, 0.4]} />
              <meshStandardMaterial color="#1e293b" metalness={0.8} />
            </mesh>
            {/* Plasma Edge */}
            <group>
              <mesh castShadow>
                <boxGeometry args={[0.02, 0.2, 1.4]} />
                <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={5} transparent opacity={0.9} />
              </mesh>
              {/* Outer Glow */}
              <mesh>
                <boxGeometry args={[0.04, 0.25, 1.5]} />
                <meshBasicMaterial color="#06b6d4" transparent opacity={0.2} />
              </mesh>
            </group>
            {/* Guard */}
            <mesh position={[0, 0, 0.5]} castShadow>
              <boxGeometry args={[0.1, 0.3, 0.1]} />
              <meshStandardMaterial color="#475569" />
            </mesh>
            <pointLight color="#06b6d4" intensity={2} distance={3} />
          </group>
        </group>
      );
    default:
      return null;
  }
}
