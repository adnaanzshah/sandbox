import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { getProjectManifest } from "./versionReader.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, "../../");
const SRC_DIR = path.resolve(ROOT_DIR, "src");
const WEB_DIR = path.resolve(SRC_DIR, "web");
const RUNTIME_DIR = path.resolve(SRC_DIR, "runtime");
const CONFIG_PATH = path.resolve(SRC_DIR, "config", "config.json");

if (!fs.existsSync(RUNTIME_DIR)) {
  fs.mkdirSync(RUNTIME_DIR, { recursive: true });
}

if (!fs.existsSync(WEB_DIR)) {
  fs.mkdirSync(WEB_DIR, { recursive: true });
}

// Load network configuration
let serverConfig = { network: { port: 3000, host: "0.0.0.0" } };
if (fs.existsSync(CONFIG_PATH)) {
  try {
    serverConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  } catch {}
}

const app = express();
const PORT = process.env.PORT || serverConfig.network?.port || 3000;
const HOST = serverConfig.network?.host || "0.0.0.0";

// Cache-busting for clean local development
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Dynamic single-source API endpoints
app.get("/api/manifest", (req, res) => {
  const manifest = getProjectManifest();
  res.json(manifest);
});

app.get("/api/health", (req, res) => {
  const manifest = getProjectManifest();
  res.json({
    status: "healthy",
    system: manifest.projectName,
    version: manifest.version,
    build: manifest.build,
    lifecycleStatus: manifest.status,
    pid: process.pid,
    timestamp: new Date().toISOString(),
  });
});

// Root fallback displaying the dynamically loaded manifest
app.get("*", (req, res) => {
  const manifest = getProjectManifest();
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${manifest.projectName} • v${manifest.version}</title>
      </head>
      <body style="background:#0a0a0c; color:#ffffff; font-family:-apple-system, BlinkMacSystemFont, sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; text-align:center;">
        <div style="padding: 24px; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; background: rgba(255,255,255,0.03);">
          <h1 style="font-size:1.8rem; margin:0 0 8px 0;">${manifest.projectName}</h1>
          <p style="color:#888; margin:0 0 16px 0;">Version: <strong>${manifest.version}</strong> (${manifest.status})</p>
          <div style="font-size:0.8rem; color:#555;">Channel: ${manifest.channel} | Codename: ${manifest.codename} | Build: ${manifest.build}</div>
        </div>
      </body>
    </html>
  `);
});

app.listen(PORT, HOST, () => {
  const manifest = getProjectManifest();
  console.log(
    `\n[${manifest.projectName}] Engine active at http://localhost:${PORT}`,
  );
  console.log(`Version: ${manifest.version} | Build: ${manifest.build}\n`);
});
