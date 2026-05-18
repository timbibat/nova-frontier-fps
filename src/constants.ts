import { Weapon, WeaponType } from './types';

export const WEAPONS: Record<WeaponType, Weapon> = {
  [WeaponType.PISTOL]: {
    type: WeaponType.PISTOL,
    name: 'Pulse Pistol',
    damage: 20,
    fireRate: 400,
    range: 100,
    isMelee: false
  },
  [WeaponType.RIFLE]: {
    type: WeaponType.RIFLE,
    name: 'Rapid Rifle',
    damage: 12,
    fireRate: 100,
    range: 150,
    isMelee: false
  },
  [WeaponType.BLADE]: {
    type: WeaponType.BLADE,
    name: 'Plasma Blade',
    damage: 60,
    fireRate: 600,
    range: 3,
    isMelee: true
  }
};
