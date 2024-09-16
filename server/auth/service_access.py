from server.db.domain import Service, User


def has_user_access_to_service(service: Service, user: User):
    if user is None or user.suspended or service is None:
        return False
    if service.non_member_users_access_allowed:
        return True

    collaboration_identifiers = [m.collaboration.id for m in user.collaboration_memberships if m.is_active()]
    return any([c for c in service.collaborations if c.id in collaboration_identifiers])
