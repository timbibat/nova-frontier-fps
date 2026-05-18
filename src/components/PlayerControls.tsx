import { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Socket } from 'socket.io-client';
import { nanoid } from 'nanoid';
import { ClientToServerEvents, ServerToClientEvents, WeaponType } from '../types.ts';
import { WEAPONS } from '../constants.ts';
import WeaponModel from './WeaponModel.tsx';
import { audioSynth } from '../utils/audio.ts';

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
  const localWeaponModelRef = useRef<THREE.Group>(null);

  const isMouseDown = useRef(false);
  const shouldFire = useRef(false);
  const swingProgress = useRef(0);
  const isSwinging = useRef(false);
  const recoilProgress = useRef(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setKeys((k) => ({ ...k, [e.code]: true }));
      
      // Weapon switching
      if (e.code === 'Digit1') setCurrentWeapon(WeaponType.PISTOL);
      if (e.code === 'Digit2') setCurrentWeapon(WeaponType.RIFLE);
      if (e.code === 'Digit3') setCurrentWeapon(WeaponType.BLADE);
    };
    const handleKeyUp = (e: KeyboardEvent) => setKeys((k) => ({ ...k, [e.code]: false }));
    const handleMouseDown = () => { 
      isMouseDown.current = true; 
      shouldFire.current = true;
    };
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
    if (isMouseDown.current || shouldFire.current) { // Left click
      const now = Date.now();
      if (now - lastFired.current > weapon.fireRate) {
        lastFired.current = now;
        shouldFire.current = false;

        if (weapon.isMelee) {
          socket.emit('player:melee', { id: nanoid() });
          audioSynth.playBladeSwingSound();
          isSwinging.current = true;
          swingProgress.current = 0;
        } else {
          const direction = new THREE.Vector3();
          camera.getWorldDirection(direction);
          
          socket.emit('player:shoot', {
            id: nanoid(),
            position: [camera.position.x, camera.position.y - 0.2, camera.position.z],
            velocity: [direction.x * 60, direction.y * 60, direction.z * 60],
            damage: weapon.damage
          });

          audioSynth.playShootSound(currentWeapon);

          // Trigger firearm recoil kickback
          recoilProgress.current = 0.18;
        }
      } else {
        if (!isMouseDown.current) {
          shouldFire.current = false;
        }
      }
    }

    // Smooth animations inside useFrame
    if (localWeaponModelRef.current) {
      if (recoilProgress.current > 0) {
        recoilProgress.current = THREE.MathUtils.lerp(recoilProgress.current, 0, delta * 15);
      }

      if (isSwinging.current) {
        // Swing duration: ~0.2 seconds (increment delta * 5)
        swingProgress.current += delta * 5;
        if (swingProgress.current >= 1) {
          isSwinging.current = false;
          swingProgress.current = 0;
          localWeaponModelRef.current.position.set(0, 0, 0);
          localWeaponModelRef.current.rotation.set(0, 0, 0);
        } else {
          // Curved sword slash rotation and displacement
          const angle = Math.sin(swingProgress.current * Math.PI);
          localWeaponModelRef.current.rotation.x = angle * -1.2;
          localWeaponModelRef.current.rotation.y = angle * 0.8;
          localWeaponModelRef.current.rotation.z = angle * -0.5;

          localWeaponModelRef.current.position.x = angle * -0.3;
          localWeaponModelRef.current.position.y = angle * 0.2;
          localWeaponModelRef.current.position.z = angle * 0.3;
        }
      } else {
        localWeaponModelRef.current.position.set(0, 0, recoilProgress.current);
        localWeaponModelRef.current.rotation.set(0, 0, 0);
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
      <group ref={localWeaponModelRef}>
        <WeaponModel type={currentWeapon} isLocal />
      </group>
    </group>
  );
}
