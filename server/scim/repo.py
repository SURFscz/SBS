from server.db.domain import User, CollaborationMembership, Collaboration, Service
from server.db.models import flatten


def all_scim_users_by_service(service):
    return User.query \
        .join(User.collaboration_memberships) \
        .join(CollaborationMembership.collaboration) \
        .join(Collaboration.services) \
        .filter(Service.id == service.id) \
        .all()


def all_scim_groups_by_service(service):
    collaborations = Collaboration.query \
        .join(Collaboration.services) \
        .filter(Service.id == service.id) \
        .all()
    groups = flatten(co.groups for co in collaborations)
    return collaborations + groups
