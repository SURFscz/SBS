"""Remove user_ip_networks

Revision ID: cf89d41f30fe
Revises: 67a4f585a65f
Create Date: 2024-09-20 13:50:55.001588

"""
from alembic import op

# revision identifiers, used by Alembic.
revision = 'cf89d41f30fe'
down_revision = '67a4f585a65f'
branch_labels = None
depends_on = None


def upgrade():
    op.drop_table("user_ip_networks")


def downgrade():
    pass
