import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { exec } from "child_process";
import { db } from "../db/DatabaseManager.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, "../../");
const SRC_DIR = path.resolve(ROOT_DIR, "src");
const WEB_DIR = path.resolve(SRC_DIR, "web");
const RUNTIME_DIR = path.resolve(SRC_DIR, "runtime");

if (!fs.existsSync(RUNTIME_DIR)) {
  fs.mkdirSync(RUNTIME_DIR, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

app.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  express.static(WEB_DIR, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".css")) res.setHeader("Content-Type", "text/css");
      if (filePath.endsWith(".js"))
        res.setHeader("Content-Type", "application/javascript");
    },
  }),
);

function parseVersionManifest() {
  const vPath = path.join(ROOT_DIR, "VERSION");
  const manifest = {
    version: "2.3.0",
    channel: "development",
    codename: "Titanium",
  };
  if (fs.existsSync(vPath)) {
    const raw = fs.readFileSync(vPath, "utf8");
    raw.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const [k, v] = trimmed.split("=");
        manifest[k.trim().toLowerCase()] = v.trim();
      }
    });
  }
  return manifest;
}

// Authentication Routes
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res
      .status(400)
      .json({ success: false, error: "Missing username or password" });
  }

  try {
    const authSession = await db.authenticate(username, password);
    if (!authSession) {
      return res
        .status(401)
        .json({ success: false, error: "Invalid credentials" });
    }
    res.json({ success: true, session: authSession });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/auth/verify", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ valid: false });

  try {
    const session = await db.validateSession(token);
    if (!session) return res.status(401).json({ valid: false });
    res.json({ valid: true, user: session });
  } catch (err) {
    res.status(500).json({ valid: false, error: err.message });
  }
});

app.post("/api/auth/logout", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (token) {
    await db.logout(token);
  }
  res.json({ success: true });
});

// Dynamic Workspace Data Routes (Auto-provisions schema per page)
app.post("/api/workspace/data/:pageId", async (req, res) => {
  const { pageId } = req.params;
  const { key, payload } = req.body;
  const token = req.headers.authorization?.replace("Bearer ", "");
  const session = await db.validateSession(token);

  try {
    await db.savePageData(pageId, key, payload, session?.userId || null);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/workspace/data/:pageId/:key", async (req, res) => {
  const { pageId, key } = req.params;
  try {
    const data = await db.getPageData(pageId, key);
    res.json({ success: true, payload: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/workspace/data/:pageId/:key", async (req, res) => {
  const { pageId, key } = req.params;
  try {
    await db.deletePageData(pageId, key);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// System & Maintenance Endpoints
app.get("/api/config", (req, res) => {
  const configPath = path.join(SRC_DIR, "config", "config.json");
  let configData = {};
  if (fs.existsSync(configPath)) {
    try {
      configData = JSON.parse(fs.readFileSync(configPath, "utf8"));
    } catch (e) {}
  }
  const versionData = parseVersionManifest();
  configData.system = {
    ...configData.system,
    version: versionData.version,
    channel: versionData.channel,
    codename: versionData.codename,
  };
  res.json(configData);
});

app.get("/api/update/status", (req, res) => {
  const statePath = path.join(RUNTIME_DIR, "update_state.json");
  let state = { update_available: false, remote_version: "" };
  if (fs.existsSync(statePath)) {
    try {
      state = JSON.parse(fs.readFileSync(statePath, "utf8"));
    } catch (e) {}
  }
  const v = parseVersionManifest();
  res.json({
    current_version: v.version,
    update_available: !!state.update_available,
    remote_version: state.remote_version || "",
  });
});

// Hardened Auto-Update Route
app.post('/api/update/apply', (req, res) => {
  // Discard runtime modifications and untracked collisions before pulling
  const preCleanCmd = process.platform === 'win32'
    ? 'git checkout -- src/runtime/ 2>nul & git checkout -- . 2>nul'
    : 'git checkout -- src/runtime/ 2>/dev/null || true; git checkout -- . 2>/dev/null || true';

  exec(preCleanCmd, { cwd: ROOT_DIR }, () => {
    exec('git pull --ff-only origin master', { cwd: ROOT_DIR, timeout: 12000 }, (err, stdout, stderr) => {
      if (err) {
        return res.status(500).json({ success: false, error: stderr || err.message });
      }

      const statePath = path.join(RUNTIME_DIR, 'update_state.json');
      if (fs.existsSync(statePath)) {
        try { fs.writeFileSync(statePath, JSON.stringify({ update_available: false }), 'utf8'); } catch (e) {}
      }

      res.json({ success: true, new_version: parseVersionManifest().version });
    });
  });
});

app.get("/api/services/status", (req, res) => {
  const readPid = (fname) => {
    const p = path.join(RUNTIME_DIR, fname);
    if (fs.existsSync(p)) {
      try {
        return parseInt(fs.readFileSync(p, "utf8").trim(), 10);
      } catch (e) {
        return null;
      }
    }
    return null;
  };
  res.json({
    webServer: { running: true, pid: process.pid, port: PORT },
    updater: { pid: readPid("updater.pid") },
    doctor: { pid: readPid("doctor.pid") },
  });
});
// Reliable Detached Stack Restart Endpoint
app.post("/api/services/restart", (req, res) => {
  res.json({ success: true, message: "Detached restart sequence initiated" });

  const pyCmd = process.platform === "win32" ? "py" : "python";
  const spawnFlags =
    process.platform === "win32"
      ? {
          cwd: ROOT_DIR,
          detached: true,
          stdio: "ignore",
          windowsHide: true,
          creationflags: 0x00000200 | 0x00000008, // CREATE_NEW_PROCESS_GROUP | DETACHED_PROCESS
        }
      : {
          cwd: ROOT_DIR,
          detached: true,
          stdio: "ignore",
        };

  try {
    const child = spawn(pyCmd, ["server.py", "detached-restart"], spawnFlags);
    child.unref();
  } catch (err) {
    console.error("[RESTART ERROR]:", err);
  }
});
app.get("/api/db/health", async (req, res) => {
  res.json({
    status: db.isReady ? "healthy" : "standby",
    databases: ["sandbox_auth", "sandbox_core"],
  });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(WEB_DIR, "index.html"));
});

// Boot Database Pools
db.init();

app.listen(PORT, HOST, () => {
  console.log(`\nPlatform Web Server active at http://localhost:${PORT}\n`);
});
