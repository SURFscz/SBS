"""SchacHomeOrganisations names of an organisation

Revision ID: f9ceb922c568
Revises: e65060f35368
Create Date: 2020-12-24 12:47:04.657145

"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'f9ceb922c568'
down_revision = 'e65060f35368'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("schac_home_organisations",
                    sa.Column("id", sa.Integer(), primary_key=True, nullable=False, autoincrement=True),
                    sa.Column("name", sa.String(length=255), nullable=False),
                    sa.Column("organisation_id", sa.Integer(), sa.ForeignKey("organisations.id", ondelete="cascade"),
                              nullable=False),
                    sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"),
                              nullable=False),
                    sa.Column("updated_at", sa.DateTime(timezone=True),
                              server_default=sa.text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
                              nullable=False),
                    sa.Column("created_by", sa.String(length=255), nullable=False),
                    sa.Column("updated_by", sa.String(length=255), nullable=False),
                    )

    conn = op.get_bind()
    conn.execute(text("UPDATE organisations SET `schac_home_organisation` = NULL where `schac_home_organisation` = ''"))

    result = conn.execute(text("SELECT `schac_home_organisation`, `id` FROM `organisations` "
                               "WHERE `schac_home_organisation` IS NOT NULL"))
    for row in result:
        schac_home_organisation = row[0]
        conn.execute(text(f"INSERT INTO `schac_home_organisations` (`name`, `organisation_id`,"
                          f" `created_by`, `updated_by`) "
                          f"VALUES ('{schac_home_organisation}', {row[1]}, 'migration', 'migration')"))

    conn.execute(text("ALTER TABLE organisations DROP COLUMN schac_home_organisation"))


def downgrade():
    pass
