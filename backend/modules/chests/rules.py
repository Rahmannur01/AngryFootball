from typing import Final

START_PACK_POSITION_RULES: Final[dict[str, int]] = {
    "Goalkeeper": 1,
    "Defender": 4,
    "Midfielder": 4,
    "Attacker": 2,
}

START_PACK_SIZE: Final[int] = sum(START_PACK_POSITION_RULES.values())

CHARACTER_TYPE_IDS_BY_POSITION: Final[dict[str, tuple[int, ...]]] = {
    "Defender": (1, 2, 5, 6),
    "Midfielder": (2, 3, 4, 7),
    "Attacker": (1, 3, 4, 7),
}

CHARACTER_TYPE_IDS: Final[frozenset[int]] = frozenset(
    character_type_id
    for character_type_ids in CHARACTER_TYPE_IDS_BY_POSITION.values()
    for character_type_id in character_type_ids
)
