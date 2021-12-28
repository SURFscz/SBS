"""Added status to collaboration invitation

Revision ID: 16aec2d2cfab
Revises: a9a71287d8f2
Create Date: 2021-12-28 13:24:54.998159

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '16aec2d2cfab'
down_revision = 'a9a71287d8f2'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE `invitations` DROP COLUMN accepted"))
    conn.execute(text("ALTER TABLE `invitations` DROP COLUMN denied"))
    conn.execute(text("ALTER TABLE `invitations` ADD COLUMN status varchar(255)"))
    conn.execute(text("UPDATE `invitations` SET status = 'open'"))
    conn.execute(text("ALTER TABLE `invitations` CHANGE status status varchar(255) NOT NULL"))

    conn.execute(text("ALTER TABLE `service_invitations` DROP COLUMN accepted"))
    conn.execute(text("ALTER TABLE `service_invitations` DROP COLUMN denied"))

    conn.execute(text("ALTER TABLE `organisation_invitations` DROP COLUMN accepted"))
    conn.execute(text("ALTER TABLE `organisation_invitations` DROP COLUMN denied"))


def downgrade():
    pass
