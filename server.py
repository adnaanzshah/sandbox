#!/usr/bin/env python3
"""
Universal Silent Process Supervisor & Force Updater
Windows usage:  py server.py [start|stop|status|restart|update]
Android usage:  python server.py [start|stop|status|restart|update]
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
        self.src_dir = self.root_dir / "src"
        self.runtime_dir = self.src_dir / "runtime"
        self.runtime_dir.mkdir(parents=True, exist_ok=True)

        self.system = target_platform or self._detect_platform()
        self.server_script = self.src_dir / "server" / "server.mjs"
        self.worker_script = self.src_dir / "updater" / "worker.py"

        self.server_pid_file = self.runtime_dir / "server.pid"
        self.updater_pid_file = self.runtime_dir / "updater.pid"
        self.server_log = self.runtime_dir / "server.log"
        self.updater_log = self.runtime_dir / "updater.log"

    def _detect_platform(self):
        return "windows" if "windows" in platform.system().lower() else "android"

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
        root_modules = self.root_dir / "node_modules" / "express"

        if not node_modules.exists() and not root_modules.exists():
            print("[AUTO-FIX] Installing Express module...")
            npm_cmd = "npm.cmd" if self.system == "windows" else "npm"
            subprocess.run(
                [npm_cmd, "install", "express", "--silent"],
                cwd=str(self.src_dir),
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

        s_pid = self._read_pid(self.server_pid_file)
        if self._is_running(s_pid):
            print(f"[STATUS] Web Server already running (PID: {s_pid}).")
        else:
            print(f"[START] Launching Web Server on {self.system.capitalize()}...")
            s_log = open(self.server_log, "a", encoding="utf-8")
            cmd = ["node", str(self.server_script)]

            if self.system == "windows":
                node_proc = subprocess.Popen(
                    cmd,
                    cwd=str(self.root_dir),
                    stdout=s_log,
                    stderr=s_log,
                    stdin=subprocess.DEVNULL,
                    creationflags=DETACHED_PROCESS | CREATE_NO_WINDOW,
                )
            else:
                node_proc = subprocess.Popen(
                    cmd,
                    cwd=str(self.root_dir),
                    stdout=s_log,
                    stderr=s_log,
                    stdin=subprocess.DEVNULL,
                    start_new_session=True,
                )
            self.server_pid_file.write_text(str(node_proc.pid), encoding="utf-8")
            print(f"[SUCCESS] Web Server started (PID: {node_proc.pid}).")

        u_pid = self._read_pid(self.updater_pid_file)
        if self._is_running(u_pid):
            print(f"[STATUS] Updater Daemon already running (PID: {u_pid}).")
        else:
            print("[START] Launching Linked Updater Daemon...")
            u_log = open(self.updater_log, "a", encoding="utf-8")
            cmd = [sys.executable, str(self.worker_script)]

            if self.system == "windows":
                py_proc = subprocess.Popen(
                    cmd,
                    cwd=str(self.root_dir),
                    stdout=u_log,
                    stderr=u_log,
                    stdin=subprocess.DEVNULL,
                    creationflags=DETACHED_PROCESS | CREATE_NO_WINDOW,
                )
            else:
                py_proc = subprocess.Popen(
                    cmd,
                    cwd=str(self.root_dir),
                    stdout=u_log,
                    stderr=u_log,
                    stdin=subprocess.DEVNULL,
                    start_new_session=True,
                )
            self.updater_pid_file.write_text(str(py_proc.pid), encoding="utf-8")
            print(f"[SUCCESS] Updater Daemon started (PID: {py_proc.pid}).")

        print("\n---------------------------------------------------------")
        print(" Platform URL: http://localhost:3000")
        print(" Runtime logs: src/runtime/")
        print("---------------------------------------------------------\n")

    def stop(self):
        print(f"[STOP] Halting services on {self.system.capitalize()}...")

        u_pid = self._read_pid(self.updater_pid_file)
        if u_pid:
            self._kill_pid(u_pid)
            print(f"[STOP] Updater Daemon stopped (PID: {u_pid}).")
        if self.updater_pid_file.is_file():
            self.updater_pid_file.unlink()

        s_pid = self._read_pid(self.server_pid_file)
        if s_pid:
            self._kill_pid(s_pid)
            print(f"[STOP] Web Server stopped (PID: {s_pid}).")
        if self.server_pid_file.is_file():
            self.server_pid_file.unlink()

        self._release_wake_lock()
        print("[CLEAN] All processes stopped.")

    def status(self):
        s_pid = self._read_pid(self.server_pid_file)
        u_pid = self._read_pid(self.updater_pid_file)

        print(f"=== Platform Status [{self.system.capitalize()}] ===")
        print(f"Web Server   : {'RUNNING (PID: ' + str(s_pid) + ') -> http://localhost:3000' if self._is_running(s_pid) else 'STOPPED'}")
        print(f"Updater 15s  : {'RUNNING (PID: ' + str(u_pid) + ')' if self._is_running(u_pid) else 'STOPPED'}")

    def force_update(self):
        print("[FORCE UPDATE] Performing clean remote fast-forward pull...")
        subprocess.run(["git", "checkout", "--", "src/runtime/"], cwd=str(self.root_dir), check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        res = subprocess.run(["git", "pull", "--ff-only", "origin", "master"], cwd=str(self.root_dir), text=True, capture_output=True)
        if res.returncode == 0:
            print("[SUCCESS] Platform pulled latest code:")
            print(res.stdout.strip())
            print("[RESTARTING] Reloading background services...")
            self.stop()
            time.sleep(1)
            self.start()
        else:
            print(f"[ERROR] Force update failed: {res.stderr.strip()}")


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
    elif action == "update":
        manager.force_update()
    else:
        print(f"Unknown action: {action}")
        sys.exit(1)


if __name__ == "__main__":
    main()