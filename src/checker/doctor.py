#!/usr/bin/env python3
"""
System Integrity & File Doctor Daemon (v2.5.0)
Reads root FILES.json manifest and verifies that every file is present in its required path.
Auto-purges root directory clutter and operates silently in the background.
"""

import json
import os
import sys
import time
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
SRC_DIR = ROOT_DIR / "src"
RUNTIME_DIR = SRC_DIR / "runtime"
MANIFEST_FILE = ROOT_DIR / "FILES.json"
LOG_FILE = RUNTIME_DIR / "doctor.log"

RUNTIME_DIR.mkdir(parents=True, exist_ok=True)

ROOT_JUNK_FILES = [
    "server.log",
    "updater.log",
    ".server.pid",
    "updater.pid",
    "doctor.pid",
    "update_state.json",
    "package.json",
    "package-lock.json",
    "nul"
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


def purge_clutter():
    for junk in ROOT_JUNK_FILES:
        target = ROOT_DIR / junk
        if target.is_file():
            try:
                target.unlink()
                log(f"Auto-purged unwanted root artifact: {junk}")
            except OSError:
                pass

    root_nm = ROOT_DIR / "node_modules"
    if root_nm.is_dir():
        try:
            import shutil
            shutil.rmtree(root_nm, ignore_errors=True)
            log("Auto-purged misplaced root node_modules.")
        except Exception:
            pass


def audit_manifest():
    purge_clutter()
    if not MANIFEST_FILE.is_file():
        log("CRITICAL: Root FILES.json manifest missing from active workspace.")
        return False, 0, 0

    try:
        data = json.loads(MANIFEST_FILE.read_text(encoding="utf-8"))
        entries = data.get("files", [])
    except Exception as e:
        log(f"CRITICAL: Failed to parse FILES.json: {e}")
        return False, 0, 0

    missing_files = []
    verified_count = 0

    for item in entries:
        expected_path = ROOT_DIR / item["path"]
        expected_name = item["name"]

        if not expected_path.exists():
            missing_files.append(
                f"Missing: '{expected_name}' at '{item['path']}'")
        elif expected_path.name != expected_name:
            missing_files.append(
                f"Name Mismatch: Found '{expected_path.name}', expected '{expected_name}'")
        else:
            verified_count += 1

    if missing_files:
        log(f"DISCREPANCY DETECTED: {len(missing_files)} file issues found:")
        for m in missing_files:
            log(f"  -> {m}")
        return False, verified_count, len(entries)
    else:
        log(f"All {verified_count}/{len(entries)} registered project files verified in correct paths.")
        return True, verified_count, len(entries)


def run_loop():
    log("System Integrity Doctor initialized. Running periodic verification...")
    while True:
        try:
            audit_manifest()
        except Exception as e:
            log(f"Exception during audit loop: {e}")
        time.sleep(15)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--check-once":
        audit_manifest()
    else:
        run_loop()
