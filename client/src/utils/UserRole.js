import I18n from "i18n-js";

export function userRole(user, {organisation_id = null, collaboration_id = null, service_id = null} = {}) {
    if (user.admin) {
        return I18n.t("access.platformAdmin");
    }
    const organisationMembership = user.organisation_memberships.find(m => m.organisation_id === organisation_id);
    if (organisationMembership && organisationMembership.role === "admin") {
        return I18n.t("access.orgAdmin");
    }
    if (organisationMembership && organisationMembership.role === "manager") {
        return I18n.t("access.orgManager");
    }
    const collaborationMembership = user.collaboration_memberships.find(m => m.collaboration_id === collaboration_id);
    if (collaborationMembership && collaborationMembership.role === "admin") {
        return I18n.t("access.coAdmin");
    }
    if (collaborationMembership && collaborationMembership.role === "member") {
        return I18n.t("access.coMember");
    }
    if (service_id) {
        return I18n.t("access.serviceUser");
    }
    return I18n.t("access.user");
}

export const ROLES = {
    PLATFORM_ADMIN: "platformAdmin",
    ORG_ADMIN: "orgAdmin",
    ORG_MANAGER: "orgManager",
    COLL_ADMIN: "coAdmin",
    COLL_MEMBER: "coMember",
    USER: "user"
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