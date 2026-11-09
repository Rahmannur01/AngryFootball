"""Centralized structured logging for the application."""

from __future__ import annotations

import json
import logging
import traceback
from contextvars import ContextVar
from datetime import UTC, datetime
from logging.handlers import RotatingFileHandler
from pathlib import Path
from time import perf_counter
from typing import Final
from uuid import uuid4

from starlette.types import ASGIApp, Message, Receive, Scope, Send


APPLICATION_LOGGER_NAME: Final = "angry_football"

request_id_context: ContextVar[str | None] = ContextVar(
    "request_id",
    default=None,
)


class JsonFormatter(logging.Formatter):
    """Serialize application log records as one JSON object per line."""

    EXTRA_FIELDS: Final = (
        "event",
        "request_id",
        "method",
        "path",
        "status_code",
        "duration_ms",
        "user_id",
        "bus_id",
        "chest_count",
        "reason",
        "attempt_count",
        "exception_type",
        "stack_trace",
    )

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, object] = {
            "timestamp": datetime.now(UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        contextual_request_id = request_id_context.get()
        if contextual_request_id is not None:
            payload["request_id"] = contextual_request_id

        for field_name in self.EXTRA_FIELDS:
            value = getattr(record, field_name, None)
            if value is not None:
                payload[field_name] = value

        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)

        return json.dumps(
            payload,
            ensure_ascii=False,
            default=str,
        )


def configure_logging(
    level: str = "INFO",
    log_file: str | Path = "logs/app.log",
    max_bytes: int = 10 * 1024 * 1024,
    backup_count: int = 5,
) -> None:
    """Configure the application logger to write rotating JSON log files."""

    normalized_level = level.upper()
    if normalized_level not in logging.getLevelNamesMapping():
        normalized_level = "INFO"

    log_path = Path(log_file)
    log_path.parent.mkdir(parents=True, exist_ok=True)

    handler = RotatingFileHandler(
        log_path,
        maxBytes=max_bytes,
        backupCount=backup_count,
        encoding="utf-8",
    )
    handler.setFormatter(JsonFormatter())

    application_logger = logging.getLogger(APPLICATION_LOGGER_NAME)
    application_logger.handlers.clear()
    application_logger.addHandler(handler)
    application_logger.setLevel(normalized_level)
    application_logger.propagate = False


logger = logging.getLogger(APPLICATION_LOGGER_NAME)


def _safe_route_path(scope: Scope) -> str:
    """Return a route template without user-provided path values."""

    route = scope.get("route")
    route_path = getattr(route, "path", None)
    if isinstance(route_path, str):
        return route_path
    return "<unmatched>"


class RequestLoggingMiddleware:
    """Log HTTP requests and expose their correlation identifier."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(
        self,
        scope: Scope,
        receive: Receive,
        send: Send,
    ) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request_id = str(uuid4())
        context_token = request_id_context.set(request_id)
        started_at = perf_counter()
        status_code = 500

        async def send_with_request_id(message: Message) -> None:
            nonlocal status_code

            if message["type"] == "http.response.start":
                status_code = message["status"]
                headers = list(message.get("headers", []))
                headers.append((b"x-request-id", request_id.encode("ascii")))
                message = {**message, "headers": headers}

            await send(message)

        try:
            await self.app(scope, receive, send_with_request_id)
        except Exception as error:
            logger.error(
                "Unhandled request error",
                extra={
                    "event": "http.request.error",
                    "method": scope["method"],
                    "path": _safe_route_path(scope),
                    "status_code": status_code,
                    "exception_type": type(error).__name__,
                    "stack_trace": "".join(
                        traceback.format_tb(error.__traceback__)
                    ),
                },
            )
            raise
        finally:
            duration_ms = round((perf_counter() - started_at) * 1000, 2)
            logger.info(
                "HTTP request completed",
                extra={
                    "event": "http.request.completed",
                    "method": scope["method"],
                    "path": _safe_route_path(scope),
                    "status_code": status_code,
                    "duration_ms": duration_ms,
                },
            )
            request_id_context.reset(context_token)
