import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Projectile } from '../types.ts';

export default function ProjectileRenderer({ projectiles }: { projectiles: Projectile[] }) {
  return (
    <>
      {projectiles.map((p) => (
        <ProjectileItem key={p.id} projectile={p} />
      ))}
    </>
  );
}

function ProjectileItem({ projectile }: { projectile: Projectile }) {
  const meshRef = useRef<THREE.Mesh>(null);

  return (
    <mesh ref={meshRef} position={projectile.position}>
      <sphereGeometry args={[0.2, 8, 8]} />
      <meshBasicMaterial color="#06b6d4" />
      <pointLight color="#06b6d4" intensity={2} distance={3} />
    </mesh>
  );
}
