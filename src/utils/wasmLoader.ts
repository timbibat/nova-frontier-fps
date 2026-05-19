// src/utils/wasmLoader.ts

export interface CollisionsWasm {
  check_sphere_collision: (px: number, py: number, pz: number, sx: number, sy: number, sz: number, radius: number) => number;
  check_capsule_collision: (p1x: number, p1y: number, p1z: number, p2x: number, p2y: number, p2z: number, radius: number, height: number) => number;
  check_weapon_range: (p1x: number, p1y: number, p1z: number, p2x: number, p2y: number, p2z: number, max_range: number) => number;
  get_velocity_x: (qx: number, qy: number, qz: number, qw: number, speed: number) => number;
  get_velocity_y: (qx: number, qy: number, qz: number, qw: number, speed: number) => number;
  get_velocity_z: (qx: number, qy: number, qz: number, qw: number, speed: number) => number;
  get_muzzle_pos_x: (cam_x: number, cam_y: number, cam_z: number, qx: number, qy: number, qz: number, qw: number, lx: number, ly: number, lz: number) => number;
  get_muzzle_pos_y: (cam_x: number, cam_y: number, cam_z: number, qx: number, qy: number, qz: number, qw: number, lx: number, ly: number, lz: number) => number;
  get_muzzle_pos_z: (cam_x: number, cam_y: number, cam_z: number, qx: number, qy: number, qz: number, qw: number, lx: number, ly: number, lz: number) => number;
  get_weapon_damage_with_falloff: (dist: number, max_range: number, base_damage: number) => number;
  
  // Tactical Radar Math
  get_radar_dist: (tx: number, tz: number, mx: number, mz: number) => number;
  get_radar_left: (tx: number, tz: number, mx: number, mz: number, cos_yaw: number, sin_yaw: number, max_range: number) => number;
  get_radar_top: (tx: number, tz: number, mx: number, mz: number, cos_yaw: number, sin_yaw: number, max_range: number) => number;
  get_radar_rotation: (tx: number, tz: number, mx: number, mz: number, cos_yaw: number, sin_yaw: number, max_range: number) => number;
}

let wasmInstance: CollisionsWasm | null = null;

export interface RadarCoordinates {
  left: number;
  top: number;
  rotationDeg: number;
  dist: number;
  isClamped: boolean;
}

/**
 * Check if a point (e.g. projectile) collides with a target sphere.
 */
export const checkSphereCollision = (
  px: number, py: number, pz: number,
  sx: number, sy: number, sz: number,
  radius: number
): boolean => {
  if (wasmInstance) {
    return wasmInstance.check_sphere_collision(px, py, pz, sx, sy, sz, radius) === 1;
  }
  
  // High-performance TypeScript Fallback
  const dx = px - sx;
  const dy = py - sy;
  const dz = pz - sz;
  return (dx * dx + dy * dy + dz * dz) <= (radius * radius);
};

/**
 * Check capsule/cylinder overlap between two entities (e.g. player and bot).
 */
export const checkCapsuleCollision = (
  p1x: number, p1y: number, p1z: number,
  p2x: number, p2y: number, p2z: number,
  radius: number, height: number
): boolean => {
  if (wasmInstance) {
    return wasmInstance.check_capsule_collision(p1x, p1y, p1z, p2x, p2y, p2z, radius, height) === 1;
  }

  // High-performance TypeScript Fallback
  const dx = p1x - p2x;
  const dz = p1z - p2z;
  if ((dx * dx + dz * dz) > (radius * 2) * (radius * 2)) {
    return false;
  }
  
  const dy = p1y - p2y;
  return (dy < 0 ? -dy : dy) < height;
};

/**
 * Check if target coordinate is within the weapon's maximum absolute range.
 */
export const checkWeaponRange = (
  p1x: number, p1y: number, p1z: number,
  p2x: number, p2y: number, p2z: number,
  maxRange: number
): boolean => {
  if (wasmInstance) {
    return wasmInstance.check_weapon_range(p1x, p1y, p1z, p2x, p2y, p2z, maxRange) === 1;
  }

  // High-performance TypeScript Fallback
  const dx = p1x - p2x;
  const dy = p1y - p2y;
  const dz = p1z - p2z;
  return (dx * dx + dy * dy + dz * dz) <= (maxRange * maxRange);
};

/**
 * Calculate dynamic bullet starting position (muzzle offset) based on camera space coordinates and quaternion rotation.
 */
export const getMuzzlePosition = (
  camX: number, camY: number, camZ: number,
  qx: number, qy: number, qz: number, qw: number,
  lx: number, ly: number, lz: number
): [number, number, number] => {
  if (wasmInstance) {
    return [
      wasmInstance.get_muzzle_pos_x(camX, camY, camZ, qx, qy, qz, qw, lx, ly, lz),
      wasmInstance.get_muzzle_pos_y(camX, camY, camZ, qx, qy, qz, qw, lx, ly, lz),
      wasmInstance.get_muzzle_pos_z(camX, camY, camZ, qx, qy, qz, qw, lx, ly, lz)
    ];
  }

  // High-performance TypeScript Fallback
  const tx = 2.0 * (qy * lz - qz * ly);
  const ty = 2.0 * (qz * lx - qx * lz);
  const tz = 2.0 * (qx * ly - qy * lx);

  return [
    camX + (lx + qw * tx + qy * tz - qz * ty),
    camY + (ly + qw * ty + qz * tx - qx * tz),
    camZ + (lz + qw * tz + qx * ty - qy * tx)
  ];
};

