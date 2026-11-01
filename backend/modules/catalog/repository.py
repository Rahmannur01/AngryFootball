"""Database access for the shared football catalog."""

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.modules.catalog.models import Footballer

async def get_random_footballers_by_position(db: AsyncSession, position: str, footballers_count: int = 1) -> list[Footballer]:
    if footballers_count <= 0:
        raise ValueError("Количество футболистов должно быть больше нуля")

    result = await db.scalars(
        select(Footballer)
        .where(Footballer.position == position)
        .order_by(func.random())
        .limit(footballers_count)
    )

    return list(result.all())