#!/usr/bin/env python3
"""
Universal Service Orchestrator (v2.4.0)
Decouples services so Doctor and Updater run as persistent daemons.
Usage:
  py server.py start          -> Ensures all services running
  py server.py restart        -> Restarts ONLY the Web Server (Daemons stay alive)
  py server.py restart-all    -> Restarts Web Server, Doctor, and Updater
  py server.py stop           -> Stops ONLY the Web Server
  py server.py stop-all       -> Stops all services
  py server.py status         -> Checks all services
  py server.py update         -> Executes safe automated git pull
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
        self.worker_script = self.src_dir / "updater" / "worker.py"
        self.doctor_script = self.src_dir / "checker" / "doctor.py"

        self.server_pid_file = self.runtime_dir / "server.pid"
        self.updater_pid_file = self.runtime_dir / "updater.pid"
        self.doctor_pid_file = self.runtime_dir / "doctor.pid"

        self.server_log = self.runtime_dir / "server.log"
        self.updater_log = self.runtime_dir / "updater.log"
        self.doctor_log = self.runtime_dir / "doctor.log"

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

    def start_server_only(self):
        s_pid = self._read_pid(self.server_pid_file)
        if not self._is_running(s_pid):
            pid = self._launch_detached(["node", str(self.server_script)], self.server_log)
            self.server_pid_file.write_text(str(pid), encoding="utf-8")
            print(f"[START] Web Server active (PID: {pid}).", flush=True)

    def stop_server_only(self):
        s_pid = self._read_pid(self.server_pid_file)
        if s_pid:
            self._kill_pid(s_pid)
            print(f"[STOP] Web Server stopped (PID: {s_pid}).", flush=True)
        if self.server_pid_file.is_file():
            try: self.server_pid_file.unlink()
            except OSError: pass

    def start(self):
        # 1. Start Persistent File Doctor if not running
        d_pid = self._read_pid(self.doctor_pid_file)
        if not self._is_running(d_pid):
            pid = self._launch_detached([sys.executable, str(self.doctor_script)], self.doctor_log)
            self.doctor_pid_file.write_text(str(pid), encoding="utf-8")
            print(f"[START] File Doctor active (PID: {pid}).", flush=True)

        # 2. Start Persistent Updater if not running
        u_pid = self._read_pid(self.updater_pid_file)
        if not self._is_running(u_pid):
            pid = self._launch_detached([sys.executable, str(self.worker_script)], self.updater_log)
            self.updater_pid_file.write_text(str(pid), encoding="utf-8")
            print(f"[START] Updater Daemon active (PID: {pid}).", flush=True)

        # 3. Start Web Server
        self.start_server_only()

        print("\n---------------------------------------------------------")
        print(" Platform URL: http://localhost:3000")
        print(" Daemons running persistently. Logs in src/runtime/")
        print("---------------------------------------------------------\n", flush=True)

    def restart(self):
        """Restarts ONLY the Web Server. Persistent Daemons stay alive!"""
        print("[RESTART] Cycling Web Server (Persistent daemons remain active)...", flush=True)
        self.stop_server_only()
        time.sleep(1.2)
        self.start_server_only()
        print("[SUCCESS] Web Server restarted successfully.", flush=True)

    def stop(self):
        self.stop_server_only()

    def stop_all(self):
        print("[STOP-ALL] Halting all services and daemons...", flush=True)
        for pid_file, name in [(self.doctor_pid_file, "Doctor"), (self.updater_pid_file, "Updater"), (self.server_pid_file, "Web Server")]:
            pid = self._read_pid(pid_file)
            if pid:
                self._kill_pid(pid)
                print(f"[STOP] {name} stopped (PID: {pid}).", flush=True)
            if pid_file.is_file():
                try: pid_file.unlink()
                except OSError: pass
        print("[CLEAN] All services stopped.", flush=True)

    def status(self):
        s_pid = self._read_pid(self.server_pid_file)
        u_pid = self._read_pid(self.updater_pid_file)
        d_pid = self._read_pid(self.doctor_pid_file)
        print(f"=== Platform Status [{self.system.capitalize()}] ===")
        print(f"Web Server   : {'RUNNING (PID: ' + str(s_pid) + ') -> http://localhost:3000' if self._is_running(s_pid) else 'STOPPED'}")
        print(f"Updater 15s  : {'RUNNING (PID: ' + str(u_pid) + ') [PERSISTENT]' if self._is_running(u_pid) else 'STOPPED'}")
        print(f"File Doctor  : {'RUNNING (PID: ' + str(d_pid) + ') [PERSISTENT]' if self._is_running(d_pid) else 'STOPPED'}")

    def force_update(self):
        print("[FORCE UPDATE] Performing automated self-healing git pull...", flush=True)
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
        print("Usage: py server.py [start|stop|stop-all|restart|restart-all|status|update]")
        sys.exit(1)

    manager = UniversalServerManager(target_platform=target_platform)
    if action == "start": manager.start()
    elif action == "stop": manager.stop()
    elif action == "stop-all": manager.stop_all()
    elif action == "restart": manager.restart()
    elif action == "restart-all":
        manager.stop_all()
        time.sleep(1.2)
        manager.start()
    elif action == "status": manager.status()
    elif action == "update": manager.force_update()
    else:
        print(f"Unknown action: {action}")
        sys.exit(1)


if __name__ == "__main__":
    main()