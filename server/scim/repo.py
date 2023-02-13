from server.db.domain import User, CollaborationMembership, Collaboration, Service, Organisation
from server.db.models import flatten, unique_model_objects


def all_scim_users_by_service(service):
    users_from_collaborations = User.query \
        .join(User.collaboration_memberships) \
        .join(CollaborationMembership.collaboration) \
        .join(Collaboration.services) \
        .filter(Service.id == service.id) \
        .all()
    users_from_organisations = User.query \
        .join(User.collaboration_memberships) \
        .join(CollaborationMembership.collaboration) \
        .join(Collaboration.organisation) \
        .join(Organisation.services) \
        .filter(Service.id == service.id) \
        .all()
    users = unique_model_objects(users_from_collaborations + users_from_organisations)
    return users


def all_scim_groups_by_service(service):
    service_collaborations = Collaboration.query \
        .join(Collaboration.services) \
        .filter(Service.id == service.id) \
        .all()
    service_organisation_collaborations = Collaboration.query \
        .join(Collaboration.organisation) \
        .join(Organisation.services) \
        .filter(Service.id == service.id) \
        .all()
    collaborations = unique_model_objects(service_collaborations + service_organisation_collaborations)
    groups = flatten(co.groups for co in collaborations)
    return collaborations + groups
