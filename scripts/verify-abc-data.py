#!/usr/bin/env python3
"""Independently verify generated literals against the original SWF ABC.

This is a deliberately restricted, offline static initializer evaluator, NOT an
AVM2 runtime. It follows constant branches and interprets literal stack/array/slot
operations in bb_Init only. Any unsupported executed instruction fails closed.
Constructed game objects are inert symbols: no original method, network, file,
audio, rendering or executable code is called.
"""
from __future__ import annotations

import hashlib
import json
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class Reader:
    def __init__(self, data):
        self.data, self.pos = data, 0

    def u8(self):
        out = self.data[self.pos]
        self.pos += 1
        return out

    def u30(self):
        value = 0
        for shift in range(0, 35, 7):
            byte = self.u8()
            value |= (byte & 127) << shift
            if byte < 128:
                return value
        return value

    def s24(self):
        value = int.from_bytes(self.take(3), "little")
        return value - 0x1000000 if value & 0x800000 else value

    def take(self, count):
        out = self.data[self.pos:self.pos + count]
        assert len(out) == count
        self.pos += count
        return out


def abc_from_swf(data):
    if data[:3] == b"CWS":
        data = data[:8] + zlib.decompress(data[8:])
    offset = 8 + (5 + 4 * (data[8] >> 3) + 7) // 8 + 4
    reader = Reader(data)
    reader.pos = offset
    while reader.pos < len(data):
        header = int.from_bytes(reader.take(2), "little")
        tag, size = header >> 6, header & 63
        if size == 63:
            size = int.from_bytes(reader.take(4), "little")
        payload = reader.take(size)
        if tag == 82:
            return payload[payload.index(0, 4) + 1:]
    raise ValueError("No ABC tag")


class ABC:
    def __init__(self, data):
        r = self.reader = Reader(data)
        self.version = struct.unpack("<HH", r.take(4))
        self.ints = [0]
        for _ in range(max(0, r.u30() - 1)):
            value = r.u30()
            self.ints.append(value - 0x100000000 if value & 0x80000000 else value)
        self.uints = [0] + [r.u30() for _ in range(max(0, r.u30() - 1))]
        self.doubles = [0] + [struct.unpack("<d", r.take(8))[0]
                             for _ in range(max(0, r.u30() - 1))]
        self.strings = [""] + [r.take(r.u30()).decode("utf-8")
                               for _ in range(max(0, r.u30() - 1))]
        self.namespaces = [None] + [(r.u8(), r.u30()) for _ in range(max(0, r.u30() - 1))]
        self.nssets = [None] + [[r.u30() for _ in range(r.u30())]
                               for _ in range(max(0, r.u30() - 1))]
        self.names = ["*"]
        for _ in range(max(0, r.u30() - 1)):
            kind = r.u8()
            if kind in (7, 13):
                r.u30()
                name = self.strings[r.u30()]
            elif kind in (15, 16):
                name = self.strings[r.u30()]
            elif kind in (17, 18):
                name = "[runtime]"
            elif kind in (9, 14):
                name = self.strings[r.u30()]
                r.u30()
            elif kind in (27, 28):
                r.u30()
                name = "[runtime]"
            elif kind == 29:
                name = self.names[r.u30()] + ".<" + ",".join(
                    self.names[r.u30()] for _ in range(r.u30())) + ">"
            else:
                raise ValueError(f"Multiname kind {kind}")
            self.names.append(name)
        self.methods = []
        for _ in range(r.u30()):
            count = r.u30()
            returns = r.u30()
            params = [r.u30() for _ in range(count)]
            name, flags = r.u30(), r.u8()
            if flags & 8:
                for _ in range(r.u30()):
                    r.u30()
                    r.u8()
            if flags & 128:
                for _ in range(count):
                    r.u30()
            self.methods.append({"name": self.strings[name], "returns": returns, "params": params})
        for _ in range(r.u30()):
            r.u30()
            count = r.u30()
            for _ in range(count * 2):
                r.u30()
        class_count = r.u30()
        for _ in range(class_count):
            r.u30()
            r.u30()
            flags = r.u8()
            if flags & 8:
                r.u30()
            for _ in range(r.u30()):
                r.u30()
            r.u30()
            self.traits()
        for _ in range(class_count):
            r.u30()
            self.traits()
        self.scripts = []
        for _ in range(r.u30()):
            self.scripts.append({"init": r.u30(), "traits": self.traits()})
        self.bodies = {}
        for _ in range(r.u30()):
            method = r.u30()
            maxstack, locals_, scope, maxscope = (r.u30() for _ in range(4))
            code = r.take(r.u30())
            for _ in range(r.u30()):
                for _ in range(5):
                    r.u30()
            self.traits()
            self.bodies[method] = code
        assert r.pos == len(data), (r.pos, len(data))

    def traits(self):
        r = self.reader
        traits = []
        for _ in range(r.u30()):
            name, kind = r.u30(), r.u8()
            trait = {"name": self.names[name], "kind": kind & 15}
            if kind & 15 in (0, 6):
                trait.update(slot=r.u30(), type=r.u30(), value=r.u30())
                if trait["value"]:
                    trait["valueKind"] = r.u8()
            elif kind & 15 in (1, 2, 3):
                trait.update(disp=r.u30(), method=r.u30())
            elif kind & 15 == 4:
                trait.update(slot=r.u30(), class_=r.u30())
            elif kind & 15 == 5:
                trait.update(slot=r.u30(), function=r.u30())
            else:
                raise ValueError(f"Trait kind {kind}")
            if kind & 64:
                for _ in range(r.u30()):
                    r.u30()
            traits.append(trait)
        return traits


