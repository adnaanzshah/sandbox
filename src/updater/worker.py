#!/usr/bin/env python3
"""
15-Second Silent Precision Updater Worker (Encapsulated Architecture)
"""

import datetime
import json
import os
import platform
import signal
import subprocess
import sys
import time
from pathlib import Path

CREATE_NO_WINDOW = 0x08000000 if platform.system().lower() == "windows" else 0


class PrecisionUpdateWorker:
    def __init__(self, root_dir: Path):
        self.root_dir = root_dir.resolve()
        self.src_dir = self.root_dir / "src"
        self.runtime_dir = self.src_dir / "runtime"
        self.runtime_dir.mkdir(parents=True, exist_ok=True)

        self.state_file = self.runtime_dir / "update_state.json"
        self.poll_interval = 15
        self.auto_apply_seconds = 6 * 3600
        self.running = True

        signal.signal(signal.SIGTERM, self._shutdown_handler)
        signal.signal(signal.SIGINT, self._shutdown_handler)

    def _shutdown_handler(self, signum, frame):
        self.running = False

    def log(self, message: str):
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] {message}", flush=True)

    def parse_manifest(self, text: str) -> dict:
        data = {"version": "Unknown",
                "channel": "development", "codename": "Titanium"}
        for line in text.splitlines():
            line = line.strip()
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                data[k.strip().lower()] = v.strip()
        return data

    def read_local_manifest(self) -> dict:
        v_path = self.root_dir / "VERSION"
        if v_path.is_file():
            try:
                return self.parse_manifest(v_path.read_text(encoding="utf-8"))
            except OSError:
                pass
        return {"version": "0.0.0", "channel": "development", "codename": "Titanium"}

    def run_cmd(self, cmd: list) -> tuple:
        try:
            res = subprocess.run(
                cmd,
                cwd=str(self.root_dir),
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                check=False,
                creationflags=CREATE_NO_WINDOW
            )
            return res.returncode, res.stdout.strip(), res.stderr.strip()
        except Exception as err:
            return 1, "", str(err)

    def write_state(self, is_available: bool, remote_ver: str, available_since: float = None):
        state = {
            "update_available": is_available,
            "remote_version": remote_ver,
            "available_since": available_since,
            "last_checked": time.time()
        }
        try:
            self.state_file.write_text(json.dumps(
                state, indent=2), encoding="utf-8")
        except OSError:
            pass

    def read_state(self) -> dict:
        if self.state_file.is_file():
            try:
                return json.loads(self.state_file.read_text(encoding="utf-8"))
            except Exception:
                pass
        return {"update_available": False, "remote_version": "", "available_since": None}

    def execute_git_pull(self) -> bool:
        code, branch, _ = self.run_cmd(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"])
        if code != 0 or not branch:
            branch = "master"

        self.log(f"[PULL] Applying fast-forward pull on branch '{branch}'...")
        code, _, err = self.run_cmd(
            ["git", "pull", "--ff-only", "origin", branch])
        if code == 0:
            self.log("[SUCCESS] Git pull complete.")
            self.write_state(False, "", None)
            return True
        else:
            self.log(f"[ERROR] Git pull failed: {err}")
            return False

    def probe_remote(self):
        code, branch, _ = self.run_cmd(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"])
        if code != 0 or not branch or branch == "HEAD":
            return

        code, _, _ = self.run_cmd(
            ["git", "fetch", "origin", branch, "--quiet"])
        if code != 0:
            return

        code, remote_text, _ = self.run_cmd(
            ["git", "show", f"origin/{branch}:VERSION"])
        if code != 0:
            return

        local = self.read_local_manifest()
        remote = self.parse_manifest(remote_text)
        state = self.read_state()

        if local["version"] != remote["version"]:
            available_since = state.get("available_since") or time.time()
            self.write_state(True, remote["version"], available_since)
            self.log(
                f"[NOTIFY] Update available: v{local['version']} -> v{remote['version']}")

            if (time.time() - available_since) >= self.auto_apply_seconds:
                self.log(
                    "[SCHEDULE] 6-hour window elapsed. Applying update automatically.")
                self.execute_git_pull()
        else:
            if state.get("update_available"):
                self.write_state(False, "", None)

    def run_loop(self):
        self.log(
            f"Updater worker active. Polling every {self.poll_interval}s.")
        while self.running:
            try:
                self.probe_remote()
            except Exception as e:
                self.log(f"[EXCEPTION] {e}")

            for _ in range(self.poll_interval):
                if not self.running:
                    break
                time.sleep(1)


def main():
    root = Path(__file__).resolve().parent.parent.parent
    worker = PrecisionUpdateWorker(root)
    worker.run_loop()


if __name__ == "__main__":
    main()
