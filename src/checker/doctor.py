#!/usr/bin/env python3
"""
System Integrity & File Doctor Daemon (v2.2.0)
Monitors files, cleans orphan locks, validates Postgres availability, and writes diagnostics.
"""

import os
import sys
import time
import socket
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
SRC_DIR = ROOT_DIR / "src"
WEB_DIR = SRC_DIR / "web"
RUNTIME_DIR = SRC_DIR / "runtime"
LOG_FILE = RUNTIME_DIR / "doctor.log"

REQUIRED_MANIFEST = [
    SRC_DIR / "config" / "config.json",
    SRC_DIR / "server" / "server.mjs",
    SRC_DIR / "updater" / "worker.py",
    SRC_DIR / "db" / "DatabaseManager.mjs",
    ROOT_DIR / "VERSION",
    WEB_DIR / "index.html",
    WEB_DIR / "js" / "app.js",
    WEB_DIR / "js" / "engine" / "EngineCore.js",
    WEB_DIR / "js" / "engine" / "ThemeBus.js",
    WEB_DIR / "js" / "atoms" / "GreetingAtom.js",
    WEB_DIR / "js" / "atoms" / "UpdatePillAtom.js",
    WEB_DIR / "js" / "atoms" / "SettingsButtonAtom.js",
    WEB_DIR / "js" / "atoms" / "ThemeToggleAtom.js",
    WEB_DIR / "js" / "atoms" / "ForceSyncAtom.js",
    WEB_DIR / "js" / "sections" / "TopSection.js",
    WEB_DIR / "js" / "sections" / "BodySection.js",
    WEB_DIR / "js" / "sections" / "BottomSection.js",
    WEB_DIR / "js" / "sections" / "SettingsModalSection.js",
    WEB_DIR / "js" / "pages" / "HomePage.js",
    WEB_DIR / "css" / "global.css",
    WEB_DIR / "css" / "splash.css",
    WEB_DIR / "css" / "pages" / "home-page.css"
]

def log(msg: str):
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    formatted = f"[{timestamp}] [DOCTOR] {msg}"
    print(formatted, flush=True)
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(formatted + "\n")
    except Exception:
        pass

def check_postgres_port():
    try:
        with socket.create_connection(("127.0.0.1", 5432), timeout=1):
            return True
    except (OSError, socket.timeout):
        return False

def audit_file_tree():
    missing = [str(p.relative_to(ROOT_DIR)) for p in REQUIRED_MANIFEST if not p.is_file()]
    if missing:
        log(f"ALERT: Missing {len(missing)} files: {', '.join(missing[:3])}")
    else:
        db_live = "Online" if check_postgres_port() else "Standby (Port 5432)"
        log(f"INTEGRITY OK: All {len(REQUIRED_MANIFEST)} files verified. PostgreSQL: {db_live}")

def clean_locks():
    # Remove stale index.lock if git terminated abruptly
    lock = ROOT_DIR / ".git" / "index.lock"
    if lock.is_file():
        try:
            lock.unlink()
            log("Removed stale .git/index.lock file.")
        except Exception:
            pass

def audit_and_heal():
    clean_locks()
    audit_file_tree()

def run_loop():
    log("Doctor Daemon online. Auditing file tree & DB health every 15s...")
    while True:
        try:
            audit_and_heal()
        except Exception as e:
            log(f"ERROR: {e}")
        time.sleep(15)

if __name__ == "__main__":
    audit_and_heal()