import re
from typing import Final, Pattern


USERNAME_MIN_LENGTH: Final = 3
USERNAME_MAX_LENGTH: Final = 20
PASSWORD_MIN_LENGTH: Final = 8
PASSWORD_MAX_LENGTH: Final = 128
EMAIL_MAX_LENGTH: Final = 254

USERNAME_PATTERN: Final[Pattern[str]] = re.compile(
    r"^[\w-]+$",
    re.UNICODE,
)
