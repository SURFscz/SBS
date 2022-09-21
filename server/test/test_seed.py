#!/opt/sbs/sbs-env/bin/python
# -*- coding: future_fstrings -*-
import base64
import datetime
import os
import uuid
import sys
import logging

from sqlalchemy import text

if "/opt/sbs/sbs" not in sys.path:
    sys.path.insert(0, "/opt/sbs/sbs")

from server.api.collaboration_request import STATUS_OPEN
from server.auth.secrets import secure_hash, generate_token
from server.db.audit_mixin import metadata
from server.db.defaults import default_expiry_date
from server.db.domain import User, Organisation, OrganisationMembership, Service, Collaboration, \
    CollaborationMembership, JoinRequest, Invitation, Group, OrganisationInvitation, ApiKey, CollaborationRequest, \
    ServiceConnectionRequest, SuspendNotification, Aup, SchacHomeOrganisation, SshKey, ServiceGroup, \
    ServiceInvitation, ServiceMembership, ServiceAup, UserToken, UserIpNetwork, Tag, PamSSOSession, IpNetwork, \
    ServiceToken

import yaml
from flask import Flask
from flask_migrate import Migrate
from server.db.db import db, db_migrations
from server.tools import read_file
from munch import munchify


def read_image(file_name):
    file = f"{os.path.dirname(os.path.realpath(__file__))}/test_images/{file_name}"
    with open(file, "rb") as f:
        c = f.read()
        return base64.encodebytes(c).decode("utf-8")


def _persist(db, *objs):
    required_attrs = ["created_by", "updated_by"]
    for obj in objs:
        for attr in required_attrs:
            if hasattr(obj, attr):
                setattr(obj, attr, "urn:admin")
        if isinstance(obj, User):
            aup = Aup(au_version="1", user=obj)
            db.session.add(aup)
        db.session.add(obj)
        logger.info(f"Add {obj}")


def clean_db(db):
    tables = reversed(metadata.sorted_tables)
    for table in tables:
        db.session.execute(table.delete())
    db.session.execute(text("DELETE FROM audit_logs"))
    db.session.commit()


