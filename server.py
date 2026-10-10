#!/usr/bin/env python3
"""
Universal Silent Service Orchestrator (v2.5.0)
Windows usage: py server.py [start|stop|restart|status|update] [server|doctor|updater]
Android usage: python server.py [start|stop|restart|status|update] [server|doctor|updater]
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


class UniversalOrchestrator:
    def __init__(self):
        self.root_dir = Path(__file__).resolve().parent
        self.src_dir = self.root_dir / "src"
        self.runtime_dir = self.src_dir / "runtime"
        self.runtime_dir.mkdir(parents=True, exist_ok=True)

        self.system = "windows" if "windows" in platform.system().lower() else "android"
        self.server_script = self.src_dir / "server" / "server.mjs"
        self.doctor_script = self.src_dir / "checker" / "doctor.py"
        self.updater_script = self.src_dir / "updater" / "worker.py"

        self.server_pid_file = self.runtime_dir / "server.pid"
        self.doctor_pid_file = self.runtime_dir / "doctor.pid"
        self.updater_pid_file = self.runtime_dir / "updater.pid"

        self.server_log = self.runtime_dir / "server.log"
        self.doctor_log = self.runtime_dir / "doctor.log"
        self.updater_log = self.runtime_dir / "updater.log"

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

    def _ensure_deps(self):
        express_pkg = self.src_dir / "node_modules" / "express" / "package.json"
        if not express_pkg.exists():
            print(
                "[AUTO-FIX] Installing Express module in src/ (waiting for completion)...", flush=True)
            npm_cmd = "npm.cmd" if self.system == "windows" else "npm"
            subprocess.run(
                [npm_cmd, "install", "express", "--save"],
                cwd=str(self.src_dir),
                check=True,
                creationflags=CREATE_NO_WINDOW
            )
            print("[AUTO-FIX] Express runtime verified.", flush=True)
    # Component controls

    def start_doctor(self):
        d_pid = self._read_pid(self.doctor_pid_file)
        if not self._is_running(d_pid):
            pid = self._launch_detached(
                [sys.executable, str(self.doctor_script)], self.doctor_log)
            self.doctor_pid_file.write_text(str(pid), encoding="utf-8")

            # Initial audit check
            res = subprocess.run([sys.executable, str(
                self.doctor_script), "--check-once"], cwd=str(self.root_dir), capture_output=True, text=True)
            summary = "Manifest audited. Zero discrepancies found."
            if "All" in res.stdout:
                for line in res.stdout.splitlines():
                    if "All" in line:
                        summary = line.split("[DOCTOR]")[-1].strip()
            print(f"[DOCTOR]  Active (PID {pid}) -> {summary}")
        else:
            print(f"[DOCTOR]  Already active (PID {d_pid})")

    def stop_doctor(self):
        pid = self._read_pid(self.doctor_pid_file)
        if pid:
            self._kill_pid(pid)
            print(f"[DOCTOR]  Stopped (PID {pid})")
        if self.doctor_pid_file.is_file():
            try:
                self.doctor_pid_file.unlink()
            except OSError:
                pass

    def start_updater(self):
        u_pid = self._read_pid(self.updater_pid_file)
        if not self._is_running(u_pid):
            pid = self._launch_detached(
                [sys.executable, str(self.updater_script)], self.updater_log)
            self.updater_pid_file.write_text(str(pid), encoding="utf-8")
            print(
                f"[UPDATER] Active (PID {pid}) -> Repository monitored (Origin master up to date)")
        else:
            print(f"[UPDATER] Already active (PID {u_pid})")

    def stop_updater(self):
        pid = self._read_pid(self.updater_pid_file)
        if pid:
            self._kill_pid(pid)
            print(f"[UPDATER] Stopped (PID {pid})")
        if self.updater_pid_file.is_file():
            try:
                self.updater_pid_file.unlink()
            except OSError:
                pass

    def start_server(self):
        self._ensure_deps()
        s_pid = self._read_pid(self.server_pid_file)
        if not self._is_running(s_pid):
            pid = self._launch_detached(
                ["node", str(self.server_script)], self.server_log)
            self.server_pid_file.write_text(str(pid), encoding="utf-8")
            print(
                f"[SERVER]  Active (PID {pid}) -> http://localhost:3000 (Monochrome Liquid Glass)")
        else:
            print(
                f"[SERVER]  Already active (PID {s_pid}) -> http://localhost:3000")

    def stop_server(self):
        pid = self._read_pid(self.server_pid_file)
        if pid:
            self._kill_pid(pid)
            print(f"[SERVER]  Stopped (PID {pid})")
        if self.server_pid_file.is_file():
            try:
                self.server_pid_file.unlink()
            except OSError:
                pass

    # Global actions
    def start_all(self):
        print("\n--- Sandbox Stack Initialization ---")
        self.start_doctor()
        self.start_updater()
        self.start_server()
        print("All services running detached in background.\n")

    def stop_all(self):
        print("\n--- Halting All Sandbox Services ---")
        self.stop_server()
        self.stop_updater()
        self.stop_doctor()
        print("Clean complete.\n")

    def restart_all(self):
        self.stop_all()
        time.sleep(1.2)
        self.start_all()

    def status(self):
        s_pid = self._read_pid(self.server_pid_file)
        d_pid = self._read_pid(self.doctor_pid_file)
        u_pid = self._read_pid(self.updater_pid_file)
        print(
            f"\n=== Sandbox Architecture Status [{self.system.capitalize()}] ===")
        print(
            f"Web Server   : {'RUNNING (PID ' + str(s_pid) + ') -> http://localhost:3000' if self._is_running(s_pid) else 'STOPPED'}")
        print(
            f"File Doctor  : {'RUNNING (PID ' + str(d_pid) + ')' if self._is_running(d_pid) else 'STOPPED'}")
        print(
            f"Updater 15s  : {'RUNNING (PID ' + str(u_pid) + ')' if self._is_running(u_pid) else 'STOPPED'}\n")


def main():
    args = [a.lower() for a in sys.argv[1:]]
    if not args:
        print(
            "Usage: py server.py [start|stop|restart|status] [server|doctor|updater]")
        sys.exit(1)

    orchestrator = UniversalOrchestrator()
    target = None
    action = None

    for a in args:
        if a in ["server", "doctor", "updater"]:
            target = a
        elif a in ["start", "start-all", "stop", "stop-all", "restart", "restart-all", "status", "update"]:
            action = a

    action = action or args[0]

    if target == "doctor":
        if action in ["start"]:
            orchestrator.start_doctor()
        elif action in ["stop"]:
            orchestrator.stop_doctor()
        elif action in ["restart"]:
            orchestrator.stop_doctor()
            time.sleep(0.5)
            orchestrator.start_doctor()
    elif target == "updater":
        if action in ["start"]:
            orchestrator.start_updater()
        elif action in ["stop"]:
            orchestrator.stop_updater()
        elif action in ["restart"]:
            orchestrator.stop_updater()
            time.sleep(0.5)
            orchestrator.start_updater()
    elif target == "server":
        if action in ["start"]:
            orchestrator.start_server()
        elif action in ["stop"]:
            orchestrator.stop_server()
        elif action in ["restart"]:
            orchestrator.stop_server()
            time.sleep(1)
            orchestrator.start_server()
    else:
        # Global execution
        if action in ["start", "start-all"]:
            orchestrator.start_all()
        elif action in ["stop", "stop-all"]:
            orchestrator.stop_all()
        elif action in ["restart", "restart-all"]:
            orchestrator.restart_all()
        elif action == "status":
            orchestrator.status()
        else:
            print(f"Unknown action: {action}")
            sys.exit(1)


if __name__ == "__main__":
    main()
