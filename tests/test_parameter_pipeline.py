from __future__ import annotations

import struct
import tempfile
import unittest
from pathlib import Path

from scripts.build_parameters import build_parameter_domain, tlog_sources
from scripts.mavlink_frames import MAVLINK_CRC_EXTRA, iter_mavlink_frames, x25_crc


def mavlink1_frame(message_id: int, payload: bytes, *, sequence: int = 0, system_id: int = 1, component_id: int = 1) -> bytes:
    header = bytes([len(payload), sequence, system_id, component_id, message_id])
    checksum = x25_crc(header + payload + bytes([MAVLINK_CRC_EXTRA[message_id]]))
    return b"\xfe" + header + payload + struct.pack("<H", checksum)


def param_value(name: str, value: float, count: int, index: int, *, sequence: int) -> bytes:
    payload = struct.pack("<fHH16sB", value, count, index, name.encode("ascii").ljust(16, b"\0"), 9)
    timestamp = (1_800_000_000_000_000 + sequence * 250_000).to_bytes(8, "big")
    return timestamp + mavlink1_frame(22, payload, sequence=sequence)


class ParameterPipelineTests(unittest.TestCase):
    def test_tlog_param_value_stream_has_source_identity_and_completeness(self) -> None:
        with tempfile.TemporaryDirectory(prefix=".flv-params-", dir=Path(__file__).parent) as temporary:
            root = Path(temporary)
            log = root / "flight.tlog"
            log.write_bytes(
                param_value("AIRSPEED_MIN", 12.0, 2, 0, sequence=3)
                + param_value("TECS_TKOFF_IGAIN", 0.25, 2, 1, sequence=4)
            )

            frames = list(iter_mavlink_frames(log, {22}))
            sources = tlog_sources(log, root)

        self.assertEqual(len(frames), 2)
        self.assertEqual(frames[1]["system_id"], 1)
        self.assertAlmostEqual(frames[1]["tlog_time_s"], 0.25)
        self.assertEqual(len(sources), 1)
        self.assertEqual(sources[0]["values"]["AIRSPEED_MIN"], "12")
        self.assertEqual(sources[0]["values"]["TECS_TKOFF_IGAIN"], "0.25")
        self.assertTrue(sources[0]["quality"]["complete"])
        self.assertEqual(sources[0]["quality"]["message_counts"], {"PARAM_VALUE": 2})

    def test_domain_keeps_param_and_tlog_as_switchable_sources(self) -> None:
        with tempfile.TemporaryDirectory(prefix=".flv-domain-", dir=Path(__file__).parent) as temporary:
            root = Path(temporary)
            (root / "saved.param").write_text("AIRSPEED_MIN,11\n", encoding="utf-8")
            (root / "flight.tlog").write_bytes(param_value("AIRSPEED_MIN", 12.0, 1, 0, sequence=1))

            domain = build_parameter_domain(root)

        self.assertEqual([source["kind"] for source in domain["sources"]], ["tlog", "param_file"])
        self.assertEqual(domain["recommended_source_id"], "param_file:saved.param")
        self.assertEqual(domain["counts"]["sources"], 2)


if __name__ == "__main__":
    unittest.main()