/**
 * Get the 3D projectile velocity vector [vx, vy, vz] based on camera quaternion rotation.
 */
export const getProjectileVelocity = (
  qx: number, qy: number, qz: number, qw: number,
  speed: number
): [number, number, number] => {
  if (wasmInstance) {
    return [
      wasmInstance.get_velocity_x(qx, qy, qz, qw, speed),
      wasmInstance.get_velocity_y(qx, qy, qz, qw, speed),
      wasmInstance.get_velocity_z(qx, qy, qz, qw, speed)
    ];
  }

  // High-performance TypeScript Fallback
  const vx = -2.0 * (qw * qy + qx * qz) * speed;
  const vy = 2.0 * (qw * qx - qy * qz) * speed;
  const vz = (qx * qx + qy * qy - qz * qz - qw * qw) * speed;
  return [vx, vy, vz];
};

/**
 * Calculate dynamic damage based on the target distance.
 */
export const getWeaponDamageWithFalloff = (
  dist: number,
  maxRange: number,
  baseDamage: number
): number => {
  if (wasmInstance) {
    return wasmInstance.get_weapon_damage_with_falloff(dist, maxRange, baseDamage);
  }

  // High-performance TypeScript Fallback
  if (dist > maxRange) return 0;
  const ratio = dist / maxRange;
  return baseDamage * (1.0 - ratio * 0.7);
};

/**
 * Project world targets coordinates to a circular 2D radar display representation.
 * Uses high-performance C++ WebAssembly when available, otherwise falls back to a clean TypeScript equivalent.
 */
export const getRadarCoordinates = (
  tx: number, tz: number,
  mx: number, mz: number,
  cosYaw: number, sinYaw: number,
  maxRange: number
): RadarCoordinates => {
  // Direct high-performance, JIT-optimized math calculations (no JS-to-WASM transition overhead)
  const dx = tx - mx;
  const dz = tz - mz;
  const dist = Math.sqrt(dx * dx + dz * dz);

  const rx = dx * cosYaw - dz * sinYaw;
  const ry = dx * sinYaw + dz * cosYaw;

  const isClamped = dist > maxRange;
  
  let displayX = rx;
  let displayY = ry;
  if (dist > maxRange && dist > 0) {
    displayX = rx * (maxRange / dist);
    displayY = ry * (maxRange / dist);
  }

  const left = 50.0 + (displayX / maxRange) * 50.0;
  const top = 50.0 + (displayY / maxRange) * 50.0;

  const rotationDeg = Math.atan2(displayY, displayX) * (180.0 / Math.PI) + 90.0;

  return {
    left,
    top,
    rotationDeg,
    dist,
    isClamped
  };
};

/**
 * Initiates asynchronously loading the compiled WebAssembly binary.
 */
export const initWasm = async (): Promise<boolean> => {
  try {
    const response = await fetch('/wasm/collisions.wasm');
    if (!response.ok) throw new Error('Wasm binary not built yet');
    
    const buffer = await response.arrayBuffer();
    const obj = await WebAssembly.instantiate(buffer);
    const exports = obj.instance.exports as any;

    // Helper to dynamically map exported functions that might have underscore prefixes
    const mapWasmFunc = (name: string) => {
      return exports[name] || exports[`_${name}`];
    };

    wasmInstance = {
      check_sphere_collision: mapWasmFunc('check_sphere_collision'),
      check_capsule_collision: mapWasmFunc('check_capsule_collision'),
      check_weapon_range: mapWasmFunc('check_weapon_range'),
      get_velocity_x: mapWasmFunc('get_velocity_x'),
      get_velocity_y: mapWasmFunc('get_velocity_y'),
      get_velocity_z: mapWasmFunc('get_velocity_z'),
      get_muzzle_pos_x: mapWasmFunc('get_muzzle_pos_x'),
      get_muzzle_pos_y: mapWasmFunc('get_muzzle_pos_y'),
      get_muzzle_pos_z: mapWasmFunc('get_muzzle_pos_z'),
      get_weapon_damage_with_falloff: mapWasmFunc('get_weapon_damage_with_falloff'),
      get_radar_dist: mapWasmFunc('get_radar_dist'),
      get_radar_left: mapWasmFunc('get_radar_left'),
      get_radar_top: mapWasmFunc('get_radar_top'),
      get_radar_rotation: mapWasmFunc('get_radar_rotation')
    } as unknown as CollisionsWasm;

    console.log('⚡ [WASM] C++ WebAssembly Physics Engine initialized successfully!');
    return true;
  } catch (err) {
    console.warn('⚠️ [WASM] C++ WebAssembly engine not loaded (binary missing). Gracefully degraded to high-performance TypeScript calculations.');
    return false;
  }
};
