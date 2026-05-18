import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { Bot } from '../types.ts';

export default function BotRenderer({ bots }: { bots: Bot[] }) {
  return (
    <>
      {bots.map((bot) => (
        <BotItem key={bot.id} bot={bot} />
      ))}
    </>
  );
}

function BotItem({ bot }: { bot: Bot }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.lerp(new THREE.Vector3(...bot.position), 0.2);
      groupRef.current.rotation.y = bot.rotation[1];
    }
  });

  return (
    <group ref={groupRef} position={bot.position}>
      {/* Bot Body - More robotic/square */}
      <mesh castShadow>
        <boxGeometry args={[0.8, 1.2, 0.8]} />
        <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.1} />
      </mesh>
      
      {/* Glowing Eye */}
      <mesh position={[0, 0.4, 0.41]}>
        <boxGeometry args={[0.4, 0.1, 0.05]} />
        <meshBasicMaterial color="#ef4444" />
        <pointLight color="#ef4444" intensity={1} distance={2} />
      </mesh>

      {/* Hovering Plates */}
      <mesh position={[0, 0.8, 0]}>
        <boxGeometry args={[1, 0.1, 1]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>

      <Text
        position={[0, 1.8, 0]}
        fontSize={0.3}
        color="#ef4444"
        anchorX="center"
        anchorY="middle"
      >
        {bot.name}
      </Text>

      {/* Health Bar */}
      <mesh position={[0, 1.4, 0]}>
        <planeGeometry args={[1, 0.08]} />
        <meshBasicMaterial color="#000" />
      </mesh>
      <mesh position={[(-1 + bot.health / 100) / 2, 1.4, 0.01]}>
        <planeGeometry args={[bot.health / 100, 0.08]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>
    </group>
  );
}
