import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { Player } from '../types.ts';
import WeaponModel from './WeaponModel.tsx';

export default function RemotePlayer({ player }: { player: Player }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.lerp(new THREE.Vector3(...player.position), 0.2);
      // For remote players, we only match the body rotation Y (yaw)
      groupRef.current.rotation.y = player.rotation[1];
    }
  });

  return (
    <group ref={groupRef} position={player.position}>
      {/* Player Body */}
      <mesh castShadow position={[0, 0, 0]}>
        <capsuleGeometry args={[0.5, 1, 4, 8]} />
        <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Visor */}
      <mesh position={[0, 0.4, 0.3]}>
        <boxGeometry args={[0.6, 0.2, 0.2]} />
        <meshBasicMaterial color="#06b6d4" />
      </mesh>

      {/* Held Weapon */}
      <WeaponModel type={player.currentWeapon} />

      {/* Name Tag */}
      <Text
        position={[0, 1.8, 0]}
        fontSize={0.4}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {player.name}
      </Text>

      {/* Health Bar Background */}
      <mesh position={[0, 1.4, 0]}>
        <planeGeometry args={[1, 0.1]} />
        <meshBasicMaterial color="#000" />
      </mesh>
      
      {/* Health Bar Foreground */}
      <mesh position={[(-1 + player.health / 100) / 2, 1.4, 0.01]}>
        <planeGeometry args={[player.health / 100, 0.1]} />
        <meshBasicMaterial color={player.health > 30 ? "#22c55e" : "#ef4444"} />
      </mesh>
    </group>
  );
}
