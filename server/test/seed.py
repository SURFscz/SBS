# -*- coding: future_fstrings -*-
import datetime
import hashlib
import uuid
from secrets import token_urlsafe

from server.db.db import User, Organisation, OrganisationMembership, Service, Collaboration, CollaborationMembership, \
    JoinRequest, Invitation, metadata, Group, OrganisationInvitation, ApiKey
from server.db.defaults import default_expiry_date

join_request_reference = "Dr. Johnson"

the_boss_name = "The Boss"
roger_name = "Roger Doe"
john_name = "John Doe"
james_name = "James Byrd"
sarah_name = "Sarah Cross"

schac_home_organisation = "scz.lab.example.org"

organisation_invitation_hash = token_urlsafe()
organisation_invitation_expired_hash = token_urlsafe()

invitation_hash_curious = token_urlsafe()
invitation_hash_no_way = token_urlsafe()
invitation_hash_uva = token_urlsafe()

collaboration_ai_computing_uuid = str(uuid.uuid4())
ai_computing_name = "AI computing"
ai_computing_short_name = "ai_computing"

uuc_name = "UUC"
uuc_secret = token_urlsafe()
uuc_hashed_secret = hashlib.sha256(bytes(uuc_secret, "utf-8")).hexdigest()

amsterdam_uva_name = "Amsterdam UVA"

collaboration_uva_researcher_uuid = str(uuid.uuid4())

uva_research_name = "UVA UCC research"

uu_disabled_join_request_name = "UU"

service_mail_name = "Mail Services"
service_mail_entity_id = "https://mail"

service_network_name = "Network Services"
service_network_entity_id = "https://network"
service_storage_name = "Storage"
service_wireless_name = "Wireless"
service_cloud_name = "Cloud"

ai_researchers_group = "AI researchers"
ai_researchers_group_short_name = "ai_res"
group_science_name = "Science"


def _persist(db, *objs):
    required_attrs = ["created_by", "updated_by"]
    for obj in objs:
        for attr in required_attrs:
            if hasattr(obj, attr):
                setattr(obj, attr, "urn:admin")
        db.session.add(obj)


