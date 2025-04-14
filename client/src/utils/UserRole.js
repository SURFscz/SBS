import I18n from "../locale/I18n";
import {ChipType} from "@surfnet/sds";
import {isEmpty} from "./Utils";
import {
    COLLABORATION_REQUEST_TYPE,
    JOIN_REQUEST_TYPE,
    SERVICE_CONNECTION_REQUEST_TYPE,
    SERVICE_REQUEST_TYPE
} from "./SocketIO";


export const ROLES = {
    PLATFORM_ADMIN: "platformAdmin",
    ORG_ADMIN: "orgAdmin",
    ORG_MANAGER: "orgManager",
    COLL_ADMIN: "coAdmin",
    COLL_MEMBER: "coMember",
    SERVICE_ADMIN: "serviceAdmin",
    SERVICE_MANAGER: "serviceManager",
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
    if (user.guest || !user.organisation_memberships || !user.collaboration_memberships) {
        return false;
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

export function rawGlobalUserRole(user, organisation, collaboration, service, membershipRequired = false) {
    if (user.admin) {
        return ROLES.PLATFORM_ADMIN;
    }
    if (user.organisation_memberships && user.organisation_memberships.find(m => m.role === "admin" &&
        ((!organisation && !membershipRequired) || (organisation && m.organisation_id === organisation.id)))) {
        return ROLES.ORG_ADMIN;
    }
    if (user.organisation_memberships && user.organisation_memberships.find(m => m.role === "manager" &&
        ((!organisation && !membershipRequired) || (organisation && m.organisation_id === organisation.id)))) {
        return ROLES.ORG_MANAGER;
    }
    if (user.service_memberships && user.service_memberships.find(m => m.role === "admin" &&
        ((!service && !membershipRequired) || (service && m.service_id === service.id)))) {
        return ROLES.SERVICE_ADMIN;
    }
    if (user.service_memberships && user.service_memberships.length > 0 &&
        ((!service && !membershipRequired) || (service && user.service_memberships.find(m => m.service_id === service.id)))) {
        return ROLES.SERVICE_MANAGER;
    }
    if (user.collaboration_memberships && user.collaboration_memberships.find(m => m.role === "admin" &&
        ((!collaboration && !membershipRequired) || (collaboration && m.collaboration_id === collaboration.id)))) {
        return ROLES.COLL_ADMIN;
    }
    if (user.collaboration_memberships && user.collaboration_memberships.length > 0 &&
        ((!collaboration && !membershipRequired) || (collaboration && user.collaboration_memberships.find(m => m.collaboration_id === collaboration.id)))) {
        return ROLES.COLL_MEMBER;
    }
    return ROLES.USER;
}

export function isUserServiceAdmin(user, service) {
    return user.service_memberships
        .some(m => !service || (m.service_id === service.id && m.role === "admin"))
}

export function isUserServiceManager(user, service) {
    return user.service_memberships
        .some(m => !service || m.service_id === service.id)
}

export function globalUserRole(user) {
    return I18n.t(`access.${rawGlobalUserRole(user)}`);
}

export function actionMenuUserRole(user, organisation, collaboration, service, membershipRequired) {
    const userRole = rawGlobalUserRole(user, organisation, collaboration, service, membershipRequired);
    return I18n.t(`actionRoles.${userRole}`);
}

export function chipType(entity) {
    const role = entity.invite ? entity.intended_role : entity.role;
    return role === "admin" ? ChipType.Main_400 : role === "manager" ? ChipType.Main_300 : ChipType.Main_100;
}

export function chipTypeForStatus(entity) {
    const status = entity.status;
    return status === "approved" ? ChipType.Status_success : status === "open" ? ChipType.Status_info : ChipType.Status_error;
    // "suspended", "expired", "active"
}

export function getUserRequests(user) {
    const requests = [];
    if (!isEmpty(user.join_requests)) {
        user.join_requests.forEach(joinRequest => joinRequest.requestType = JOIN_REQUEST_TYPE);
        requests.push(...user.join_requests);
    }
    if (!isEmpty(user.collaboration_requests)) {
        user.collaboration_requests.forEach(collaborationRequest => collaborationRequest.requestType = COLLABORATION_REQUEST_TYPE);
        requests.push(...user.collaboration_requests);
    }
    if (!isEmpty(user.service_requests)) {
        user.service_requests.forEach(serviceRequest => serviceRequest.requestType = SERVICE_REQUEST_TYPE);
        requests.push(...user.service_requests);
    }
    if (!isEmpty(user.service_connection_requests)) {
        user.service_connection_requests.forEach(serviceConnectionRequest => serviceConnectionRequest.requestType = SERVICE_CONNECTION_REQUEST_TYPE);
        requests.push(...user.service_connection_requests);
    }
    return requests;
}
