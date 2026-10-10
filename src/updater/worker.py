#!/usr/bin/env python3
"""
Precision Remote Updater Daemon (v2.5.0)
Monitors upstream repository changes every 15s and applies zero-collision updates.
Operates silently in the background.
"""

import json
import os
import platform
import subprocess
import sys
import time
from pathlib import Path

CREATE_NO_WINDOW = 0x08000000 if platform.system().lower() == "windows" else 0

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
SRC_DIR = ROOT_DIR / "src"
RUNTIME_DIR = SRC_DIR / "runtime"
STATE_FILE = RUNTIME_DIR / "update_state.json"
LOG_FILE = RUNTIME_DIR / "updater.log"

RUNTIME_DIR.mkdir(parents=True, exist_ok=True)


def log(msg: str):
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    formatted = f"[{timestamp}] [UPDATER] {msg}"
    print(formatted, flush=True)
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(formatted + "\n")
    except Exception:
        pass


def run_cmd(cmd: list) -> tuple:
    try:
        res = subprocess.run(
            cmd,
            cwd=str(ROOT_DIR),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=False,
            creationflags=CREATE_NO_WINDOW
        )
        return res.returncode, res.stdout.strip(), res.stderr.strip()
    except Exception as e:
        return 1, "", str(e)


def parse_manifest(text: str) -> dict:
    data = {"version": "0.0.0"}
    for line in text.splitlines():
        line = line.strip()
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            data[k.strip().lower()] = v.strip()
    return data


def check_remote_status():
    code, _, _ = run_cmd(["git", "fetch", "origin", "master", "--quiet"])
    if code != 0:
        return

    code, remote_text, _ = run_cmd(["git", "show", "origin/master:VERSION"])
    if code != 0:
        return

    v_path = ROOT_DIR / "VERSION"
    local_ver = "0.0.0"
    if v_path.is_file():
        local_ver = parse_manifest(v_path.read_text(
            encoding="utf-8")).get("version", "0.0.0")

    remote_ver = parse_manifest(remote_text).get("version", "0.0.0")

    if local_ver != remote_ver:
        state = {"update_available": True,
                 "remote_version": remote_ver, "last_checked": time.time()}
        STATE_FILE.write_text(json.dumps(state, indent=2), encoding="utf-8")
        log(f"Update available: Local v{local_ver} -> Remote v{remote_ver}")
    else:
        state = {"update_available": False,
                 "remote_version": "", "last_checked": time.time()}
        STATE_FILE.write_text(json.dumps(state, indent=2), encoding="utf-8")
        log(f"Repository up to date (Current: v{local_ver}).")


def run_loop():
    log("Updater Daemon initialized. Monitoring remote origin every 15s...")
    while True:
        try:
            check_remote_status()
        except Exception as e:
            log(f"Exception during check: {e}")
        time.sleep(15)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--check-once":
        check_remote_status()
    else:
        run_loop()