def seed(db):
    tables = reversed(metadata.sorted_tables)
    for table in tables:
        db.session.execute(table.delete())
    db.session.commit()

    john = User(uid="urn:john", name=john_name, email="john@example.org", username="john",
                ssh_key="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC/nvjea1zJJNCnyUfT6HLcHD"
                        "hwCMp7uqr4BzxhDAjBnjWcgW4hZJvtLTqCLspS6mogCq2d0/31DU4DnGb2MO28"
                        "gk74MiVBtAQWI5+TsO5QHupO3V6aLrKhmn8xn1PKc9JycgjOa4BMQ1meomn3Z"
                        "mph6oo87MCtF2w75cxYEBJ9dJgHzZsn9mw+w8Z3H1vYnkcBT/i2MIK+qfsue/t"
                        "vEe8ybi+26bGQIZIPDcd+OmDUBxDLWyBwCbVOyRL5M6ywnWJINLdpIwfqCUk24"
                        "J1q1qiJ5eZu0m0uDcG5KRzgZ+grnSSYBwCx1xCunoGjMg7iwxEMgScD02nKtii"
                        "jxEpu8soL okke@Mikes-MBP-2.fritz.box")
    peter = User(uid="urn:peter", name="Peter Doe", email="peter@example.org")
    mary = User(uid="urn:mary", name="Mary Doe", email="mary@example.org",
                schac_home_organisation=schac_home_organisation)
    admin = User(uid="urn:admin", name=the_boss_name, email="boss@example.org")
    roger = User(uid="urn:roger", name=roger_name, email="roger@example.org",
                 schac_home_organisation=schac_home_organisation)
    harry = User(uid="urn:harry", name="Harry Doe", email="harry@example.org")
    james = User(uid="urn:james", name=james_name, email="james@example.org",
                 ssh_key="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC/nvjea1zJJNCnyUfT6HLcHD"
                         "hwCMp7uqr4BzxhDAjBnjWcgW4hZJvtLTqCLspS6mogCq2d0/31DU4DnGb2MO28"
                         "gk74MiVBtAQWI5+TsO5QHupO3V6aLrKhmn8xn1PKc9JycgjOa4BMQ1meomn3Z"
                         "mph6oo87MCtF2w75cxYEBJ9dJgHzZsn9mw+w8Z3H1vYnkcBT/i2MIK+qfsue/t"
                         "vEe8ybi+26bGQIZIPDcd+OmDUBxDLWyBwCbVOyRL5M6ywnWJINLdpIwfqCUk24"
                         "J1q1qiJ5eZu0m0uDcG5KRzgZ+grnSSYBwCx1xCunoGjMg7iwxEMgScD02nKtii"
                         "jxEpu8soL okke@Mikes-MBP-2.fritz.box")
    sarah = User(uid="urn:sarah", name=sarah_name, email="sarah@uva.org")
    jane = User(uid="urn:jane", name="Jane Doe", email="jane@ucc.org")

    _persist(db, john, mary, peter, admin, roger, harry, james, sarah, jane)

    uuc = Organisation(name=uuc_name, short_name="uuc",
                       description="Unincorporated Urban Community",
                       created_by="urn:admin", updated_by="urnadmin")
    uva = Organisation(name=amsterdam_uva_name, description="University of Amsterdam",
                       created_by="urn:admin", updated_by="urnadmin", short_name="uva",
                       schac_home_organisation=schac_home_organisation)
    _persist(db, uuc, uva)

    api_key = ApiKey(hashed_secret=uuc_hashed_secret, organisation=uuc, created_by="urn:admin", updated_by="urn:admin")
    _persist(db, api_key)
    organisation_invitation_roger = OrganisationInvitation(message="Please join", hash=organisation_invitation_hash,
                                                           expiry_date=datetime.date.today() + datetime.timedelta(
                                                               days=14),
                                                           invitee_email="roger@example.org", organisation=uuc,
                                                           user=john)
    organisation_invitation_pass = OrganisationInvitation(message="Let me please join as I "
                                                                  "really, really, really \n really, "
                                                                  "really, really \n want to...",
                                                          hash=organisation_invitation_expired_hash,
                                                          expiry_date=datetime.date.today() - datetime.timedelta(
                                                              days=21),
                                                          invitee_email="pass@example.org", organisation=uuc, user=john)
    _persist(db, organisation_invitation_roger, organisation_invitation_pass)

    organisation_membership_john = OrganisationMembership(role="admin", user=john, organisation=uuc)
    organisation_membership_mary = OrganisationMembership(role="admin", user=mary, organisation=uuc)
    organisation_membership_harry = OrganisationMembership(role="admin", user=harry, organisation=uuc)
    _persist(db, organisation_membership_john, organisation_membership_mary, organisation_membership_harry)

    mail = Service(entity_id=service_mail_entity_id, name=service_mail_name, contact_email=john.email)
    wireless = Service(entity_id="https://wireless", name=service_wireless_name, description="Network Wireless Service")
    cloud = Service(entity_id="https://cloud", name=service_cloud_name, description="SARA Cloud Service")
    storage = Service(entity_id="https://storage", name=service_storage_name, description="SURF Storage Service")
    wiki = Service(entity_id="https://wiki", name="Wiki", description="No more wiki's please",
                   uri="https://wiki.surfnet.nl/display/SCZ/Collaboration+Management+System+%28Dutch%3A+"
                       "SamenwerkingBeheerSysteem%29+-+SBS#CollaborationManagementSystem"
                       "(Dutch:SamenwerkingBeheerSysteem)-SBS-DevelopmentofnewopensourceCollaborationManagementSystem")
    network = Service(entity_id=service_network_entity_id, name=service_network_name,
                      description="Network enabling service SSH access", address="Some address", status="active",
                      uri="https://uri", identity_type="SSH KEY", accepted_user_policy="https://aup",
                      contact_email="help@example.org")
    _persist(db, mail, wireless, cloud, storage, wiki, network)

    ai_computing = Collaboration(name=ai_computing_name,
                                 identifier=collaboration_ai_computing_uuid,
                                 description="Artifical Intelligence computing for the Unincorporated Urban Community",
                                 organisation=uuc, services=[mail, network], enrollment="Form",
                                 join_requests=[], invitations=[], access_type="open",
                                 short_name=ai_computing_short_name,
                                 accepted_user_policy="https://www.google.nl")
    uva_research = Collaboration(name=uva_research_name,
                                 identifier=collaboration_uva_researcher_uuid,
                                 description="University of Amsterdam Research - Urban Crowd Control",
                                 organisation=uva, services=[cloud, storage, wiki],
                                 join_requests=[], invitations=[])
    uu_disabled_join_request = Collaboration(name=uu_disabled_join_request_name,
                                             identifier=str(uuid.uuid4()),
                                             description="UU", disable_join_requests=True, organisation=uva,
                                             services=[],
                                             join_requests=[], invitations=[])
    _persist(db, ai_computing, uva_research, uu_disabled_join_request)

    john_ai_computing = CollaborationMembership(role="member", user=john, collaboration=ai_computing)
    admin_ai_computing = CollaborationMembership(role="admin", user=admin, collaboration=ai_computing)
    jane_ai_computing = CollaborationMembership(role="member", user=jane, collaboration=ai_computing)
    sarah_ai_computing = CollaborationMembership(role="member", user=sarah, collaboration=ai_computing)

    roger_uva_research = CollaborationMembership(role="member", user=roger, collaboration=uva_research)
    peter_uva_research = CollaborationMembership(role="member", user=peter, collaboration=uva_research)
    sarah_uva_research = CollaborationMembership(role="admin", user=sarah, collaboration=uva_research)
    _persist(db, john_ai_computing, admin_ai_computing, roger_uva_research, peter_uva_research, sarah_uva_research,
             jane_ai_computing, sarah_ai_computing)

    group_researchers = Group(name=ai_researchers_group,
                              short_name=ai_researchers_group_short_name,
                              auto_provision_members=False,
                              description="Artifical computing researchers",
                              collaboration=ai_computing,
                              collaboration_memberships=[john_ai_computing,
                                                         jane_ai_computing])
    group_developers = Group(name="AI developers",
                             short_name="ai_dev",
                             auto_provision_members=False,
                             description="Artifical computing developers",
                             collaboration=ai_computing,
                             collaboration_memberships=[john_ai_computing])
    group_science = Group(name=group_science_name,
                          short_name="science",
                          auto_provision_members=True,
                          description="Science",
                          collaboration=uva_research,
                          collaboration_memberships=[roger_uva_research])
    _persist(db, group_researchers, group_developers, group_science)

    db.session.commit()

    join_request_john = JoinRequest(message="Please...", reference=join_request_reference, user=john,
                                    collaboration=ai_computing, hash=token_urlsafe())
    join_request_peter = JoinRequest(message="Please...", user=peter, collaboration=ai_computing, hash=token_urlsafe())
    join_request_mary = JoinRequest(message="Please...", user=mary, collaboration=ai_computing, hash=token_urlsafe())
    join_request_uva_research = JoinRequest(message="Please...", user=james, collaboration=uva_research,
                                            hash=token_urlsafe())

    _persist(db, join_request_john, join_request_peter, join_request_mary, join_request_uva_research)

    invitation = Invitation(hash=invitation_hash_curious, invitee_email="curious@ex.org", collaboration=ai_computing,
                            expiry_date=default_expiry_date(), user=admin, message="Please join...",
                            intended_role="admin")
    invitation_uva = Invitation(hash=invitation_hash_uva, invitee_email="uva@ex.org", collaboration=uva_research,
                                expiry_date=default_expiry_date(), user=admin, message="Please join...",
                                intended_role="member", groups=[group_science])
    invitation_noway = Invitation(hash=invitation_hash_no_way, invitee_email="noway@ex.org", collaboration=ai_computing,
                                  expiry_date=datetime.date.today() - datetime.timedelta(days=21), user=admin,
                                  intended_role="member",
                                  message="Let me please join as I really, really, really \n really, "
                                          "really, really \n want to...")
    _persist(db, invitation, invitation_uva, invitation_noway)

    db.session.commit()
