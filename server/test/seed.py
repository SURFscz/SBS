from server.db.db import User, Organisation, OrganisationMembership, Service, Collaboration, CollaborationMembership, \
    JoinRequest, Invitation, services_users_collaborations_association, services_collaborations_association, metadata
import random
import datetime

join_request_hash = str(random.getrandbits(512))
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
    _persist(db, john, mary)

    uuc = Organisation(name="UUC", email="john.doe@uuc.org", created_by="urn:admin", updated_by="urnadmin")
    _persist(db, uuc)

    membership = OrganisationMembership(role="admin", user=john, organisation=uuc)
    _persist(db, membership)

    mail = Service(name="mail", contact_email=john.email)
    network = Service(name="network", status="pending")
    _persist(db, mail)
    _persist(db, network)

    ai_computing = Collaboration(name="AI computing", organisation=uuc, services=[mail, network],
                                 join_requests=[], invitations=[])
    _persist(db, ai_computing)

    john_ai_computing = CollaborationMembership(role="researcher", user=john, collaboration=ai_computing,
                                                services=[network])
    _persist(db, john_ai_computing)

    join_request = JoinRequest(hash=join_request_hash, message="Please...", user=john, collaboration=ai_computing)
    _persist(db, join_request)

    invitation = Invitation(hash=invitation_hash, user_email="curious@ex.org", collaboration=ai_computing,
                            expiry_date=datetime.date.today() + datetime.timedelta(days=14))
    _persist(db, invitation)

    db.session.commit()
