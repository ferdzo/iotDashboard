"""add_certificate_id_and_indices

Revision ID: 4f152b34e800
Revises: f94393f57c35
Create Date: 2025-10-30 21:29:43.843375+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4f152b34e800'
down_revision: Union[str, Sequence[str], None] = 'f94393f57c35'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Step 1: Add id column as nullable first
    op.add_column('device_certificates', sa.Column('id', sa.Text(), nullable=True))
    
    # Step 2: Generate IDs for existing records (use device_id as temporary ID)
    op.execute("""
        UPDATE device_certificates 
        SET id = device_id || '-' || EXTRACT(EPOCH FROM issued_at)::text
        WHERE id IS NULL
    """)
    
    # Step 3: Drop old primary key constraint
    op.drop_constraint('device_certificates_pkey', 'device_certificates', type_='primary')
    
    # Step 4: Make id NOT NULL now that all rows have values
    op.alter_column('device_certificates', 'id', nullable=False)
    
    # Step 5: Create new primary key on id
    op.create_primary_key('device_certificates_pkey', 'device_certificates', ['id'])
    
    # Step 6: Create indices
    op.create_index('idx_device_certificates_active', 'device_certificates', ['device_id', 'revoked_at'], unique=False)
    op.create_index('idx_device_certificates_device_id', 'device_certificates', ['device_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    # Drop indices
    op.drop_index('idx_device_certificates_device_id', table_name='device_certificates')
    op.drop_index('idx_device_certificates_active', table_name='device_certificates')
    
    # Drop new primary key
    op.drop_constraint('device_certificates_pkey', 'device_certificates', type_='primary')
    
    # Recreate old primary key on device_id
    op.create_primary_key('device_certificates_pkey', 'device_certificates', ['device_id'])
    
    # Drop id column
    op.drop_column('device_certificates', 'id')
