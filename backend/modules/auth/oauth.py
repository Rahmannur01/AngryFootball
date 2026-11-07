from datetime import UTC, datetime
import hashlib
import hmac

import httpx
from fastapi import HTTPException, status

from backend.core.config import settings


class OAuthProvider:
    """Base OAuth provider"""

    @staticmethod
    async def get_user_info(access_token: str) -> dict:
        raise NotImplementedError


class GoogleOAuth(OAuthProvider):
    """Google OAuth provider"""

    USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

    @staticmethod
    async def get_user_info(access_token: str) -> dict:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    GoogleOAuth.USERINFO_URL,
                    headers={"Authorization": f"Bearer {access_token}"},
                    timeout=10.0,
                )
        except httpx.RequestError as error:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Google OAuth is temporarily unavailable",
            ) from error

        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Failed to fetch user info from Google",
            )

        try:
            data = response.json()
            provider_id = str(data["id"])
        except (KeyError, TypeError, ValueError) as error:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Google returned an invalid user profile",
            ) from error

        return {
            "provider": "google",
            "provider_id": provider_id,
            "email": data.get("email"),
            "email_verified": bool(data.get("verified_email")),
            "username": str(data.get("name") or provider_id)[:50],
            "avatar_url": data.get("picture"),
        }


class TelegramOAuth(OAuthProvider):
    """Telegram OAuth provider"""

    @staticmethod
    async def verify_telegram_auth(auth_data: dict) -> dict:
        """Verify Telegram auth data"""
        # Check required fields
        required_fields = {"id", "first_name", "auth_date", "hash"}
        if not required_fields.issubset(auth_data.keys()):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing required Telegram auth fields",
            )

        # Verify auth hash
        if not settings.telegram_bot_token:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Telegram OAuth is not configured",
            )

        payload = dict(auth_data)
        check_hash = str(payload.pop("hash"))
        data_check_string = "\n".join(
            f"{k}={v}" for k, v in sorted(payload.items())
        )

        secret_key = hashlib.sha256(
            settings.telegram_bot_token.encode()
        ).digest()
        calculated_hash = hmac.new(
            secret_key,
            data_check_string.encode(),
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(calculated_hash, check_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Telegram auth data",
            )

        now = int(datetime.now(UTC).timestamp())
        auth_date = int(payload["auth_date"])
        if auth_date > now + 60 or now - auth_date > 86_400:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Telegram authentication data has expired",
            )

        # Build username from Telegram data
        username = payload.get("username")
        if not username:
            first_name = payload.get("first_name", "")
            last_name = payload.get("last_name", "")
            username = f"{first_name}{last_name}".replace(" ", "")
            if not username:
                username = f"user{payload['id']}"

        return {
            "provider": "telegram",
            "provider_id": str(payload["id"]),
            "username": username[:50],
            "avatar_url": payload.get("photo_url"),
        }
