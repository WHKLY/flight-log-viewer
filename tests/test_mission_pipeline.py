from __future__ import annotations

import struct
import unittest
from pathlib import Path
from uuid import uuid4

from scripts.build_mission_sources import build_sources
from scripts.extract_dataflash_series import DATAFLASH_HEADER, SERIES_GROUPS, extract_dataflash


def padded_ascii(value: str, width: int) -> bytes:
    return value.encode("ascii").ljust(width, b"\x00")


class DataFlashMissionExtractionTests(unittest.TestCase):
    def test_extracts_mise_from_log_fmt_schema(self) -> None:
        self.assertIn("MISE", SERIES_GROUPS["mission"])

        message_type = 92
        message_length = 46
        fmt_payload = struct.pack(
            "<BB4s16s64s",
            message_type,
            message_length,
            padded_ascii("MISE", 4),
            padded_ascii("QHHHffffLLfB", 16),
            padded_ascii("TimeUS,CTot,CNum,CId,Prm1,Prm2,Prm3,Prm4,Lat,Lng,Alt,Frame", 64),
        )
        mise_payload = struct.pack(
            "<QHHHffffiifB",
            650_933_923,
            15,
            10,
            16,
            0.0,
            0.0,
            0.0,
            0.0,
            459_242_486,
            1_264_484_598,
            25.0,
            3,
        )
        log_bytes = (
            DATAFLASH_HEADER
            + bytes([0x80])
            + fmt_payload
            + DATAFLASH_HEADER
            + bytes([message_type])
            + mise_payload
        )

        log_path = Path(__file__).with_name(f".mission-{uuid4().hex}.bin")
        try:
            log_path.write_bytes(log_bytes)
            rows, metadata = extract_dataflash(log_path)
        finally:
            log_path.unlink(missing_ok=True)

        self.assertEqual(metadata["target_counts"].get("MISE"), 1)
        self.assertEqual(len(rows["MISE"]), 1)
        self.assertEqual(rows["MISE"][0]["CNum"], 10)
        self.assertAlmostEqual(rows["MISE"][0]["time_s"], 650.933923)
        self.assertAlmostEqual(rows["MISE"][0]["Lat"], 45.9242486)


class MissionSourceTests(unittest.TestCase):
    def test_mise_events_are_distinct_from_cmd_route_snapshot(self) -> None:
        mission = {
            "source_file": "new.bin",
            "messages": {
                "CMD": [
                    {"time_s": 10.0, "CTot": 2, "CNum": 0, "CId": 16},
                    {"time_s": 10.1, "CTot": 2, "CNum": 1, "CId": 21},
                ],
                "MISE": [
                    {"time_s": 20.0, "CTot": 2, "CNum": 1, "CId": 21},
                ],
            },
        }

        onboard = next(source for source in build_sources({}, mission) if source["id"] == "onboard_cmd")

        self.assertEqual([item["seq"] for item in onboard["items"]], [0, 1])
        self.assertEqual([event["seq"] for event in onboard["events"]], [1])
        self.assertEqual(onboard["events"][0]["time_s"], 20.0)
        self.assertEqual(onboard["events"][0]["source"], "onboard_mise")

    def test_cmd_events_remain_as_legacy_fallback_without_mise(self) -> None:
        mission = {
            "source_file": "old.bin",
            "messages": {
                "CMD": [
                    {"time_s": 10.0, "CTot": 2, "CNum": 0, "CId": 16},
                    {"time_s": 30.0, "CTot": 2, "CNum": 1, "CId": 21},
                ],
            },
        }

        onboard = next(source for source in build_sources({}, mission) if source["id"] == "onboard_cmd")

        self.assertEqual([event["seq"] for event in onboard["events"]], [0, 1])
        self.assertEqual([event["time_s"] for event in onboard["events"]], [10.0, 30.0])
        self.assertTrue(all(event["source"] == "onboard_cmd" for event in onboard["events"]))


if __name__ == "__main__":
    unittest.main()