def seed(db, app_config, skip_seed=False, perf_test=False):
    clean_db(db)

    shac_home_organisation_01 = "onlineresearch.com"
    shac_home_organisation_02 = "school4us.org"

    # Create Users
    user_01_mail = "john@example.org"
    user_02_mail = "peter@example.org"

    user_01 = User(uid="urn:john",
                   name="John Doe",
                   username="john",
                   email=user_01_mail,
                   address="Postal 1234AA",
                   schac_home_organisation=shac_home_organisation_01)
    user_02 = User(uid="urn:peter",
                   name="Peter Doe",
                   username="peter",
                   email=user_02_mail,
                   address="Postal 1234AA",
                   schac_home_organisation=shac_home_organisation_02)
    _persist(db, user_01, user_02)

    # Create SSH keys
    ssh_key_user_01 = SshKey(user=user_01, ssh_value="some-ssh-key-01")
    ssh_key_user_02 = SshKey(user=user_02, ssh_value="some-ssh-key-02")
    _persist(db, ssh_key_user_01, ssh_key_user_02)

    # Create organisations
    org_01 = Organisation(name="Online Resarch bv",
                          description="Organisation for online research",
                          identifier=str(uuid.uuid4()),
                          created_by="urn:admin",
                          updated_by="urn:admin",
                          short_name="onlresbv",
                          logo=read_image("org_01.jpg"),
                          category="Research")
    org_02 = Organisation(name="School 4 US",
                          description="A school for everybody",
                          identifier=str(uuid.uuid4()),
                          created_by="urn:admin",
                          updated_by="urn:admin",
                          short_name="school4us",
                          logo=read_image("org_02.jpg"),
                          category="University")
    _persist(db, org_01, org_02)

    # Create ShacHomeOrganisations
    sho_01 = SchacHomeOrganisation(name=shac_home_organisation_01,
                                   organisation=org_01,
                                   created_by="urn:admin",
                                   updated_by="urn:admin")
    sho_02 = SchacHomeOrganisation(name=shac_home_organisation_02,
                                   organisation=org_02,
                                   created_by="urn:admin",
                                   updated_by="urn:admin")
    _persist(db, sho_01, sho_02)

    # Creeate orgasnisation memberships
    org_membership_user_01 = OrganisationMembership(role="admin",
                                                    user=user_01,
                                                    organisation=org_01)
    org_membership_user_02 = OrganisationMembership(role="admin",
                                                    user=user_02,
                                                    organisation=org_02)
    _persist(db, org_membership_user_01, org_membership_user_02)

    # Create Services
    service_01 = Service(entity_id="service_01_entity_id",
                         name="Mail",
                         logo=read_image("service_01.jpg"),
                         contact_email=user_01_mail,
                         public_visible=True,
                         automatic_connection_allowed=True,
                         allowed_organisations=[org_01, org_02],
                         abbreviation="svc01",
                         accepted_user_policy="https://google.nl",
                         privacy_policy="https://privacy.org",
                         security_email="sec@service_01.nl")
    service_02 = Service(entity_id="service_02_entity_id",
                         name="Wireless",
                         logo=read_image("service_02.png"),
                         contact_email=user_02_mail,
                         public_visible=True,
                         automatic_connection_allowed=True,
                         allowed_organisations=[org_01, org_02],
                         abbreviation="svc02",
                         accepted_user_policy="https://google.nl",
                         privacy_policy="https://privacy.org",
                         security_email="sec@service_02.nl")
    _persist(db, service_01, service_02)

    # Add Service memberships
    service_membership_user_01 = ServiceMembership(role="admin",
                                                   user=user_01,
                                                   service=service_01)
    service_membership_user_02 = ServiceMembership(role="admin",
                                                   user=user_02,
                                                   service=service_02)
    _persist(db, service_membership_user_01, service_membership_user_02)

    # Add service groups
    service_group_01 = ServiceGroup(name="Mail users",
                                    short_name="mail",
                                    auto_provision_members=True,
                                    description="Mail users group",
                                    service=service_01)
    service_group_02 = ServiceGroup(name="Wireless users",
                                    short_name="wireless",
                                    auto_provision_members=True,
                                    description="Wireless users group",
                                    service=service_02)
    _persist(db, service_group_01, service_group_02)

    # Add services to orgs
    org_01.services.append(service_01)
    org_02.services.append(service_02)

    # Create Collaborations
    tag_org_01 = Tag(tag_value="tag_org_01")
    tag_org_02 = Tag(tag_value="tag_org_02")
    _persist(db, tag_org_01, tag_org_02)

    collab_01_shortname = "collab01"
    collab_02_shortname = "collab02"

    collab_01 = Collaboration(name="AI Computing Group",
                              identifier=str(uuid.uuid4()),
                              global_urn=f"ucc:{collab_01_shortname}",
                              description="Artifical Intelligence computing",
                              logo=read_image("collab_01.jpg"),
                              organisation=org_01, services=[service_01, service_02],
                              join_requests=[], invitations=[],
                              tags=[tag_org_01],
                              short_name=collab_01_shortname,
                              website_url="https://www.google.nl",
                              accepted_user_policy="https://www.google.nl",
                              disclose_email_information=True,
                              disclose_member_information=True)
    collab_02 = Collaboration(name="Genomics Group",
                              identifier=str(uuid.uuid4()),
                              global_urn=f"ucc:{collab_02_shortname}",
                              description="Genomics computing",
                              logo=read_image("collab_02.jpg"),
                              organisation=org_02, services=[service_01, service_02],
                              join_requests=[], invitations=[],
                              tags=[tag_org_02],
                              short_name=collab_02_shortname,
                              website_url="https://www.google.nl",
                              accepted_user_policy="https://www.google.nl",
                              disclose_email_information=True,
                              disclose_member_information=True)
    _persist(db, collab_01, collab_02)

    # Make users member of collabiration
    user_01_collab_01 = CollaborationMembership(role="member", user=user_01, collaboration=collab_01)
    user_02_collab_01 = CollaborationMembership(role="admin", user=user_02, collaboration=collab_01)
    user_01_collab_02 = CollaborationMembership(role="member", user=user_01, collaboration=collab_02)
    user_02_collab_02 = CollaborationMembership(role="admin", user=user_02, collaboration=collab_02)
    _persist(db, user_01_collab_01, user_02_collab_01, user_01_collab_02, user_02_collab_02)

    # Add collaboration groups
    group_users_shortname = "users"
    group_admins_shortname = "admins"

    group_01 = Group(name="Users",
                     short_name=group_users_shortname,
                     global_urn=f"uuc:{collab_01_shortname}:{group_users_shortname}",
                     identifier=str(uuid.uuid4()),
                     auto_provision_members=False,
                     description=f"Artifical Intelligence {group_users_shortname}",
                     collaboration=collab_01,
                     collaboration_memberships=[user_01_collab_01,
                                                user_02_collab_01])
    group_02 = Group(name="Admins",
                     short_name=group_admins_shortname,
                     global_urn=f"uuc:{collab_01_shortname}:{group_admins_shortname}",
                     identifier=str(uuid.uuid4()),
                     auto_provision_members=False,
                     description=f"Artifical Intelligence {group_admins_shortname}",
                     collaboration=collab_01,
                     collaboration_memberships=[user_02_collab_01])
    group_03 = Group(name="Users",
                     short_name=group_users_shortname,
                     global_urn=f"uuc:{collab_02_shortname}:{group_users_shortname}",
                     identifier=str(uuid.uuid4()),
                     auto_provision_members=False,
                     description=f"Genomics computing {group_users_shortname}",
                     collaboration=collab_02,
                     collaboration_memberships=[user_01_collab_02,
                                                user_02_collab_02])
    group_04 = Group(name="Admins",
                     short_name=group_admins_shortname,
                     global_urn=f"uuc:{collab_02_shortname}:{group_admins_shortname}",
                     identifier=str(uuid.uuid4()),
                     auto_provision_members=False,
                     description=f"Genomics computing {group_admins_shortname}",
                     collaboration=collab_02,
                     collaboration_memberships=[user_02_collab_02])
    _persist(db, group_01, group_02, group_03, group_04)

    db.session.commit()


logging.basicConfig(level=logging.DEBUG, stream=sys.stdout)
logger = logging.getLogger()

config_file_location = os.environ.get("CONFIG", "config/config.yml")
config = munchify(yaml.load(read_file(config_file_location), Loader=yaml.FullLoader))

app = Flask(__name__)
app.app_context().push()
app.config["SQLALCHEMY_DATABASE_URI"] = config.database.uri
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)
app.db = db

Migrate(app, db)
result = None

while result is None:
    logger.info("Waiting...")
    try:
        result = db.engine.execute(text("SELECT 1"))
    except OperationalError:
        logger.info("Waiting for the database...")
        time.sleep(1)

db_migrations(config.database.uri)

seed(db, app.config)
