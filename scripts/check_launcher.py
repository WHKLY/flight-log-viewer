"""Launcher regressions; all builds and servers use an isolated checkout."""

from __future__ import annotations

import importlib.util
import json
from pathlib import Path
from queue import Queue
import shutil
import socket
import subprocess
import sys
import tempfile
from threading import Thread
import unittest
from unittest.mock import patch
from urllib.request import urlopen

PROJECT_ROOT = Path(__file__).resolve().parents[1]


class LauncherChecks(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="flv-launcher-")
        self.addCleanup(self.temporary.cleanup)
        self.base = Path(self.temporary.name)
        self.root = self.base / "relocated project with spaces"
        self.root.mkdir()
        for name in ("start.py", "start.bash", "start.cmd"):
            shutil.copy2(PROJECT_ROOT / name, self.root / name)
        shutil.copytree(PROJECT_ROOT / "scripts", self.root / "scripts", ignore=shutil.ignore_patterns("__pycache__"))
        (self.root / "viewer").mkdir()
        (self.root / "viewer" / "index.html").write_text("<html>isolated viewer</html>")
        self.output = self.root / "public-data"
        self.output.mkdir()
        (self.output / "dataset-summary.json").write_text('{"previous": true}')
        self.domains = self.output / "domains"
        self.domains.mkdir()
        for name in ("mission.json", "current_tasks.json"):
            (self.domains / name).write_text('{"stale": true}')
        self.dataset = self.root / "data" / "flight with spaces"
        self.dataset.mkdir(parents=True)
        (self.dataset / "route.waypoints").write_text(
            "QGC WPL 110\n0\t1\t3\t16\t0\t0\t0\t0\t30\t120\t50\t1\n"
        )
        spec = importlib.util.spec_from_file_location("launcher_under_test", self.root / "start.py")
        self.launcher = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.launcher)

    def test_complete_build_and_stale_domain_retirement(self):
        self.launcher.build_dataset(self.root, self.dataset)
        summary = json.loads((self.output / "dataset-summary.json").read_text())
        self.assertEqual(Path(summary["dataset"]), self.dataset)
        self.assertTrue((self.output / "log-inspection.json").is_file())
        self.assertTrue((self.output / "series" / "manifest.json").is_file())
        mission = json.loads((self.output / "series" / "mission-sources.json").read_text())
        self.assertTrue(mission["sources"])
        self.assertFalse((self.domains / "mission.json").exists())
        self.assertFalse((self.domains / "current_tasks.json").exists())

    def test_build_failure_preserves_previous_data(self):
        error = subprocess.CalledProcessError(1, "generator")
        with patch.object(self.launcher.subprocess, "run", side_effect=error):
            with self.assertRaises(subprocess.CalledProcessError):
                self.launcher.build_dataset(self.root, self.dataset)
        self.assertEqual(json.loads((self.output / "dataset-summary.json").read_text()), {"previous": True})
        self.assertTrue((self.domains / "mission.json").is_file())
        self.assertFalse(list(self.output.glob(".build-*")))

    def run_server(self, command, arguments):
        process = subprocess.Popen(
            [*command, *arguments, "--port", "0"], cwd=self.base,
            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
        )
        lines = Queue()
        reader = Thread(target=lambda: [lines.put(line) for line in process.stdout], daemon=True)
        reader.start()
        try:
            while True:
                line = lines.get(timeout=30)
                if line.startswith("Viewer: "):
                    with urlopen(line.removeprefix("Viewer: ").strip(), timeout=5) as response:
                        self.assertIn(b"isolated viewer", response.read())
                    break
                if process.poll() is not None:
                    self.fail(f"launcher exited before serving: {line}")
        finally:
            process.terminate()
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
            reader.join(timeout=5)
            process.stdout.close()

    def test_relative_dataset_from_another_working_directory(self):
        self.run_server([sys.executable, str(self.root / "start.py")], ["--dataset", "data/flight with spaces"])
        summary = json.loads((self.output / "dataset-summary.json").read_text())
        self.assertEqual(Path(summary["dataset"]), self.dataset)

    def test_skip_build_and_bash_wrapper(self):
        commands = [[sys.executable, str(self.root / "start.py")]]
        if shutil.which("bash"):
            commands.append(["bash", str(self.root / "start.bash")])
        for command in commands:
            with self.subTest(command=command[0]):
                self.run_server(command, ["--skip-build"])
                self.assertTrue((self.domains / "mission.json").is_file())
                self.assertTrue(json.loads((self.output / "dataset-summary.json").read_text())["previous"])

    def test_invalid_arguments_and_occupied_port(self):
        command = [sys.executable, str(self.root / "start.py")]
        for args in ([], ["--port", "-1"], ["--dataset", "missing"]):
            result = subprocess.run([*command, *args], cwd=self.base, capture_output=True, timeout=10)
            self.assertEqual(result.returncode, 2)
        with socket.socket() as listener:
            listener.bind(("127.0.0.1", 0))
            listener.listen()
            result = subprocess.run(
                [*command, "--dataset", str(self.dataset), "--port", str(listener.getsockname()[1])],
                cwd=self.base, capture_output=True, timeout=10,
            )
            self.assertEqual(result.returncode, 1)
            self.assertTrue(json.loads((self.output / "dataset-summary.json").read_text())["previous"])


if __name__ == "__main__":
    unittest.main()
