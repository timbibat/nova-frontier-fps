# 🌌 NOVA FRONTIER: MULTIPLAYER COMBAT SECTOR

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-black?style=for-the-badge&logo=three.js&logoColor=white)](https://threejs.org/)
[![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)

**Nova Frontier** is a state-of-the-art, high-performance browser-based **Multiplayer 3D First-Person Shooter (FPS)** built with **React Three Fiber (Three.js)**, **WebSockets (Socket.io)**, and **Node.js**. Engage in tactical sector combat, swap armaments on the fly, compete against remote players in real-time, and neutralize auto-targeting rogue bots.

---

## 🚀 Key Features

* **Real-Time WebSockets Architecture**: Powered by Socket.io for low-latency synchronization of player coordinates, direction, firing projectiles, melee attacks, kills, and scoreboards.
* **Responsive 3D Viewport**: Rendered using `@react-three/fiber` and `@react-three/drei` for fully illuminated arenas, starry sectors, platforms, pillars, and dynamic shadows.
* **Autonomous Rogue Bots**: Auto-targeting neural bots that move dynamically inside bounds, face targets, deploy projectiles, and respawn upon destruction.
* **Interactive Glassmorphic Pause Menu**: Summoned natively when `Escape` is pressed (unlocking the cursor). Displays real-time pilot stats, active hostiles remaining, and an operations checklist with native mouse re-lock.
* **Glitched Resurrection System**: Full-screen cybernetic alert overlay (**"NEURAL LINK SEVERED"**) upon death, featuring a ticking millisecond countdown (`10.00s` down to `0.00s`), smooth loader calibration bars, and complete player action lockout on both the client and server.
* **Advanced Multi-Armament Suite**: Seamless hotkey switching between high-impact armaments:
  * **Pistol**: Semi-automatic light armament.
  * **Rifle**: Fully automatic heavy armament.
  * **Blade**: Close-combat kinetic melee weapon.

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Renderer** | React 18, `@react-three/fiber` | High-fidelity WebGL 3D Canvas rendering |
| **Physics & POV** | `@react-three/drei` | Pointer lock camera controllers, Sky & Star dome |
| **Styles & Themes** | Tailwind CSS v4 | Responsive layout utilities, Glassmorphism, cyber overlays |
| **Networking** | Socket.io Client / Server | Low-latency bi-directional game loop events |
| **Backend runtime** | Node.js, Express | Dynamic server infrastructure & asset hosting |
| **Compiler & Bundler**| Vite + esbuild | Ultra-fast asset pipelines & CommonJS production bundles |

---

## 🎮 Operations Manual (Hotkeys)

* **`[W] [A] [S] [D]`** — Thruster propulsion & movement
* **`[SPACE]`** — Vertically jump/evade
* **`[MOUSE_1]` (Left Click)** — Deploy active armament / swing blade
* **`[1] [2] [3]`** — Cycle weapons (Pistol, Rifle, Blade)
* **`[ESC]`** — Release neural connection / Pause simulation

---

## 🚀 Quick Start & Deployment

### 📋 Prerequisites
Ensure you have the latest version of [Node.js](https://nodejs.org/) installed.

### 1. Initialize Sector Environment
Install all dependencies for the compiler, backend server, and standard dependencies:
```bash
npm install
```

### 2. Run Sector in Development Mode
Launches the low-latency development environment with instant hot-reloading:
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 3. Build & Deploy Production Sector
Vite builds the frontend bundles while esbuild compiles `server.ts` into a production CommonJS server script (`dist/server.cjs`):
```bash
# Compile and bundle
npm run build

# Start production server
npm run start
```

---

## 📡 Combat Synchronization Protocols

The multiplayer sector relies on structured Socket.io events for continuous frame updates:

* `game:init` — Emitted by server on initial connection. Pre-loads all player positions, bots, active projectiles, and assigns a unique client ID.
* `player:join` — Emitted by client to authenticate callsign and instantiate their avatar in-game.
* `player:update` — Continuous 30Hz client telemetry broadcast (position, rotation, and current weapon).
* `player:shoot` / `player:melee` — Instantiates bullet vectors or applies server-side range checks for melee contact.
* `player:killed` — Broadcaster for lethal kinetic payloads. Initiates spectator state and starts the resurrection sequence.
