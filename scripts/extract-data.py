#!/usr/bin/env python3
"""Reproducibly extract every original bb_data_* / bb_leveldata_* literal.

Input is FFDec's autoDeobfuscate+simplifyExpressions export, never the damaged
default export (which incorrectly renders some arrays as null). No game code is
executed: a strict JSON-compatible literal parser reads assignments only.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NORMAL_HASH = "8c518cfe4b0077bff3f1ed8f4c67627b63c4c5a8df6c3044f6ab019b234595a1"
UNIT_FIELDS = ["cost", "buildFactor", "speed", "health", "damage", "targets",
               "dependency", "people", "hitRadius", "hitOffset"]
BUILDING_FIELDS = ["cost", "buildFactor", "dependency", "maximum"]
FONT_FIELDS = ["code", "advance", "width", "height", "x", "y", "offsetX", "offsetY"]
FRAME_FIELDS = ["id", "width", "height", "x", "y", "handleX", "handleY"]


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def line_at(source: str, position: int) -> int:
    return source.count("\n", 0, position) + 1


def literal_end(source: str, start: int) -> int:
    """Find semicolon without treating quoted semicolons/brackets as syntax."""
    quote = None
    escaped = False
    depth = 0
    for pos in range(start, len(source)):
        char = source[pos]
        if quote:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == quote:
                quote = None
        elif char in "\"'":
            quote = char
        elif char in "[{(":
            depth += 1
        elif char in "]})":
            depth -= 1
        elif char == ";" and depth == 0:
            return pos
    raise ValueError("Unterminated data literal")


def parse_literal(value: str):
    # FFDec escapes apostrophes even inside double-quoted strings; JSON does not.
    value = value.replace("\\'", "'")
    return json.loads(value)


def extract_raw(source: str):
    start = source.index("function bb_Init():void")
    init = source[start:source.index("\nvar META_DATA", start)]
    assert "§§" not in init, "Use autoDeobfuscate=true,simplifyExpressions=true"
    declarations = set(re.findall(r"^var (bb_(?:data_\w+|leveldata_level\d+)):", source, re.M))
    raw, provenance = {}, {}
    for match in re.finditer(r"^\s*(bb_(?:data_\w+|leveldata_level\d+))\s*=\s*", init, re.M):
        name = match.group(1)
        assert name not in raw, f"Duplicate initialization: {name}"
        end = literal_end(init, match.end())
        raw[name] = parse_literal(init[match.end():end])
        assert raw[name] is not None, f"Unrecovered data: {name}"
        provenance[name] = {"line": line_at(source, start + match.start()),
                            "sha256": sha(json.dumps(raw[name], separators=(",", ":"),
                                                     ensure_ascii=False).encode())}
    assert declarations == raw.keys(), f"Missing/extraneous data: {declarations ^ raw.keys()}"
    return raw, provenance


def swf_image_dimensions(path: Path):
    """Read exact character names and bitmap bounds directly from the SWF."""
    original = path.read_bytes()
    assert sha(original) == NORMAL_HASH, "Normal-mode source hash changed"
    data = original[:8] + zlib.decompress(original[8:]) if original[:3] == b"CWS" else original
    bits = data[8] >> 3
    offset = 8 + (5 + 4 * bits + 7) // 8 + 4
    dimensions, symbols = {}, {}
    while offset < len(data):
        head = struct.unpack_from("<H", data, offset)[0]
        offset += 2
        kind, length = head >> 6, head & 63
        if length == 63:
            length = struct.unpack_from("<I", data, offset)[0]
            offset += 4
        body = data[offset:offset + length]
        offset += length
        if kind == 36:
            idx, fmt, width, height = struct.unpack_from("<HBHH", body)
            dimensions[idx] = [width, height]
        elif kind == 76:
            count = struct.unpack_from("<H", body)[0]
            pos = 2
            for _ in range(count):
                idx = struct.unpack_from("<H", body, pos)[0]
                pos += 2
                end = body.index(0, pos)
                symbols[idx] = body[pos:end].decode()
                pos = end + 1
        if kind == 0:
            break
    return {symbols[idx].removeprefix("Assets_"): value for idx, value in dimensions.items()}


def records(names, flat, fields, type_offset=0, descriptions=()):
    assert len(flat) == len(names) * len(fields)
    out = []
    for idx, name in enumerate(names):
        item = {"id": idx, "type": idx + type_offset, "name": name,
                **dict(zip(fields, flat[idx * len(fields):(idx + 1) * len(fields)]))}
        if idx < len(descriptions):
            item["description"] = descriptions[idx]
        item["buildTicks"] = item["buildFactor"] * (100 if fields == BUILDING_FIELDS else 50)
        out.append(item)
    return out


def derive(raw, source, dimensions):
    units = records(raw["bb_data_unitname"], raw["bb_data_unitdata"], UNIT_FIELDS,
                    descriptions=raw["bb_data_unitabout"])
    zombies = records(raw["bb_data_zombiename"], raw["bb_data_zombiedata"], UNIT_FIELDS, 32)
    buildings = records(raw["bb_data_buildingname"], raw["bb_data_buildingdata"], BUILDING_FIELDS,
                        descriptions=raw["bb_data_buildingabout"])
    assert len(units) == len(zombies) == len(buildings) == 6
    assert all(0 <= unit["dependency"] < 6 for unit in units)
    assert all(0 <= building["dependency"] < 6 for building in buildings)
    powers = [{"id": idx, "name": name, "xp": raw["bb_data_wmdxp"][idx],
               "buildTicks": 150, "cooldownTicks": raw["bb_data_wmdcooldown"][idx],
               "unlockAfterStage": idx,
               "description": raw["bb_data_wmdabout"][idx]}
              for idx, name in enumerate(raw["bb_data_wmdname"])]
    assert len(powers) == 3
    levels = []
    for idx in range(1, 5):
        flat = raw[f"bb_leveldata_level{idx}"]
        assert len(flat) % 3 == 0
        waves = []
        totals = [0] * 6
        for pos in range(0, len(flat), 3):
            kind, count, delay = flat[pos:pos + 3]
            assert isinstance(kind, int) and 0 <= kind <= 5
            assert isinstance(count, int) and count >= 1
            assert delay >= 0
            totals[kind] += count
            # bbZombieMob_new param3:int, supplied with `| 0` by bbInit.
            waves.append({"type": kind, "count": count, "delay": delay,
                          "effectiveDelay": int(delay)})
        levels.append({"id": idx, "title": raw["bb_data_difficultytitle"][idx - 1],
                       "name": raw["bb_data_difficultyname"][idx - 1],
                       "zombieDamageMultiplier": 1 + (idx - 1) / 4,
                       "zombieHealthMultiplier": 1 + (idx - 1) / 4,
                       "waves": waves, "totalsByType": totals,
                       "zombieCount": sum(totals[1:])})
    # These are additional threshold-triggered spawns, not part of level arrays.
    # Keep them separate: AddFirst means the last call runs first.
    trigger_pattern = r'if\(this\.bbzombiebase\.bbhealth <= (\d+) && this\.bbzombiehealth > \1\)\s*\{([^}]+)\}'
    triggers = list(re.finditer(trigger_pattern, source))
    assert len(triggers) == 12
    reinforcements = []
    for idx, match in enumerate(triggers):
        threshold = int(match.group(1))
        assert threshold == [13000, 9000, 5000][idx % 3]
        calls = []
        for call in re.finditer(r'bb_ZombieMob\.bbSpawn\((\d+),(\d+),([\d.]+)\)', match.group(2)):
            kind, count, delay = call.groups()
            calls.append({"type": int(kind), "count": int(count), "delay": float(delay),
                          "effectiveDelay": int(float(delay))})
        assert calls
        reinforcements.append({"stage": 4 - idx // 3, "threshold": threshold,
                               "calls": calls, "queueOrder": list(reversed(calls)),
                               "sourceLine": line_at(source, match.start())})
    sheets = {}
    pattern = r'this\.(\w+)\s*=\s*new bb_spritesheet_SpriteSheet\(\)\.bbSpriteSheet_new\("(\w+)",(bb_data_\w+),(-?\d+),(-?\d+),(-?\d+)\)'
    for match in re.finditer(pattern, source):
        prop, image, data_key, flip, dx, dy = match.groups()
        flat = raw[data_key]
        assert len(flat) % 7 == 0, data_key
        width, height = dimensions[image]
        frames = [dict(zip(FRAME_FIELDS, flat[pos:pos + 7])) for pos in range(0, len(flat), 7)]
        ids = [frame["id"] for frame in frames]
        assert len(ids) == len(set(ids)), f"Duplicate frame IDs: {image}"
        for frame in frames:
            assert frame["width"] > 0 and frame["height"] > 0
            assert 0 <= frame["x"] <= width - frame["width"], (image, frame)
            assert 0 <= frame["y"] <= height - frame["height"], (image, frame)
        sheets[image] = {"property": prop, "dataKey": data_key, "width": width,
                         "height": height, "flipArgument": int(flip), "offsetX": int(dx),
                         "offsetY": int(dy), "frames": frames,
                         "sourceLine": line_at(source, match.start())}
    fonts = {}
    pattern = r'this\.(\w+)\s*=\s*new bb_imagefont_ImageFont\(\)\.bbImageFont_new\("(\w+)",(\d+),(bb_data_\w+)\)'
    for match in re.finditer(pattern, source):
        prop, image, height, key = match.groups()
        flat = raw[key]
        assert len(flat) % 8 == 1 and flat[-1] == 0, key
        glyphs = [dict(zip(FONT_FIELDS, flat[pos:pos + 8])) for pos in range(0, len(flat) - 1, 8)]
        width, image_height = dimensions[image]
        assert len({g["code"] for g in glyphs}) == len(glyphs)
        for glyph in glyphs:
            assert 0 <= glyph["x"] <= width - glyph["width"], (image, glyph)
            assert 0 <= glyph["y"] <= image_height - glyph["height"], (image, glyph)
        fonts[image] = {"property": prop, "dataKey": key, "lineHeight": int(height),
                        "width": width, "height": image_height, "glyphs": glyphs,
                        "sourceLine": line_at(source, match.start())}
    special_keys = {"bb_data_unitdata", "bb_data_zombiedata", "bb_data_buildingdata",
                    "bb_data_unitname", "bb_data_zombiename", "bb_data_buildingname",
                    "bb_data_wmdxp", "bb_data_wmdcooldown", "bb_data_difficultyname",
                    "bb_data_difficultytitle", "bb_data_junkpos", "bb_data_trailerpos",
                    "bb_data_unitabout", "bb_data_buildingabout", "bb_data_wmdabout",
                    "bb_data_wmdname", "bb_data_WinMessage", "bb_data_LoseMessage"}
    expected_atlas_keys = {key for key in raw if key not in special_keys and not key.startswith("bb_leveldata_")}
    mapped_atlas_keys = {sheet["dataKey"] for sheet in sheets.values()} | {font["dataKey"] for font in fonts.values()}
    assert expected_atlas_keys == mapped_atlas_keys, f"Unmapped atlas: {expected_atlas_keys ^ mapped_atlas_keys}"
    assert len(raw["bb_data_junkpos"]) == 5 * 3
    assert len(raw["bb_data_trailerpos"]) == 15 * 3
    return {"units": units, "zombies": zombies, "buildings": buildings, "powers": powers,
            "levels": levels, "reinforcements": reinforcements,
            "spritesheets": sheets, "fonts": fonts}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=ROOT / "reference/simplified/scripts/main.as")
    parser.add_argument("--swf", type=Path, default=ROOT / "original/game.swf")
    parser.add_argument("--check", action="store_true", help="Assert generated files exactly match checked-in data")
    args = parser.parse_args()
    source_bytes = args.source.read_bytes()
    source = source_bytes.decode("utf-8-sig")
    raw, provenance = extract_raw(source)
    original_path = ROOT / "reference/original/scripts/main.as"
    if original_path.exists():
        original_source = original_path.read_text(encoding="utf-8-sig")
        for name, entry in provenance.items():
            declaration = re.search(r"^var " + re.escape(name) + r":", original_source, re.M)
            assignment = re.search(r"^\s*" + re.escape(name) + r"\s*=", original_source, re.M)
            entry["originalDeclarationLine"] = line_at(original_source, declaration.start()) if declaration else None
            entry["originalAssignmentLine"] = line_at(original_source, assignment.start()) if assignment else None
    derived = derive(raw, source, swf_image_dimensions(args.swf))
    manifest = {"sourceSwfSha256": NORMAL_HASH, "sourceAsSha256": sha(source_bytes),
                "source": str(args.source.resolve()), "method": "bb_Init", "variables": provenance,
                "counts": {"rawVariables": len(raw), "units": len(derived["units"]),
                           "zombies": len(derived["zombies"]), "buildings": len(derived["buildings"]),
                           "powers": len(derived["powers"]), "levels": len(derived["levels"]),
                           "spritesheets": len(derived["spritesheets"]), "fonts": len(derived["fonts"]),
                           "frames": sum(len(s["frames"]) for s in derived["spritesheets"].values()),
                           "glyphs": sum(len(f["glyphs"]) for f in derived["fonts"].values())}}
    compact = lambda value: json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    outputs = {ROOT / "data/raw.json": json.dumps(raw, ensure_ascii=False, indent=2) + "\n",
               ROOT / "data/derived.json": json.dumps(derived, ensure_ascii=False, indent=2) + "\n",
               ROOT / "data/provenance.json": json.dumps(manifest, ensure_ascii=False, indent=2) + "\n"}
    js = "// GENERATED by scripts/extract-data.py; do not hand-edit.\n"
    js += "// Full original literals are retained, including bases and unused tables.\n"
    js += "export const RAW = " + compact(raw) + ";\n"
    for exported, key in [("UNITS", "units"), ("ZOMBIES", "zombies"), ("BUILDINGS", "buildings"),
                          ("POWERS", "powers"), ("LEVELS", "levels"), ("REINFORCEMENTS", "reinforcements"),
                          ("SPRITESHEETS", "spritesheets"), ("FONTS", "fonts")]:
        js += f"export const {exported} = " + compact(derived[key]) + ";\n"
    js += "export const SOURCE = " + compact(manifest) + ";\n"
    outputs[ROOT / "src/data.js"] = js
    for path, text in outputs.items():
        if args.check:
            assert path.read_text(encoding="utf-8") == text, f"Stale generated output: {path}"
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(text, encoding="utf-8", newline="\n")
    print(json.dumps({"verified": args.check, **manifest["counts"],
                      "levelWaves": [len(level["waves"]) for level in derived["levels"]],
                      "levelZombies": [level["zombieCount"] for level in derived["levels"]]}, indent=2))


if __name__ == "__main__":
    main()
