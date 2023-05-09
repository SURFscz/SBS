"""Add missing service groups for collaborations

Revision ID: 7f26eec7f91c
Revises: 6cc396fce8ad
Create Date: 2023-03-14 11:24:52.875046

"""
import uuid

from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '7f26eec7f91c'
down_revision = '6cc396fce8ad'
branch_labels = None
depends_on = None


def insert_group(conn, row):
    service_group_id = row.service_group_id
    collaboration_id = row.collaboration_id
    auto_provision_members = row.sg_auto_provision_members
    short_name = f"{row.abbreviation}-{row.sg_short_name}"
    query = text("""
        INSERT INTO `groups`
            (name, short_name, global_urn, description, auto_provision_members,
             collaboration_id, created_by, updated_by, identifier, service_group_id)
        VALUES
            (:name, :short_name, :global_urn, :description, :auto_prov,
             :collaboration_id, :created_by, :updated_by, :identifier, :service_group_id)
    """)

    conn.execute(query,
                 dict(
                     name=row.sg_name,
                     short_name=short_name,
                     global_urn=f"{row.o_short_name}:{row.c_short_name}:{short_name}",
                     description=f"Provisioned by service {row.s_name} - {row.sg_description}",
                     auto_prov=auto_provision_members,
                     collaboration_id=collaboration_id,
                     created_by="migration",
                     updated_by="migration",
                     identifier=str(uuid.uuid4()),
                     service_group_id=service_group_id)
                 )


def upgrade():
    conn = op.get_bind()

    # find all service_groups and collaboration that are directly connected and that do NOT have a corresponding group
    # based on the following format <service_shortname>-<service_group_shortname>
    result = conn.execute(text("SELECT sg.id AS service_group_id, c.id AS collaboration_id, "
                               "s.abbreviation as abbreviation,"
                               "sg.name as sg_name, sg.description as sg_description, sg.short_name as sg_short_name, "
                               "s.name as s_name, sg.auto_provision_members as sg_auto_provision_members,"
                               "o.short_name as o_short_name, c.short_name as c_short_name "
                               "FROM service_groups sg "
                               "INNER JOIN services s ON s.id = sg.service_id "
                               "INNER JOIN services_collaborations sca ON sca.service_id = s.id "
                               "INNER JOIN collaborations c ON c.id = sca.collaboration_id "
                               "INNER JOIN organisations o ON o.id = c.organisation_id "
                               "WHERE NOT EXISTS "
                               "(SELECT g.id FROM `groups` g WHERE g.collaboration_id = c.id AND "
                               "(g.short_name = CONCAT(s.abbreviation,'-',sg.short_name) OR "
                               "g.short_name = CONCAT(s.abbreviation,'_',sg.short_name)))"))
    for row in result:
        insert_group(conn, row)

    # find all service_groups and collaborations which organisation is linked and that do NOT have a corresponding group
    # based on the following format <service_shortname>-<service_group_shortname>
    result = conn.execute(text("SELECT sg.id AS service_group_id, c.id AS collaboration_id, "
                               "s.abbreviation as abbreviation,"
                               "sg.name as sg_name, sg.description as sg_description, "
                               "sg.short_name as sg_short_name, "
                               "s.name as s_name, sg.auto_provision_members as sg_auto_provision_members,"
                               "o.short_name as o_short_name, c.short_name as c_short_name "
                               "FROM service_groups sg "
                               "INNER JOIN services s ON s.id = sg.service_id "
                               "INNER JOIN services_organisations soa ON soa.service_id = s.id "
                               "INNER JOIN organisations o ON o.id = soa.organisation_id "
                               "INNER JOIN collaborations c ON c.organisation_id = o.id "
                               "WHERE NOT EXISTS "
                               "(SELECT g.id FROM `groups` g WHERE g.collaboration_id = c.id AND "
                               "(g.short_name = CONCAT(s.abbreviation,'-',sg.short_name) OR "
                               "g.short_name = CONCAT(s.abbreviation,'_',sg.short_name)))"))
    for row in result:
        insert_group(conn, row)


def downgrade():
    pass
