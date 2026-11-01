from typing import Final

START_PACK_POSITION_RULES: Final[dict[str, int]] = {
    "Goalkeeper": 1,
    "Defender": 4,
    "Midfielder": 4,
    "Attacker": 2,
}

START_PACK_SIZE: Final[int] = sum(START_PACK_POSITION_RULES.values())
