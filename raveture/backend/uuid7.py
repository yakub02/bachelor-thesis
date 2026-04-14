"""
UUIDv7 — pure Python implementace bez externích závislostí.

RFC 9562 (květen 2024) — time-ordered UUID:
  - 48 bitů: Unix timestamp v milisekundách
  -  4 bity: verze (0x7)
  - 12 bitů: náhodné (rand_a)
  -  2 bity: variant (0b10)
  - 62 bitů: náhodné (rand_b)

Výhody oproti UUIDv4:
  - Záznamy jsou přirozeně seřazeny dle vzniku → efektivnější B-Tree indexy
  - Stále kryptograficky náhodné → ID nelze předvídat
"""

import os
import time
import uuid as _uuid


def uuid7() -> _uuid.UUID:
    """Vygeneruj UUID verze 7 (time-ordered, RFC 9562)."""
    timestamp_ms = int(time.time() * 1000)

    rand_a = int.from_bytes(os.urandom(2), 'big') & 0x0FFF   # 12 náhodných bitů
    rand_b = int.from_bytes(os.urandom(8), 'big') & 0x3FFFFFFFFFFFFFFF  # 62 náhodných bitů

    value = (
        (timestamp_ms & 0xFFFFFFFFFFFF) << 80  # bity 127–80: timestamp
        | (0x7 << 76)                           # bity 79–76: verze = 7
        | (rand_a << 64)                        # bity 75–64: rand_a
        | (0b10 << 62)                          # bity 63–62: variant = 10
        | rand_b                                # bity 61–0: rand_b
    )

    return _uuid.UUID(int=value)
