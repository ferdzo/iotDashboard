"""add cascade delete to telemetry foreign key

Revision ID: 1dfb0bb45f93
Revises: 7c71d43d53e3
Create Date: 2025-12-15 21:56:13.260281+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '1dfb0bb45f93'
down_revision: Union[str, Sequence[str], None] = '7c71d43d53e3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - only update telemetry foreign key."""
    # Drop old foreign key constraint
    op.drop_constraint('telemetry_device_id_fkey', 'telemetry', type_='foreignkey')
    
    # Add new foreign key constraint with CASCADE delete
    op.create_foreign_key(
        'telemetry_device_id_fkey',
        'telemetry', 'devices',
        ['device_id'], ['id'],
        ondelete='CASCADE'
    )


def downgrade() -> None:
    """Downgrade schema - revert foreign key change."""
    # Drop CASCADE foreign key
    op.drop_constraint('telemetry_device_id_fkey', 'telemetry', type_='foreignkey')
    
    # Add back original foreign key without CASCADE
    op.create_foreign_key(
        'telemetry_device_id_fkey',
        'telemetry', 'devices',
        ['device_id'], ['id']
    )
