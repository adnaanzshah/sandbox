#!/usr/bin/env python3
"""
Universal Silent Process Manager
Usage:
    python server.py start
    python server.py stop
    python server.py status
    python server.py restart
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


class UniversalServerManager:
    def __init__(self, target_platform=None):
        self.root_dir = Path(__file__).resolve().parent
        self.system = target_platform or self._detect_platform()
        self.server_pid_file = self.root_dir / ".server.pid"
        self.updater_pid_file = self.root_dir / "updater" / ".updater.pid"
        self.server_log = self.root_dir / "server.log"
        self.updater_log = self.root_dir / "updater" / "updater.log"

    def _detect_platform(self):
        system = platform.system().lower()
        if "windows" in system:
            return "windows"
        return "android"

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

    def _ensure_dependencies(self):
        node_modules = self.root_dir / "node_modules" / "express"
        if not node_modules.exists():
            print("[AUTO-FIX] Installing Express module...")
            npm_cmd = "npm.cmd" if self.system == "windows" else "npm"
            subprocess.run(
                [npm_cmd, "install", "express", "--silent"],
                cwd=str(self.root_dir),
                check=False,
                creationflags=CREATE_NO_WINDOW
            )

    def _acquire_wake_lock(self):
        if self.system == "android":
            try:
                subprocess.run(["termux-wake-lock"], check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            except Exception:
                pass

    def _release_wake_lock(self):
        if self.system == "android":
            try:
                subprocess.run(["termux-wake-unlock"], check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            except Exception:
                pass

    def start(self):
        self._ensure_dependencies()
        self._acquire_wake_lock()

        # 1. Start Server
        s_pid = self._read_pid(self.server_pid_file)
        if self._is_running(s_pid):
            print(f"[STATUS] Server already running (PID: {s_pid}).")
        else:
            print(f"[START] Launching Server on {self.system.capitalize()}...")
            s_log = open(self.server_log, "a", encoding="utf-8")
            if self.system == "windows":
                node_proc = subprocess.Popen(
                    ["node", "server.mjs"],
                    cwd=str(self.root_dir),
                    stdout=s_log,
                    stderr=s_log,
                    stdin=subprocess.DEVNULL,
                    creationflags=DETACHED_PROCESS | CREATE_NO_WINDOW,
                )
            else:
                node_proc = subprocess.Popen(
                    ["node", "server.mjs"],
                    cwd=str(self.root_dir),
                    stdout=s_log,
                    stderr=s_log,
                    stdin=subprocess.DEVNULL,
                    start_new_session=True,
                )
            self.server_pid_file.write_text(str(node_proc.pid), encoding="utf-8")
            print(f"[SUCCESS] Server active (PID: {node_proc.pid}).")

        # 2. Start Updater
        u_pid = self._read_pid(self.updater_pid_file)
        if self._is_running(u_pid):
            print(f"[STATUS] Updater already running (PID: {u_pid}).")
        else:
            print("[START] Launching 15s Updater Daemon silently...")
            worker_script = self.root_dir / "updater" / "worker.py"
            (self.root_dir / "updater").mkdir(parents=True, exist_ok=True)
            u_log = open(self.updater_log, "a", encoding="utf-8")

            if self.system == "windows":
                py_proc = subprocess.Popen(
                    [sys.executable, str(worker_script)],
                    cwd=str(self.root_dir),
                    stdout=u_log,
                    stderr=u_log,
                    stdin=subprocess.DEVNULL,
                    creationflags=DETACHED_PROCESS | CREATE_NO_WINDOW,
                )
            else:
                py_proc = subprocess.Popen(
                    [sys.executable, str(worker_script)],
                    cwd=str(self.root_dir),
                    stdout=u_log,
                    stderr=u_log,
                    stdin=subprocess.DEVNULL,
                    start_new_session=True,
                )
            self.updater_pid_file.write_text(str(py_proc.pid), encoding="utf-8")
            print(f"[SUCCESS] Updater active (PID: {py_proc.pid}).")

        print("\n---------------------------------------------------------")
        print(" Platform URL: http://localhost:3000")
        print(" Terminal freed. Background tasks detached.")
        print("---------------------------------------------------------\n")

    def stop(self):
        print(f"[STOP] Halting services on {self.system.capitalize()}...")
        u_pid = self._read_pid(self.updater_pid_file)
        if self._is_running(u_pid):
            try:
                if self.system == "windows":
                    subprocess.run(f"taskkill /F /PID {u_pid}", shell=True, check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, creationflags=CREATE_NO_WINDOW)
                else:
                    os.kill(u_pid, signal.SIGTERM)
                print(f"[STOP] Updater halted (PID: {u_pid}).")
            except Exception:
                pass
        if self.updater_pid_file.is_file():
            self.updater_pid_file.unlink()

        s_pid = self._read_pid(self.server_pid_file)
        if self._is_running(s_pid):
            try:
                if self.system == "windows":
                    subprocess.run(f"taskkill /F /PID {s_pid}", shell=True, check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, creationflags=CREATE_NO_WINDOW)
                else:
                    os.kill(s_pid, signal.SIGTERM)
                print(f"[STOP] Server halted (PID: {s_pid}).")
            except Exception:
                pass
        if self.server_pid_file.is_file():
            self.server_pid_file.unlink()

        self._release_wake_lock()
        print("[CLEAN] All processes terminated.")

    def status(self):
        s_pid = self._read_pid(self.server_pid_file)
        u_pid = self._read_pid(self.updater_pid_file)
        print(f"=== System Runtime Status [{self.system.capitalize()}] ===")
        print(f"Server      : {'RUNNING (PID: ' + str(s_pid) + ') -> http://localhost:3000' if self._is_running(s_pid) else 'STOPPED'}")
        print(f"Updater 15s : {'RUNNING (PID: ' + str(u_pid) + ')' if self._is_running(u_pid) else 'STOPPED'}")


def main():
    args = sys.argv[1:]
    target_platform = None
    if len(args) >= 2 and args[0].lower() in ["android", "windows"]:
        target_platform = args[0].lower()
        action = args[1].lower()
    elif len(args) >= 1:
        action = args[0].lower()
    else:
        print("Usage: python server.py [android|windows] {start|stop|restart|status}")
        sys.exit(1)

    manager = UniversalServerManager(target_platform=target_platform)
    if action == "start":
        manager.start()
    elif action == "stop":
        manager.stop()
    elif action == "restart":
        manager.stop()
        time.sleep(1)
        manager.start()
    elif action == "status":
        manager.status()
    else:
        print(f"Unknown action: {action}")
        sys.exit(1)


if __name__ == "__main__":
    main()