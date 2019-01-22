import datetime
import uuid
from secrets import token_urlsafe

from server.db.db import User, Organisation, OrganisationMembership, Service, Collaboration, CollaborationMembership, \
    JoinRequest, Invitation, metadata, UserServiceProfile, AuthorisationGroup, OrganisationInvitation

organisation_invitation_hash = token_urlsafe()
invitation_hash = token_urlsafe()
collaboration_ai_computing_uuid = str(uuid.uuid4())
ai_computing_name = "AI computing"
uuc_name = "UUC"
collaboration_uva_researcher_uuid = str(uuid.uuid4())


def _persist(db, *objs):
    required_attrs = ["created_by", "updated_by"]
    for obj in objs:
        for attr in required_attrs:
            if hasattr(obj, attr):
                setattr(obj, attr, "urn:admin")
        db.session.add(obj)


def seed(db):
    for table in reversed(metadata.sorted_tables):
        db.session.execute(table.delete())
    db.session.commit()

    john = User(uid="urn:john", name="John Doe", email="john@example.org")
    peter = User(uid="urn:peter", name="Peter Doe", email="peter@example.org")
    mary = User(uid="urn:mary", name="Mary Doe", email="mary@example.org")
    admin = User(uid="urn:admin", name="The Boss", email="boss@example.org")
    roger = User(uid="urn:roger", name="Roger Doe", email="roger@example.org")

    _persist(db, john, mary, peter, admin, roger)

    uuc = Organisation(name=uuc_name, tenant_identifier="https://uuc", description="Unincorporated Urban Community",
                       created_by="urn:admin",
                       updated_by="urnadmin")
    uva = Organisation(name="Amsterdam UVA", tenant_identifier="https://uva", description="University of Amsterdam",
                       created_by="urn:admin",
                       updated_by="urnadmin")
    _persist(db, uuc, uva)

    organisation_invitation = OrganisationInvitation(message="Please join", hash=organisation_invitation_hash,
                                                     invitee_email="roger@example.org", organisation=uuc, user=john)
    _persist(db, organisation_invitation)

    organisation_membership = OrganisationMembership(role="admin", user=john, organisation=uuc)
    _persist(db, organisation_membership)

    mail = Service(entity_id="https://mail", name="mail", contact_email=john.email)
    network = Service(entity_id="https://network", name="network", description="Network enabling service SSH access",
                      status="pending")
    _persist(db, mail, network)

    ai_computing = Collaboration(name=ai_computing_name,
                                 identifier=collaboration_ai_computing_uuid,
                                 description="Artifical Intelligence computing for the Unincorporated Urban Community",
                                 organisation=uuc, services=[mail, network],
                                 join_requests=[], invitations=[])
    uva_research = Collaboration(name="UVA UCC research",
                                 identifier=collaboration_uva_researcher_uuid,
                                 description="University of Amsterdam Research - Urban Crowd Control",
                                 organisation=uva, services=[],
                                 join_requests=[], invitations=[])
    _persist(db, ai_computing, uva_research)

    john_ai_computing = CollaborationMembership(role="researcher", user=john, collaboration=ai_computing)
    admin_ai_computing = CollaborationMembership(role="admin", user=admin, collaboration=ai_computing)
    _persist(db, john_ai_computing, admin_ai_computing)

    user_service_profile = UserServiceProfile(service=network, collaboration_membership=john_ai_computing,
                                              name="John Doe", telephone_number="0612345678",
                                              ssh_key="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC/nvjea1zJJNCnyUfT6HLcHD"
                                                      "hwCMp7uqr4BzxhDAjBnjWcgW4hZJvtLTqCLspS6mogCq2d0/31DU4DnGb2MO28"
                                                      "gk74MiVBtAQWI5+TsO5QHupO3V6aLrKhmn8xn1PKc9JycgjOa4BMQ1meomn3Z"
                                                      "mph6oo87MCtF2w75cxYEBJ9dJgHzZsn9mw+w8Z3H1vYnkcBT/i2MIK+qfsue/t"
                                                      "vEe8ybi+26bGQIZIPDcd+OmDUBxDLWyBwCbVOyRL5M6ywnWJINLdpIwfqCUk24"
                                                      "J1q1qiJ5eZu0m0uDcG5KRzgZ+grnSSYBwCx1xCunoGjMg7iwxEMgScD02nKtii"
                                                      "jxEpu8soL okke@Mikes-MBP-2.fritz.box")
    _persist(db, user_service_profile)

    authorisation_group = AuthorisationGroup(name="auth_group", collaboration=ai_computing, services=[network],
                                             collaboration_memberships=[john_ai_computing])
    _persist(db, authorisation_group)

    join_request_john = JoinRequest(message="Please...", reference="Dr. Johnson", user=mary, collaboration=ai_computing)
    join_request_peter = JoinRequest(message="Please...", user=peter, collaboration=ai_computing)
    _persist(db, join_request_john, join_request_peter)

    invitation = Invitation(hash=invitation_hash, invitee_email="curious@ex.org", collaboration=ai_computing,
                            expiry_date=datetime.date.today() + datetime.timedelta(days=14), user=admin,
                            message="Please join...")
    _persist(db, invitation)

    db.session.commit()
