import { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Socket } from 'socket.io-client';
import { nanoid } from 'nanoid';
import { ClientToServerEvents, ServerToClientEvents, WeaponType } from '../types.ts';
import { WEAPONS } from '../constants.ts';
import WeaponModel from './WeaponModel.tsx';

const SPEED = 10;
const JUMP_FORCE = 12;
const GRAVITY = 30;

interface Props {
  socket: Socket<ServerToClientEvents, ClientToServerEvents>;
  myId: string;
  initialPos: [number, number, number];
  health: number;
}

export default function PlayerControls({ socket, myId, initialPos, health }: Props) {
  const { camera } = useThree();
  const velocity = useRef(new THREE.Vector3());
  const [keys, setKeys] = useState<Record<string, boolean>>({});
  const [currentWeapon, setCurrentWeapon] = useState<WeaponType>(WeaponType.PISTOL);
  const lastFired = useRef<number>(0);
  const weaponGroupRef = useRef<THREE.Group>(null);

  const isMouseDown = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setKeys((k) => ({ ...k, [e.code]: true }));
      
      // Weapon switching
      if (e.code === 'Digit1') setCurrentWeapon(WeaponType.PISTOL);
      if (e.code === 'Digit2') setCurrentWeapon(WeaponType.RIFLE);
      if (e.code === 'Digit3') setCurrentWeapon(WeaponType.BLADE);
    };
    const handleKeyUp = (e: KeyboardEvent) => setKeys((k) => ({ ...k, [e.code]: false }));
    const handleMouseDown = () => { isMouseDown.current = true; };
    const handleMouseUp = () => { isMouseDown.current = false; };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [camera, socket]);

  useEffect(() => {
    const handleRespawn = (position: [number, number, number]) => {
      camera.position.set(...position);
      velocity.current.set(0, 0, 0);
    };

    socket.on('player:respawn', handleRespawn);

    return () => {
      socket.off('player:respawn', handleRespawn);
    };
  }, [camera, socket]);

  useFrame((state, delta) => {
    if (health <= 0) {
      if (weaponGroupRef.current) {
        weaponGroupRef.current.position.set(0, -100, 0);
      }
      return;
    }

    if (!document.pointerLockElement) return;

    const weapon = WEAPONS[currentWeapon];

    // Attacking
    if (isMouseDown.current) { // Left click
      const now = Date.now();
      if (now - lastFired.current > weapon.fireRate) {
        lastFired.current = now;

        if (weapon.isMelee) {
          socket.emit('player:melee', { id: nanoid() });
          
          // Melee swing animation trigger
          if (weaponGroupRef.current) {
            weaponGroupRef.current.rotation.x = -0.5;
            setTimeout(() => { if (weaponGroupRef.current) weaponGroupRef.current.rotation.x = 0; }, 100);
          }
        } else {
          const direction = new THREE.Vector3();
          camera.getWorldDirection(direction);
          
          socket.emit('player:shoot', {
            id: nanoid(),
            position: [camera.position.x, camera.position.y - 0.2, camera.position.z],
            velocity: [direction.x * 60, direction.y * 60, direction.z * 60],
            damage: weapon.damage
          });

          // Recoil visual
          if (weaponGroupRef.current) {
            weaponGroupRef.current.position.z += 0.1;
            setTimeout(() => { if (weaponGroupRef.current) weaponGroupRef.current.position.z -= 0.1; }, 50);
          }
        }
      }
    }

    // Movement
    const moveVector = new THREE.Vector3();
    if (keys['KeyW']) moveVector.z -= 1;
    if (keys['KeyS']) moveVector.z += 1;
    if (keys['KeyA']) moveVector.x -= 1;
    if (keys['KeyD']) moveVector.x += 1;
    moveVector.normalize().multiplyScalar(SPEED * delta);
    moveVector.applyQuaternion(camera.quaternion);
    moveVector.y = 0;

    camera.position.add(moveVector);

    // Gravity
    velocity.current.y -= GRAVITY * delta;
    camera.position.y += velocity.current.y * delta;

    if (camera.position.y < 1.6) {
      camera.position.y = 1.6;
      velocity.current.y = 0;
      if (keys['Space']) velocity.current.y = JUMP_FORCE;
    }

    camera.position.x = Math.max(-48, Math.min(48, camera.position.x));
    camera.position.z = Math.max(-48, Math.min(48, camera.position.z));

    // Update server
    socket.emit('player:update', {
      position: [camera.position.x, camera.position.y, camera.position.z],
      rotation: [camera.rotation.x, camera.rotation.y, camera.rotation.z],
      weapon: currentWeapon
    });

    // Update weapon viewmodel position to follow camera
    if (weaponGroupRef.current) {
      weaponGroupRef.current.position.copy(camera.position);
      weaponGroupRef.current.quaternion.copy(camera.quaternion);
    }
  });

  return (
    <group ref={weaponGroupRef}>
      <WeaponModel type={currentWeapon} isLocal />
    </group>
  );
}