class Symbol:
    def __init__(self, name):
        self.name = name


def evaluate_literals(abc, method_id=7):
    r = Reader(abc.bodies[method_id])
    stack, locals_, globals_, named, arrays = [], {}, {}, {}, []
    global_scope = Symbol("global")
    scopes = [global_scope]
    trace = []
    for steps in range(100000):
        if r.pos == len(r.data):
            break
        position, opcode = r.pos, r.u8()
        trace.append((position, opcode, len(stack)))
        pop = stack.pop
        if opcode == 0x08:
            locals_.pop(r.u30(), None)
        elif opcode == 0x10:  # jump; offset is relative to end of operand
            delta = r.s24()
            r.pos += delta
        elif opcode in (0x11, 0x12):
            delta, condition = r.s24(), pop()
            if bool(condition) == (opcode == 0x11):
                r.pos += delta
        elif opcode in (0x20, 0x21):
            stack.append(None)
        elif opcode == 0x24:
            value = r.u8()
            stack.append(value - 256 if value > 127 else value)
        elif opcode == 0x25:
            value = r.u30()
            stack.append(value - 0x100000000 if value & 0x80000000 else value)
        elif opcode in (0x26, 0x27):
            stack.append(opcode == 0x26)
        elif opcode == 0x29:
            pop()
        elif opcode == 0x2A:
            stack.append(stack[-1])
        elif opcode == 0x2B:
            stack[-1], stack[-2] = stack[-2], stack[-1]
        elif opcode in (0x2C, 0x2D, 0x2E, 0x2F):
            pool = {0x2C: abc.strings, 0x2D: abc.ints, 0x2E: abc.uints, 0x2F: abc.doubles}[opcode]
            stack.append(pool[r.u30()])
        elif opcode == 0x30:
            scopes.append(pop())
        elif opcode == 0x1D:
            scopes.pop()
        elif opcode == 0x40:
            stack.append(Symbol(f"function:{r.u30()}"))
        elif opcode == 0x47:
            break
        elif opcode in (0x46, 0x4A):
            name, argc = abc.names[r.u30()], r.u30()
            args = [pop() for _ in range(argc)][::-1]
            receiver = pop()
            stack.append(Symbol(f"{getattr(receiver, 'name', '?')}.{name}"))
        elif opcode == 0x56:
            count = r.u30()
            value = [pop() for _ in range(count)][::-1]
            arrays.append(value)
            stack.append(value)
        elif opcode in (0x5D, 0x5E, 0x60):
            stack.append(Symbol(abc.names[r.u30()]))
        elif opcode == 0x62:
            stack.append(locals_.get(r.u30()))
        elif opcode == 0x63:
            locals_[r.u30()] = pop()
        elif opcode == 0x64:
            stack.append(global_scope)
        elif opcode == 0x65:
            stack.append(scopes[r.u8()])
        elif opcode in (0x61, 0x68):
            name, value, receiver = abc.names[r.u30()], pop(), pop()
            named[name] = value
        elif opcode == 0x6C:
            slot, receiver = r.u30(), pop()
            assert receiver is global_scope
            stack.append(globals_.get(slot))
        elif opcode == 0x6D:
            slot, value, receiver = r.u30(), pop(), pop()
            if receiver is global_scope:
                globals_[slot] = value
        elif opcode == 0x80:
            r.u30()  # coerce, value remains unchanged
        elif opcode in (0x82, 0x85):
            pass
        elif opcode == 0x90:
            stack.append(-pop())
        elif opcode == 0x96:
            stack.append(not pop())
        elif 0xD0 <= opcode <= 0xD3:
            stack.append(locals_.get(opcode - 0xD0))
        elif 0xD4 <= opcode <= 0xD7:
            locals_[opcode - 0xD4] = pop()
        elif opcode in (0xF0, 0xF1, 0xF2):
            r.u30()
        else:
            raise ValueError(f"Unsupported executed opcode {opcode:02x} at {position:x}; trace={trace[-12:]}")
    else:
        raise ValueError("Initializer instruction guard exceeded")
    slots = {trait["slot"]: trait["name"] for script in abc.scripts
             for trait in script["traits"] if "slot" in trait}
    recovered = {slots[slot]: value for slot, value in globals_.items()
                 if slot in slots and (slots[slot].startswith("bb_data_") or
                                       slots[slot].startswith("bb_leveldata_"))}
    recovered.update({name: value for name, value in named.items()
                      if name.startswith(("bb_data_", "bb_leveldata_"))})
    return recovered, {"method": method_id, "executedInstructions": len(trace),
                       "literalArrays": len(arrays), "globalSlots": len(globals_)}


def main():
    swf = (ROOT / "original/game.swf").read_bytes()
    abc = ABC(abc_from_swf(swf))
    recovered, stats = evaluate_literals(abc)
    expected = json.loads((ROOT / "data/raw.json").read_text(encoding="utf-8"))
    assert expected.keys() == recovered.keys(), (expected.keys() - recovered.keys(), recovered.keys() - expected.keys())
    for name, value in expected.items():
        assert recovered[name] == value, f"ABC/static AS mismatch for {name}"
    result = {"sourceSwfSha256": hashlib.sha256(swf).hexdigest(),
              "abcVersion": list(abc.version), "verifiedVariables": len(expected),
              "allValuesExact": True, **stats,
              "stringAudit": {
                  "markerPoolIndex": abc.strings.index("__DemoStr_0A"),
                  "markerUtf8Hex": "__DemoStr_0A".encode().hex(),
                  "standaloneNewlinePoolEntry": "\n" in abc.strings,
                  "winMessageNewlines": abc.strings[2609].count("\n")}}
    (ROOT / "data/abc-verification.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
