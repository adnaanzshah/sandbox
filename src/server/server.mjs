import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { getProjectManifest } from "./versionReader.mjs";
import { getRules, generateCssTokens } from "./rulesEngine.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, "../../");
const SRC_DIR = path.resolve(ROOT_DIR, "src");
const WEB_DIR = path.resolve(SRC_DIR, "web");
const RUNTIME_DIR = path.resolve(SRC_DIR, "runtime");

if (!fs.existsSync(RUNTIME_DIR)) fs.mkdirSync(RUNTIME_DIR, { recursive: true });
if (!fs.existsSync(WEB_DIR)) fs.mkdirSync(WEB_DIR, { recursive: true });

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

// Dynamically served CSS strictly mapped from rules.json
app.get("/css/rules-theme.css", (req, res) => {
  res.setHeader("Content-Type", "text/css");
  res.send(generateCssTokens());
});

// Rules Query Endpoint for JavaScript Consumers
app.get("/api/rules", (req, res) => {
  res.json(getRules());
});

app.get("/api/manifest", (req, res) => {
  res.json(getProjectManifest());
});

app.get("/api/health", (req, res) => {
  const manifest = getProjectManifest();
  res.json({
    status: "healthy",
    system: manifest.projectName,
    version: manifest.version,
    rulesEnforced: true,
    palette: "Strict Monochrome",
    timestamp: new Date().toISOString(),
  });
});

app.use(express.static(WEB_DIR));

// Root baseline display referencing dynamic tokens
app.get("*", (req, res) => {
  const manifest = getProjectManifest();
  res.send(`
    <!DOCTYPE html>
    <html lang="en" data-theme="dark">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${manifest.projectName} • Rules Enforced</title>
        <link rel="stylesheet" href="/css/rules-theme.css" />
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            background-color: var(--bg-core);
            color: var(--text-primary);
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            transition: background-color var(--time-smooth), color var(--time-smooth);
          }
          .liquid-card {
            background: var(--glass-fill);
            backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
            -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
            border: 1px solid var(--glass-border);
            border-radius: var(--radius-card);
            box-shadow: var(--glass-shadow);
            padding: 40px;
            text-align: center;
            max-width: 440px;
            width: 90%;
          }
          h1 { font-size: 1.6rem; margin-bottom: 8px; letter-spacing: -0.02em; }
          p { font-size: 0.9rem; color: var(--text-secondary); line-height: 1.4; margin-bottom: 20px; }
          .badge {
            display: inline-block;
            font-size: 0.75rem;
            padding: 4px 12px;
            border-radius: var(--radius-capsule);
            border: 1px solid var(--glass-border);
            color: var(--text-tertiary);
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
        </style>
      </head>
      <body>
        <div class="liquid-card">
          <div class="badge">Monochrome Rules Enforced</div>
          <h1 style="margin-top: 14px;">${manifest.projectName}</h1>
          <p>System tokens compiled dynamically from <code>src/config/rules.json</code>. No arbitrary colors permitted.</p>
          <div style="font-size: 0.8rem; color: var(--text-tertiary);">v${manifest.version} [${manifest.status}]</div>
        </div>
      </body>
    </html>
  `);
});

app.listen(PORT, HOST, () => {
  const manifest = getProjectManifest();
  console.log(
    `[${manifest.projectName}] Rules Engine loaded. Colors restricted strictly to black & white.`,
  );
  console.log(
    `Dynamic stylesheet live at http://localhost:${PORT}/css/rules-theme.css`,
  );
});
