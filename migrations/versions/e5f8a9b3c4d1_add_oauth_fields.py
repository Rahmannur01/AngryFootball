"""add oauth fields

Revision ID: e5f8a9b3c4d1
Revises: d4b6f13e8a21
Create Date: 2026-11-06

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e5f8a9b3c4d1'
down_revision = 'd4b6f13e8a21'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.alter_column('hashed_password',
                              existing_type=sa.String(255),
                              nullable=True)
        batch_op.alter_column('email',
                              existing_type=sa.String(),
                              nullable=True)

        batch_op.add_column(sa.Column('google_id', sa.String(255), nullable=True))
        batch_op.add_column(sa.Column('telegram_id', sa.BigInteger(), nullable=True))
        batch_op.add_column(sa.Column('provider', sa.String(50), nullable=True))
        batch_op.add_column(sa.Column('avatar_url', sa.String(500), nullable=True))
        batch_op.add_column(sa.Column('country_code', sa.String(2), nullable=True))

    op.create_index('ix_users_google_id', 'users', ['google_id'], unique=True)
    op.create_index('ix_users_telegram_id', 'users', ['telegram_id'], unique=True)


def downgrade():
    op.drop_index('ix_users_telegram_id', table_name='users')
    op.drop_index('ix_users_google_id', table_name='users')

    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('country_code')
        batch_op.drop_column('avatar_url')
        batch_op.drop_column('provider')
        batch_op.drop_column('telegram_id')
        batch_op.drop_column('google_id')

        batch_op.alter_column('email',
                              existing_type=sa.String(),
                              nullable=False)
        batch_op.alter_column('hashed_password',
                              existing_type=sa.String(255),
                              nullable=False)
