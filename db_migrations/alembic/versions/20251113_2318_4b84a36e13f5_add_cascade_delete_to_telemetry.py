"""add_cascade_delete_to_telemetry

Revision ID: 4b84a36e13f5
Revises: 0f2632e459d3
Create Date: 2025-11-13 23:18:36.029045+00:00

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '4b84a36e13f5'
down_revision: Union[str, Sequence[str], None] = '0f2632e459d3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema: Add ON DELETE CASCADE to telemetry foreign key."""
    # Drop existing foreign key constraint
    op.drop_constraint('telemetry_device_id_fkey', 'telemetry', type_='foreignkey')
    
    # Re-create foreign key with ON DELETE CASCADE
    op.create_foreign_key(
        'telemetry_device_id_fkey',
        'telemetry',
        'devices',
        ['device_id'],
        ['id'],
        ondelete='CASCADE'
    )


def downgrade() -> None:
    """Downgrade schema: Remove CASCADE from telemetry foreign key."""
    # Drop foreign key with CASCADE
    op.drop_constraint('telemetry_device_id_fkey', 'telemetry', type_='foreignkey')
    
    # Re-create foreign key without CASCADE (original state)
    op.create_foreign_key(
        'telemetry_device_id_fkey',
        'telemetry',
        'devices',
        ['device_id'],
        ['id']
    )
