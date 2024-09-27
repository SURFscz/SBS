from server.db.domain import Service, User


def collaboration_memberships_for_service(service: Service, user: User):
    if user is None or user.suspended or service is None:
        return []
    return [m for m in user.collaboration_memberships if m.is_active() and m.collaboration in service.collaborations]


def has_user_access_to_service(service: Service, user: User):
    if user is None or user.suspended or service is None:
        return False
    if service.non_member_users_access_allowed:
        return True
    if service.access_allowed_by_crm_organisation(user):
        return True
    return bool(collaboration_memberships_for_service(service, user))
