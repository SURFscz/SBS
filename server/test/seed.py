import datetime
import uuid
from secrets import token_urlsafe

from server.db.db import User, Organisation, OrganisationMembership, Service, Collaboration, CollaborationMembership, \
    JoinRequest, Invitation, metadata, UserServiceProfile, AuthorisationGroup, OrganisationInvitation
from server.db.defaults import default_expiry_date

join_request_reference = "Dr. Johnson"

the_boss_name = "The Boss"

john_name = "John Doe"
james_name = "James Byrd"

organisation_invitation_hash = token_urlsafe()
organisation_invitation_expired_hash = token_urlsafe()

invitation_hash_curious = token_urlsafe()
invitation_hash_no_way = token_urlsafe()

collaboration_ai_computing_uuid = str(uuid.uuid4())
ai_computing_name = "AI computing"
uuc_name = "UUC"
collaboration_uva_researcher_uuid = str(uuid.uuid4())

uva_research_name = "UVA UCC research"

service_mail_name = "Mail Services"
service_mail_entity_id = "https://mail"

service_network_name = "Network Services"
service_network_entity_id = "https://network"
service_storage_name = "Storage"
service_wireless_name = "Wireless"
service_cloud_name = "Cloud"

ai_researchers_authorisation = "AI researchers"
ai_researchers_authorisation_short_name = "ai_res"


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

    john = User(uid="urn:john", name=john_name, email="john@example.org")
    peter = User(uid="urn:peter", name="Peter Doe", email="peter@example.org")
    mary = User(uid="urn:mary", name="Mary Doe", email="mary@example.org")
    admin = User(uid="urn:admin", name=the_boss_name, email="boss@example.org")
    roger = User(uid="urn:roger", name="Roger Doe", email="roger@example.org")
    harry = User(uid="urn:harry", name="Harry Doe", email="harry@example.org")
    james = User(uid="urn:james", name=james_name, email="james@example.org")
    sarah = User(uid="urn:sarah", name="Sarah Cross", email="sarah@uva.org")
    jane = User(uid="urn:jane", name="Jane Doe", email="jane@ucc.org")

    _persist(db, john, mary, peter, admin, roger, harry, james, sarah, jane)

    uuc = Organisation(name=uuc_name, tenant_identifier="https://uuc", description="Unincorporated Urban Community",
                       created_by="urn:admin",
                       updated_by="urnadmin")
    uva = Organisation(name="Amsterdam UVA", tenant_identifier="https://uva", description="University of Amsterdam",
                       created_by="urn:admin",
                       updated_by="urnadmin")
    _persist(db, uuc, uva)

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
    wiki = Service(entity_id="https://wiki", name="Wiki", description="No more wiki's please")
    network = Service(entity_id=service_network_entity_id, name=service_network_name,
                      description="Network enabling service SSH access", address="Some address", status="active",
                      uri="https://uri", identity_type="SSH KEY", accepted_user_policy="https://aup",
                      contact_email="help@example.org")
    _persist(db, mail, wireless, cloud, storage, wiki, network)

    ai_computing = Collaboration(name=ai_computing_name,
                                 identifier=collaboration_ai_computing_uuid,
                                 description="Artifical Intelligence computing for the Unincorporated Urban Community",
                                 organisation=uuc, services=[mail, network], enrollment="Form",
                                 join_requests=[], invitations=[], access_type="open")
    uva_research = Collaboration(name=uva_research_name,
                                 identifier=collaboration_uva_researcher_uuid,
                                 description="University of Amsterdam Research - Urban Crowd Control",
                                 organisation=uva, services=[storage, wiki],
                                 join_requests=[], invitations=[])
    _persist(db, ai_computing, uva_research)

    john_ai_computing = CollaborationMembership(role="member", user=john, collaboration=ai_computing)
    admin_ai_computing = CollaborationMembership(role="admin", user=admin, collaboration=ai_computing)
    jane_ai_computing = CollaborationMembership(role="member", user=jane, collaboration=ai_computing)
    sarah_ai_computing = CollaborationMembership(role="member", user=sarah, collaboration=ai_computing)

    roger_uva_research = CollaborationMembership(role="member", user=roger, collaboration=uva_research)
    peter_uva_research = CollaborationMembership(role="member", user=peter, collaboration=uva_research)
    sarah_uva_research = CollaborationMembership(role="admin", user=sarah, collaboration=uva_research)
    _persist(db, john_ai_computing, admin_ai_computing, roger_uva_research, peter_uva_research, sarah_uva_research,
             jane_ai_computing, sarah_ai_computing)

    authorisation_group_researchers = AuthorisationGroup(name=ai_researchers_authorisation,
                                                         short_name=ai_researchers_authorisation_short_name,
                                                         uri="https://ai/researchers",
                                                         status="active",
                                                         description="Artifical computing researchers",
                                                         collaboration=ai_computing, services=[network],
                                                         collaboration_memberships=[john_ai_computing,
                                                                                    jane_ai_computing])
    authorisation_group_developers = AuthorisationGroup(name="AI developers",
                                                        uri="https://ai/developers",
                                                        short_name="ai_dev",
                                                        status="in_active",
                                                        description="Artifical computing developers",
                                                        collaboration=ai_computing, services=[],
                                                        collaboration_memberships=[john_ai_computing])
    _persist(db, authorisation_group_researchers, authorisation_group_developers)

    john_user_service_profile = UserServiceProfile(service=network, authorisation_group=authorisation_group_researchers,
                                                   user=john, name=john_name, telephone_number="0612345678",
                                                   identifier=str(uuid.uuid4()),
                                                   ssh_key="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC/nvjea1zJJNCnyUfT6HLcHD"
                                                           "hwCMp7uqr4BzxhDAjBnjWcgW4hZJvtLTqCLspS6mogCq2d0/31DU4DnGb2MO28"
                                                           "gk74MiVBtAQWI5+TsO5QHupO3V6aLrKhmn8xn1PKc9JycgjOa4BMQ1meomn3Z"
                                                           "mph6oo87MCtF2w75cxYEBJ9dJgHzZsn9mw+w8Z3H1vYnkcBT/i2MIK+qfsue/t"
                                                           "vEe8ybi+26bGQIZIPDcd+OmDUBxDLWyBwCbVOyRL5M6ywnWJINLdpIwfqCUk24"
                                                           "J1q1qiJ5eZu0m0uDcG5KRzgZ+grnSSYBwCx1xCunoGjMg7iwxEMgScD02nKtii"
                                                           "jxEpu8soL okke@Mikes-MBP-2.fritz.box")

    jane_user_service_profile = UserServiceProfile(service=network, authorisation_group=authorisation_group_researchers,
                                                   user=jane, identifier=str(uuid.uuid4()))

    _persist(db, john_user_service_profile, jane_user_service_profile)

    join_request_john = JoinRequest(message="Please...", reference=join_request_reference, user=john,
                                    collaboration=ai_computing)
    join_request_peter = JoinRequest(message="Please...", user=peter, collaboration=ai_computing)
    join_request_mary = JoinRequest(message="Please...", user=mary, collaboration=ai_computing)

    _persist(db, join_request_john, join_request_peter, join_request_mary)

    invitation = Invitation(hash=invitation_hash_curious, invitee_email="curious@ex.org", collaboration=ai_computing,
                            expiry_date=default_expiry_date(), user=admin, message="Please join...",
                            intended_role="member")
    invitation_noway = Invitation(hash=invitation_hash_no_way, invitee_email="noway@ex.org", collaboration=ai_computing,
                                  expiry_date=datetime.date.today() - datetime.timedelta(days=21), user=admin,
                                  intended_role="member",
                                  message="Let me please join as I really, really, really \n really, "
                                          "really, really \n want to...")
    _persist(db, invitation, invitation_noway)

    db.session.commit()
