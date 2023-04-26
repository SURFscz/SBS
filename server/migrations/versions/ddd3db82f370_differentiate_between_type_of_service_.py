"""Differentiate between type of service token

Revision ID: ddd3db82f370
Revises: 0e6ac85397af
Create Date: 2023-03-21 13:50:34.046658

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'ddd3db82f370'
down_revision = '0e6ac85397af'
branch_labels = None
depends_on = None


def insert_service_token(conn, row, token_type):
    query = text("""
        INSERT INTO `service_tokens` (hashed_token, description, service_id, token_type, created_by, updated_by)
        VALUES (:hashed_token, :description, :service_id, :token_type, :created_by, :updated_by)
    """)
    description = f"Migrated {token_type.upper()} service token for {row.name}"
    conn.execute(query,
                 dict(hashed_token=row.hashed_token,
                      description=description,
                      service_id=row.service_id,
                      token_type=token_type,
                      created_by="migration",
                      updated_by="migration")
                 )


def upgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE `service_tokens` ADD COLUMN token_type VARCHAR(255)"))

    rows = conn.execute(text("""
        select s.id as service_id, s.token_enabled as token_enabled, s.pam_web_sso_enabled as pam_web_sso_enabled,
        s.scim_enabled as scim_enabled, s.name as name, st.id as service_token_id, st.hashed_token as hashed_token,
        st.description as description from services s inner join service_tokens st on st.service_id = s.id
    """))
    for row in rows:
        token_enabled = row.token_enabled
        pam_web_sso_enabled = row.pam_web_sso_enabled
        scim_enabled = row.scim_enabled
        token_type = "introspection" if token_enabled else "pam" if pam_web_sso_enabled else "scim"
        conn.execute(text("UPDATE service_tokens SET token_type = :token_type WHERE id = :id"),
                     token_type=token_type,
                     id=row.service_token_id)
        if pam_web_sso_enabled and token_type != "pam":
            insert_service_token(conn, row, "pam")
        if scim_enabled and token_type != "scim":
            insert_service_token(conn, row, "scim")

    conn.execute(text("ALTER TABLE `service_tokens` CHANGE token_type token_type VARCHAR(255) NOT NULL"))


def downgrade():
    pass
