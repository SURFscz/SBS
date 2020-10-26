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

export function globalUserRole(user) {
    if (user.admin) {
        return I18n.t("access.platformAdmin");
    }
    if (user.organisation_memberships.find(m => m.role === "admin")) {
        return I18n.t("access.orgAdmin");
    }
    if (user.organisation_memberships.find(m => m.role === "manager")) {
        return I18n.t("access.orgAdmin");
    }
    if (user.collaboration_memberships.find(m => m.role === "admin")) {
        return I18n.t("access.coAdmin");
    }
    if (user.collaboration_memberships.length > 0) {
        return I18n.t("access.coMember");
    }
    return I18n.t("access.user");
}