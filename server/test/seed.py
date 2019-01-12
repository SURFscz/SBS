import datetime
import random

from server.db.db import User, Organisation, OrganisationMembership, Service, Collaboration, CollaborationMembership, \
    JoinRequest, Invitation, metadata, UserServiceProfile, AuthorisationGroup

invitation_hash = str(random.getrandbits(512))


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
    mary = User(uid="urn:mary", name="Mary Doe", email="mary@example.org")
    admin = User(uid="urn:admin", name="The Boss", email="boss@example.org")
    _persist(db, john, mary, admin)

    uuc = Organisation(name="UUC", email="john.doe@uuc.org", created_by="urn:admin", updated_by="urnadmin")
    _persist(db, uuc)

    organisation_membership = OrganisationMembership(role="admin", user=john, organisation=uuc)
    _persist(db, organisation_membership)

    mail = Service(entity_id="https://mail", name="mail", contact_email=john.email)
    network = Service(entity_id="https://network", name="network", status="pending")
    _persist(db, mail, network)

    ai_computing = Collaboration(name="AI computing",
                                 description="Artifical Intelligence computing for the Unincorporated Urban Community",
                                 organisation=uuc, services=[mail, network],
                                 join_requests=[], invitations=[])
    _persist(db, ai_computing)

    john_ai_computing = CollaborationMembership(role="researcher", user=john, collaboration=ai_computing)
    admin_ai_computing = CollaborationMembership(role="admin", user=admin, collaboration=ai_computing)
    _persist(db, john_ai_computing, admin_ai_computing)

    user_service_profile = UserServiceProfile(service=network, collaboration_membership=john_ai_computing,
                                              name="John Doe")
    _persist(db, user_service_profile)

    authorisation_group = AuthorisationGroup(name="auth_group", collaboration=ai_computing, services=[network],
                                             collaboration_memberships=[john_ai_computing])
    _persist(db, authorisation_group)

    join_request = JoinRequest(message="Please...", user=john, collaboration=ai_computing)
    _persist(db, join_request)

    invitation = Invitation(hash=invitation_hash, invitee_email="curious@ex.org", collaboration=ai_computing,
                            expiry_date=datetime.date.today() + datetime.timedelta(days=14), user=admin)
    _persist(db, invitation)

    db.session.commit()
