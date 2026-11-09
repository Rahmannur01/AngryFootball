"""SMTP delivery for registration verification messages."""

from __future__ import annotations

import asyncio
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr

from backend.core.config import settings


class MailDeliveryError(RuntimeError):
    """Raised when a verification message cannot be delivered."""


def _send_message(message: EmailMessage) -> None:
    required = (
        settings.smtp_host,
        settings.smtp_username,
        settings.smtp_password,
        settings.smtp_from_email,
    )
    if not all(required):
        raise MailDeliveryError("SMTP is not configured")
    if settings.smtp_use_ssl and settings.smtp_use_tls:
        raise MailDeliveryError("SMTP SSL and STARTTLS cannot both be enabled")

    context = ssl.create_default_context()
    try:
        if settings.smtp_use_ssl:
            client = smtplib.SMTP_SSL(
                settings.smtp_host,
                settings.smtp_port,
                timeout=15,
                context=context,
            )
        else:
            client = smtplib.SMTP(
                settings.smtp_host,
                settings.smtp_port,
                timeout=15,
            )

        with client:
            client.ehlo()
            if settings.smtp_use_tls:
                client.starttls(context=context)
                client.ehlo()
            client.login(settings.smtp_username, settings.smtp_password)
            client.send_message(message)
    except (OSError, smtplib.SMTPException) as error:
        raise MailDeliveryError("SMTP delivery failed") from error


async def send_registration_code(recipient: str, code: str) -> None:
    message = EmailMessage()
    message["Subject"] = "Код регистрации Angry Football"
    message["From"] = formataddr(
        (settings.smtp_from_name, settings.smtp_from_email)
    )
    message["To"] = recipient
    message.set_content(
        "Ваш код регистрации в Angry Football:\n\n"
        f"{code}\n\n"
        f"Код действует {settings.email_code_expire_minutes} минут. "
        "Если вы не запрашивали регистрацию, просто проигнорируйте письмо."
    )

    await asyncio.to_thread(_send_message, message)
