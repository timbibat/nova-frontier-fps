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

  const PORT = 3000;

  // Game State
  const state: GameState = {
    players: {},
    projectiles: [],
    bots: []
  };

  const NUM_BOTS = 4;
  const spawnBot = () => {
    state.bots.push({
      id: `bot-${nanoid()}`,
      position: [Math.random() * 40 - 20, 1, Math.random() * 40 - 20],
      rotation: [0, Math.random() * Math.PI * 2, 0],
      health: 100,
      name: "NEURAL_BOT_" + Math.floor(Math.random() * 1000)
    });
  };

  for (let i = 0; i < NUM_BOTS; i++) spawnBot();

  io.on("connection", (socket) => {
    socket.on("player:join", (name) => {
      const player: Player = {
        id: socket.id,
        name: name || `Player ${socket.id.slice(0, 4)}`,
        position: [Math.random() * 20 - 10, 1, Math.random() * 20 - 10],
        rotation: [0, 0, 0],
        health: MAX_HEALTH,
        score: 0,
        currentWeapon: WeaponType.PISTOL
      };

      state.players[socket.id] = player;
      socket.emit("game:init", state, socket.id);
      socket.broadcast.emit("player:joined", player);
    });

    socket.on("player:update", (data) => {
      const player = state.players[socket.id];
      if (player && player.health > 0) {
        player.position = data.position;
        player.rotation = data.rotation;
        player.currentWeapon = data.weapon;
      }
    });

    socket.on("player:switch", (weaponType) => {
      const player = state.players[socket.id];
      if (player && player.health > 0) {
        player.currentWeapon = weaponType;
      }
    });

    socket.on("player:shoot", (data) => {
      const player = state.players[socket.id];
      if (player && player.health > 0) {
        const projectile: Projectile = {
          id: data.id,
          ownerId: socket.id,
          position: data.position,
          velocity: data.velocity,
          damage: data.damage,
          timestamp: Date.now()
        };
        state.projectiles.push(projectile);
      }
    });

    socket.on("player:melee", () => {
      const attacker = state.players[socket.id];
      if (!attacker || attacker.health <= 0) return;

      // Server-side melee range check
      for (const id in state.players) {
        if (id === socket.id) continue;
        const victim = state.players[id];
        if (victim.health <= 0) continue;

        const distSq =
          Math.pow(attacker.position[0] - victim.position[0], 2) +
          Math.pow(attacker.position[1] - victim.position[1], 2) +
          Math.pow(attacker.position[2] - victim.position[2], 2);

        if (distSq < 9) { // 3 unit range (3^2 = 9)
          const damage = 60;
          victim.health -= damage;

          if (victim.health <= 0) {
            victim.health = 0;
            victim.deathTime = Date.now();
            attacker.score += 150;
            io.emit("player:killed", { victimId: id, attackerId: socket.id });
          } else {
            io.emit("player:hit", {
              victimId: id,
              attackerId: socket.id,
              damage,
              health: victim.health
            });
          }
        }
      }
    });

    socket.on("disconnect", () => {
      delete state.players[socket.id];
      io.emit("player:left", socket.id);
    });
  });

  // Game Loop
  setInterval(() => {
    const now = Date.now();
    const dt = 1 / TICK_RATE;

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
            io.emit("player:killed", { victimId: id, attackerId: p.ownerId });
          } else {
            io.emit("player:hit", { victimId: id, attackerId: p.ownerId, damage: p.damage, health: player.health });
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
            setTimeout(spawnBot, 5000);
            const attacker = state.players[p.ownerId];
            if (attacker) attacker.score += 50;
            io.emit("player:killed", { victimId: bot.id, attackerId: p.ownerId });
          }
          return false;
        }
      }

      const bounds = 50;
      if (Math.abs(p.position[0]) > bounds || Math.abs(p.position[2]) > bounds || p.position[1] < -5 || p.position[1] > 50) return false;
      return true;
    });

    io.emit("game:update", state);
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
