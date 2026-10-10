#!/usr/bin/env python3
"""
Universal Service Orchestrator (v2.4.0 Baseline)
Supervises web server and future daemons.
Usage:
  py server.py start
  py server.py stop
  py server.py restart
  py server.py status
  py server.py update
"""

import os
import platform
import signal
import subprocess
import sys
import time
from pathlib import Path

CREATE_NO_WINDOW = 0x08000000 if platform.system().lower() == "windows" else 0
DETACHED_PROCESS = 0x00000008 if platform.system().lower() == "windows" else 0
NEW_PROCESS_GROUP = 0x00000200 if platform.system().lower() == "windows" else 0


class UniversalServerManager:
    def __init__(self, target_platform=None):
        self.root_dir = Path(__file__).resolve().parent
        self.src_dir = self.root_dir / "src"
        self.runtime_dir = self.src_dir / "runtime"
        self.runtime_dir.mkdir(parents=True, exist_ok=True)

        self.system = target_platform or ("windows" if "windows" in platform.system().lower() else "android")
        self.server_script = self.src_dir / "server" / "server.mjs"
        self.server_pid_file = self.runtime_dir / "server.pid"
        self.server_log = self.runtime_dir / "server.log"

    def _read_pid(self, pid_file: Path):
        if pid_file.is_file():
            try:
                return int(pid_file.read_text(encoding="utf-8").strip())
            except (ValueError, OSError):
                return None
        return None

    def _is_running(self, pid: int) -> bool:
        if not pid or pid <= 0:
            return False
        try:
            if self.system == "windows":
                output = subprocess.check_output(
                    f'tasklist /FI "PID eq {pid}" /NH',
                    shell=True,
                    text=True,
                    creationflags=CREATE_NO_WINDOW
                )
                return str(pid) in output
            else:
                os.kill(pid, 0)
                return True
        except (OSError, subprocess.SubprocessError):
            return False

    def _kill_pid(self, pid: int):
        if not pid or not self._is_running(pid):
            return
        try:
            if self.system == "windows":
                subprocess.run(
                    f"taskkill /T /F /PID {pid}",
                    shell=True,
                    check=False,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    creationflags=CREATE_NO_WINDOW
                )
            else:
                os.kill(pid, signal.SIGTERM)
        except Exception:
            pass

    def _ensure_dependencies(self):
        node_modules = self.src_dir / "node_modules" / "express"
        if not node_modules.exists():
            print("[AUTO-FIX] Installing Express module in src/...", flush=True)
            npm_cmd = "npm.cmd" if self.system == "windows" else "npm"
            subprocess.run(
                [npm_cmd, "install", "express", "--silent"],
                cwd=str(self.src_dir),
                check=False,
                creationflags=CREATE_NO_WINDOW
            )

    def _launch_detached(self, cmd: list, log_path: Path) -> int:
        log_file = open(log_path, "a", encoding="utf-8")
        if self.system == "windows":
            proc = subprocess.Popen(
                cmd,
                cwd=str(self.root_dir),
                stdout=log_file,
                stderr=log_file,
                stdin=subprocess.DEVNULL,
                creationflags=DETACHED_PROCESS | CREATE_NO_WINDOW | NEW_PROCESS_GROUP,
            )
        else:
            proc = subprocess.Popen(
                cmd,
                cwd=str(self.root_dir),
                stdout=log_file,
                stderr=log_file,
                stdin=subprocess.DEVNULL,
                start_new_session=True,
            )
        return proc.pid

    def start(self):
        self._ensure_dependencies()
        s_pid = self._read_pid(self.server_pid_file)
        if not self._is_running(s_pid):
            pid = self._launch_detached(["node", str(self.server_script)], self.server_log)
            self.server_pid_file.write_text(str(pid), encoding="utf-8")
            print(f"[START] Web Server active (PID: {pid}).", flush=True)
        else:
            print(f"[STATUS] Web Server already running (PID: {s_pid}).", flush=True)

        print("\n---------------------------------------------------------")
        print(" Platform URL: http://localhost:3000")
        print(" Logs directory: src/runtime/server.log")
        print("---------------------------------------------------------\n", flush=True)

    def stop(self):
        s_pid = self._read_pid(self.server_pid_file)
        if s_pid:
            self._kill_pid(s_pid)
            print(f"[STOP] Web Server stopped (PID: {s_pid}).", flush=True)
        if self.server_pid_file.is_file():
            try:
                self.server_pid_file.unlink()
            except OSError:
                pass
        print("[CLEAN] Processes stopped.", flush=True)

    def restart(self):
        print("[RESTART] Cycling Web Server...", flush=True)
        self.stop()
        time.sleep(1.2)
        self.start()

    def status(self):
        s_pid = self._read_pid(self.server_pid_file)
        is_live = self._is_running(s_pid)
        print(f"=== Platform Status [{self.system.capitalize()}] ===")
        print(f"Web Server : {'RUNNING (PID: ' + str(s_pid) + ') -> http://localhost:3000' if is_live else 'STOPPED'}")

    def force_update(self):
        print("[FORCE UPDATE] Performing automated clean git pull...", flush=True)
        subprocess.run(["git", "fetch", "origin", "master"], cwd=str(self.root_dir), check=False)
        res = subprocess.run(["git", "reset", "--hard", "origin/master"], cwd=str(self.root_dir), text=True, capture_output=True)
        if res.returncode == 0:
            print("[SUCCESS] Code updated cleanly to origin/master:", flush=True)
            print(res.stdout.strip())
            self.restart()
        else:
            print(f"[ERROR] Update failed: {res.stderr.strip()}", flush=True)


def main():
    args = sys.argv[1:]
    target_platform = None
    if len(args) >= 2 and args[0].lower() in ["android", "windows"]:
        target_platform = args[0].lower()
        action = args[1].lower()
    elif len(args) >= 1:
        action = args[0].lower()
    else:
        print("Usage: py server.py [windows|android] {start|stop|restart|status|update}")
        sys.exit(1)

    manager = UniversalServerManager(target_platform=target_platform)
    if action == "start": manager.start()
    elif action == "stop": manager.stop()
    elif action == "restart": manager.restart()
    elif action == "status": manager.status()
    elif action == "update": manager.force_update()
    else:
        print(f"Unknown action: {action}")
        sys.exit(1)


if __name__ == "__main__":
    main()