import I18n from "i18n-js";

export function userRole(user, {organisation_id = null, collaboration_id = null, service_id = null} = {}) {
    return "Deprecated"
}

export const ROLES = {
    PLATFORM_ADMIN: "platformAdmin",
    ORG_ADMIN: "orgAdmin",
    ORG_MANAGER: "orgManager",
    COLL_ADMIN: "coAdmin",
    COLL_MEMBER: "coMember",
    USER: "user"
}

const ROLES_HIERARCHY = {
    [ROLES.PLATFORM_ADMIN]: 1,
    [ROLES.ORG_ADMIN]: 2,
    [ROLES.ORG_MANAGER]: 3,
    [ROLES.COLL_ADMIN]: 4,
    [ROLES.COLL_MEMBER]: 5,
    [ROLES.USER]: 6
}

export function isUserAllowed(minimalRole, user, organisation_id = null, collaboration_id = null) {
    if (user.admin) {
        return true;
    }
    const adminOrganisationMembership = organisation_id ?
        user.organisation_memberships.find(m => m.organisation_id === organisation_id && m.role === "admin") :
        user.organisation_memberships.find(m => m.role === "admin");
    if (adminOrganisationMembership) {
        return ROLES_HIERARCHY[ROLES.ORG_ADMIN] <= ROLES_HIERARCHY[minimalRole];
    }

    const managerOrganisationMembership = organisation_id ?
        user.organisation_memberships.find(m => m.organisation_id === organisation_id && m.role === "manager") :
        user.organisation_memberships.find(m => m.role === "manager");
    if (managerOrganisationMembership) {
        return ROLES_HIERARCHY[ROLES.ORG_MANAGER] <= ROLES_HIERARCHY[minimalRole];
    }

    const adminCollaborationMembership = collaboration_id ?
        user.collaboration_memberships.find(m => m.collaboration_id === collaboration_id && m.role === "admin") :
        user.collaboration_memberships.find(m => m.collaboration_id === collaboration_id);
    if (adminCollaborationMembership) {
        return ROLES_HIERARCHY[ROLES.COLL_ADMIN] <= ROLES_HIERARCHY[minimalRole];
    }

    const memberCollaborationMembership = collaboration_id ?
        user.collaboration_memberships.find(m => m.collaboration_id === collaboration_id && m.role === "member") :
        user.collaboration_memberships.find(m => m.collaboration_id === collaboration_id);
    if (memberCollaborationMembership) {
        return ROLES_HIERARCHY[ROLES.COLL_MEMBER] <= ROLES_HIERARCHY[minimalRole];
    }

    return false;
}

export function rawGlobalUserRole(user) {
    if (user.admin) {
        return ROLES.PLATFORM_ADMIN;
    }
    if (user.organisation_memberships && user.organisation_memberships.find(m => m.role === "admin")) {
        return ROLES.ORG_ADMIN;
    }
    if (user.organisation_memberships && user.organisation_memberships.find(m => m.role === "manager")) {
        return ROLES.ORG_MANAGER;
    }
    if (user.collaboration_memberships && user.collaboration_memberships.find(m => m.role === "admin")) {
        return ROLES.COLL_ADMIN;
    }
    if (user.collaboration_memberships && user.collaboration_memberships.length > 0) {
        return ROLES.COLL_MEMBER;
    }
    return ROLES.USER;
}

export function globalUserRole(user) {
    return I18n.t(`access.${rawGlobalUserRole(user)}`);
}