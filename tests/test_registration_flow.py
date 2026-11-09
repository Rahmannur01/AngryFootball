import asyncio
import uuid
from datetime import timedelta

import pytest
from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.schema import CreateSchema, DropSchema
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import backend.modules.model_registry  # noqa: F401
from backend.core.config import settings
from backend.database import Base
from backend.modules.auth import mailer, repository, schemas, service
from backend.modules.chests.models import UserChest


def test_email_verification_registration_flow() -> None:
    asyncio.run(_test_email_verification_registration_flow())


async def _test_email_verification_registration_flow() -> None:
    schema = f"test_registration_{uuid.uuid4().hex}"
    admin_engine = create_async_engine(settings.database_url)
    async with admin_engine.begin() as connection:
        await connection.execute(CreateSchema(schema))

    engine = create_async_engine(
        settings.database_url,
        execution_options={"schema_translate_map": {None: schema}},
    )
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    delivered: list[tuple[str, str]] = []
    original_sender = mailer.send_registration_code

    async def capture_code(recipient: str, code: str) -> None:
        delivered.append((recipient, code))

    mailer.send_registration_code = capture_code
    try:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)

        async with session_factory() as session:
            sent = await service.request_registration_code(
                session,
                "new-player@example.com",
            )
            assert delivered[0][0] == "new-player@example.com"
            actual_code = delivered[0][1]
            wrong_code = "000000" if actual_code != "000000" else "999999"

            with pytest.raises(HTTPException) as wrong_code_error:
                await service.verify_registration_code(
                    session,
                    sent.challenge_id,
                    wrong_code,
                )
            assert wrong_code_error.value.status_code == 400

            verified = await service.verify_registration_code(
                session,
                sent.challenge_id,
                actual_code,
            )
            stale_registration = schemas.CreateUser(
                username="new_player",
                password="secure-password",
                password_repeat="secure-password",
                registration_token=verified.registration_token,
            )

            challenge = await repository.get_email_challenge_by_id(
                session,
                sent.challenge_id,
            )
            challenge.last_sent_at -= timedelta(seconds=61)
            await session.commit()
            resent = await service.request_registration_code(
                session,
                "new-player@example.com",
            )

            with pytest.raises(HTTPException) as stale_token_error:
                await service.create_new_user(session, stale_registration)
            assert stale_token_error.value.status_code == 401

            reverified = await service.verify_registration_code(
                session,
                resent.challenge_id,
                delivered[-1][1],
            )
            registration = stale_registration.model_copy(
                update={"registration_token": reverified.registration_token}
            )
            user = await service.create_new_user(session, registration)
            assert user.email == "new-player@example.com"
            assert await session.scalar(
                select(func.count(UserChest.id)).where(
                    UserChest.user_id == user.id
                )
            ) == 11

            with pytest.raises(HTTPException) as reused_token_error:
                await service.create_new_user(session, registration)
            assert reused_token_error.value.status_code == 401

            sent_messages = len(delivered)
            duplicate_email_result = await service.request_registration_code(
                session,
                "new-player@example.com",
            )
            repeated_duplicate_result = (
                await service.request_registration_code(
                    session,
                    "new-player@example.com",
                )
            )
            assert duplicate_email_result.challenge_id != sent.challenge_id
            assert (
                repeated_duplicate_result.challenge_id
                == duplicate_email_result.challenge_id
            )
            assert len(delivered) == sent_messages
    finally:
        mailer.send_registration_code = original_sender
        await engine.dispose()
        async with admin_engine.begin() as connection:
            await connection.execute(DropSchema(schema, cascade=True))
        await admin_engine.dispose()
