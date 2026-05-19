import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";
import { nanoid } from "nanoid";
import { GameState, Player, Projectile, ClientToServerEvents, ServerToClientEvents, WeaponType } from "./src/types";

const _filename = typeof __filename !== 'undefined' ? __filename : fileURLToPath(import.meta.url);
const _dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(_filename);

const MAX_HEALTH = 100;
const TICK_RATE = 30;

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  // Game States mapped per Arena
  const states: Record<string, GameState> = {
    space: { players: {}, projectiles: [], bots: [] },
    desert: { players: {}, projectiles: [], bots: [] },
    forest: { players: {}, projectiles: [], bots: [] }
  };

  const roomArenas: Record<string, 'space' | 'desert' | 'forest'> = {
    space: 'space',
    desert: 'desert',
    forest: 'forest'
  };

  const NUM_BOTS = 3;
  const spawnBot = (arena: string) => {
    const state = states[arena];
    if (!state) return;
    state.bots.push({
      id: `bot-${nanoid()}`,
      position: [Math.random() * 40 - 20, 1, Math.random() * 40 - 20],
      rotation: [0, Math.random() * Math.PI * 2, 0],
      health: 100,
      name: "NEURAL_BOT_" + Math.floor(Math.random() * 1000)
    });
  };

  // Spawn initial bots for both arenas
  for (let i = 0; i < NUM_BOTS; i++) {
    spawnBot("space");
    spawnBot("desert");
    spawnBot("forest");
  }

  io.on("connection", (socket) => {
    socket.on("player:join", (name, arena, roomCode) => {
      let chosenArena: 'space' | 'desert' | 'forest' = arena === "desert" ? "desert" : arena === "forest" ? "forest" : "space";
      let roomKey: string = chosenArena;

      if (roomCode) {
        const formattedCode = roomCode.toUpperCase().trim();
        roomKey = `room-${formattedCode}`;

        if (arena === '') {
          // Player is JOINING an existing room
          if (!states[roomKey]) {
            socket.emit("room:error", "Neural connection code not found. Please verify the code.");
            return;
          }
          chosenArena = roomArenas[roomKey] || 'space';
        } else {
          // Player is CREATING a room with an arena style
          if (!states[roomKey]) {
            states[roomKey] = { players: {}, projectiles: [], bots: [] };
            roomArenas[roomKey] = chosenArena;
            
            // Spawn initial bots for this custom private room
            for (let i = 0; i < NUM_BOTS; i++) {
              spawnBot(roomKey);
            }
          }
        }
      }

      socket.join(roomKey);
      socket.data.arena = roomKey;

      const player: Player = {
        id: socket.id,
        name: name || `Player ${socket.id.slice(0, 4)}`,
        position: [Math.random() * 20 - 10, 1, Math.random() * 20 - 10],
        rotation: [0, 0, 0],
        health: MAX_HEALTH,
        score: 0,
        currentWeapon: WeaponType.PISTOL
      };

      states[roomKey].players[socket.id] = player;
      socket.emit("game:init", states[roomKey], socket.id, chosenArena, roomCode ? roomCode.toUpperCase().trim() : undefined);
      socket.to(roomKey).emit("player:joined", player);
    });

    socket.on("player:update", (data) => {
      const arena = socket.data.arena;
      if (!arena || !states[arena]) return;
      const player = states[arena].players[socket.id];
      if (player && player.health > 0) {
        player.position = data.position;
        player.rotation = data.rotation;
        player.currentWeapon = data.weapon;
      }
    });

    socket.on("player:switch", (weaponType) => {
      const arena = socket.data.arena;
      if (!arena || !states[arena]) return;
      const player = states[arena].players[socket.id];
      if (player && player.health > 0) {
        player.currentWeapon = weaponType;
      }
    });

    socket.on("player:shoot", (data) => {
      const arena = socket.data.arena;
      if (!arena || !states[arena]) return;
      const player = states[arena].players[socket.id];
      if (player && player.health > 0) {
        const projectile: Projectile = {
          id: data.id,
          ownerId: socket.id,
          position: data.position,
          velocity: data.velocity,
          damage: data.damage,
          timestamp: Date.now()
        };
        states[arena].projectiles.push(projectile);
      }
    });

    socket.on("player:melee", () => {
      const arena = socket.data.arena;
      if (!arena || !states[arena]) return;
      const state = states[arena];
      const attacker = state.players[socket.id];
      if (!attacker || attacker.health <= 0) return;

      console.log(`[MELEE] Player ${attacker.name} swung plasma blade in ${arena}. Position: [${attacker.position.map(n => n.toFixed(1))}]`);

      // Server-side melee range check (increased to 6 units, distSq < 36)
      for (const id in state.players) {
        if (id === socket.id) continue;
        const victim = state.players[id];
        if (victim.health <= 0) continue;

        const distSq =
          Math.pow(attacker.position[0] - victim.position[0], 2) +
          Math.pow(attacker.position[1] - victim.position[1], 2) +
          Math.pow(attacker.position[2] - victim.position[2], 2);

        const dist = Math.sqrt(distSq);
        console.log(`  -> Distance to player ${victim.name}: ${dist.toFixed(2)} units`);

        if (distSq < 36) { // 6 unit range
          const damage = 60;
          victim.health -= damage;
          console.log(`  💥 [HIT PLAYER] Dealt ${damage} damage to player ${victim.name}! Remaining health: ${victim.health}`);

          if (victim.health <= 0) {
            victim.health = 0;
            victim.deathTime = Date.now();
            attacker.score += 150;
            io.to(arena).emit("player:killed", { victimId: id, attackerId: socket.id });
          } else {
            io.to(arena).emit("player:hit", {
              victimId: id,
              attackerId: socket.id,
              damage,
              health: victim.health
            });
          }
        }
      }

      // Server-side melee range check for bots
      for (let i = state.bots.length - 1; i >= 0; i--) {
        const bot = state.bots[i];
        if (bot.health <= 0) continue;

        const distSq =
          Math.pow(attacker.position[0] - bot.position[0], 2) +
          Math.pow(attacker.position[1] - bot.position[1], 2) +
          Math.pow(attacker.position[2] - bot.position[2], 2);

        const dist = Math.sqrt(distSq);
        console.log(`  -> Distance to bot ${bot.name}: ${dist.toFixed(2)} units`);

        if (distSq < 36) { // 6 unit range
          const damage = 60;
          bot.health -= damage;
          console.log(`  💥 [HIT BOT] Dealt ${damage} damage to bot ${bot.name}! Remaining health: ${bot.health}`);

          if (bot.health <= 0) {
            state.bots.splice(i, 1);
            setTimeout(() => spawnBot(arena), 5000);
            attacker.score += 50;
            io.to(arena).emit("player:killed", { victimId: bot.id, attackerId: socket.id });
          } else {
            io.to(arena).emit("player:hit", {
              victimId: bot.id,
              attackerId: socket.id,
              damage,
              health: bot.health
            });
          }
        }
      }
    });

    const handleLeave = () => {
      const arena = socket.data.arena;
      if (arena && states[arena]) {
        delete states[arena].players[socket.id];
        io.to(arena).emit("player:left", socket.id);

        // Memory cleanup for dynamic empty rooms
        if (arena.startsWith("room-")) {
          const numActivePlayers = Object.keys(states[arena].players).length;
          if (numActivePlayers === 0) {
            delete states[arena];
            delete roomArenas[arena];
            console.log(`[CLEANUP] Deleted empty dynamic room: ${arena}`);
          }
        }
      }
      socket.data.arena = undefined;
    };

    socket.on("player:leave", handleLeave);
    socket.on("disconnect", handleLeave);
  });

  // Game Loop
  setInterval(() => {
    const now = Date.now();
    const dt = 1 / TICK_RATE;

    for (const arena in states) {
      const state = states[arena];

      // Respawn dead players after 10 seconds
      for (const id in state.players) {
        const player = state.players[id];
        if (player.health <= 0 && player.deathTime) {
          if (now - player.deathTime >= 10000) {
            player.health = MAX_HEALTH;
            player.position = [Math.random() * 20 - 10, 1.6, Math.random() * 20 - 10];
            player.deathTime = undefined;
            io.to(id).emit("player:respawn", player.position);
          }
        }
      }

      // Update Bots
      state.bots.forEach(bot => {
        // Simple random movement logic
        const speed = 3;
        bot.position[0] += Math.sin(bot.rotation[1]) * speed * dt;
        bot.position[2] += Math.cos(bot.rotation[1]) * speed * dt;

        // Randomly rotate
        if (Math.random() < 0.02) bot.rotation[1] += (Math.random() - 0.5) * Math.PI;

        // Keep bot in bounds
        if (Math.abs(bot.position[0]) > 45 || Math.abs(bot.position[2]) > 45) {
          bot.rotation[1] += Math.PI;
        }

        // Shooting logic for bots (shoot at nearest player)
        let minPlayerDist = 1000;
        let targetPlayerPos = null;
        for (const id in state.players) {
          const p = state.players[id];
          if (p.health <= 0) continue;
          const d = Math.sqrt(Math.pow(p.position[0] - bot.position[0], 2) + Math.pow(p.position[2] - bot.position[2], 2));
          if (d < minPlayerDist) { minPlayerDist = d; targetPlayerPos = p.position; }
        }

        if (targetPlayerPos && minPlayerDist < 25 && Math.random() < 0.03) {
          // Face player
          const dx = targetPlayerPos[0] - bot.position[0];
          const dz = targetPlayerPos[2] - bot.position[2];
          bot.rotation[1] = Math.atan2(dx, dz);

          state.projectiles.push({
            id: nanoid(),
            ownerId: bot.id,
            position: [bot.position[0], bot.position[1] + 0.5, bot.position[2]],
            velocity: [Math.sin(bot.rotation[1]) * 40, 0, Math.cos(bot.rotation[1]) * 40],
            timestamp: Date.now(),
            damage: 5
          });
        }
      });

      state.projectiles = state.projectiles.filter((p) => {
        p.position[0] += p.velocity[0] * dt;
        p.position[1] += p.velocity[1] * dt;
        p.position[2] += p.velocity[2] * dt;

        if (now - p.timestamp > 4000) return false;

        // Check collision with players
        for (const id in state.players) {
          if (id === p.ownerId) continue;
          const player = state.players[id];
          if (player.health <= 0) continue;
          const distSq =
            Math.pow(p.position[0] - player.position[0], 2) +
            Math.pow(p.position[1] - player.position[1], 2) +
            Math.pow(p.position[2] - player.position[2], 2);

          if (distSq < 2) {
            player.health -= p.damage;
            if (player.health <= 0) {
              player.health = 0;
              player.deathTime = Date.now();
              const attacker = state.players[p.ownerId];
              if (attacker) attacker.score += 100;
              io.to(arena).emit("player:killed", { victimId: id, attackerId: p.ownerId });
            } else {
              io.to(arena).emit("player:hit", { victimId: id, attackerId: p.ownerId, damage: p.damage, health: player.health });
            }
            return false;
          }
        }

        // Check collision with bots
        for (let i = state.bots.length - 1; i >= 0; i--) {
          const bot = state.bots[i];
          if (bot.id === p.ownerId) continue;
          const distSq =
            Math.pow(p.position[0] - bot.position[0], 2) +
            Math.pow(p.position[1] - bot.position[1], 2) +
            Math.pow(p.position[2] - bot.position[2], 2);

          if (distSq < 2) {
            bot.health -= p.damage;
            if (bot.health <= 0) {
              state.bots.splice(i, 1);
              setTimeout(() => spawnBot(arena), 5000);
              const attacker = state.players[p.ownerId];
              if (attacker) attacker.score += 50;
              io.to(arena).emit("player:killed", { victimId: bot.id, attackerId: p.ownerId });
            }
            return false;
          }
        }

        const bounds = 50;
        if (Math.abs(p.position[0]) > bounds || Math.abs(p.position[2]) > bounds || p.position[1] < -5 || p.position[1] > 50) return false;
        return true;
      });

      io.to(arena).emit("game:update", state);
    }
  }, 1000 / TICK_RATE);

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
