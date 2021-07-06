import {isEmpty} from "../utils/Utils";
import {emitter} from "../utils/Events";
import I18n from "i18n-js";

let impersonator = null;
emitter.addListener("impersonation", res => {
    impersonator = res.user;
});

const impersonation_attributes = ["id", "uid", "name", "email"];

//Internal API
function validateResponse(showErrorDialog) {
    return res => {
        if (!res.ok) {
            if (res.type === "opaqueredirect") {
                setTimeout(() => window.location.reload(true), 100);
                return res;
            }
            const error = new Error(res.statusText);
            error.response = res;
            if (showErrorDialog && res.status === 401) {
                window.location.reload(true);
            }
            if (showErrorDialog) {
                setTimeout(() => {
                    throw error;
                }, 250);
            }
            throw error;
        }
        const sessionAlive = res.headers.get("x-session-alive");

        if (sessionAlive !== "true") {
            window.location.reload(true);
        }
        return res;

    };
}

// It is not allowed to put non asci characters in HTTP headers
function sanitizeHeader(s) {
    if (typeof s === 'string' || s instanceof String) {
        s = s.replace(/[^\x00-\x7F]/g, ""); // eslint-disable-line no-control-regex
    }
    return isEmpty(s) ? "NON_ASCII_ONLY" : s;
}

function validFetch(path, options, headers = {}, showErrorDialog = true) {
    const contentHeaders = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        ...headers
    };
    if (impersonator) {
        impersonation_attributes.forEach(attr =>
            contentHeaders[`X-IMPERSONATE-${attr.toUpperCase()}`] = sanitizeHeader(impersonator[attr]));
    }
    const fetchOptions = Object.assign({}, {headers: contentHeaders}, options, {
        credentials: "same-origin",
        redirect: "manual"
    });
    return fetch(path, fetchOptions).then(validateResponse(showErrorDialog))
}

function fetchJson(path, options = {}, headers = {}, showErrorDialog = true) {
    return validFetch(path, options, headers, showErrorDialog)
        .then(res => res.json());
}

function postPutJson(path, body, method, showErrorDialog = true) {
    return fetchJson(path, {method: method, body: JSON.stringify(body)}, {}, showErrorDialog);
}

function fetchDelete(path, showErrorDialog = true) {
    return validFetch(path, {method: "delete"}, {}, showErrorDialog);
}

//Base
export function health() {
    return fetchJson("/health");
}

export function config() {
    return fetchJson("/config");
}

//Users
export function authorizationUrl(state) {
    return fetchJson(`/api/users/authorization?state=${encodeURIComponent(state)}`);
}

export function me(config) {
    if (config.local && false) {
        let sub = "urn:john";
        // sub = "urn:sarah";
        // sub = "urn:james";
        // sub = "urn:betty";
        //  sub = "urn:jane";
        //sub = "urn:admin";
        // sub = "urn:suspended";
        //Need to mock a login
        return postPutJson("/api/mock", {sub, "name": "Mock User", "email": "john@example.com"}, "PUT")
            .then(() => fetchJson("/api/users/me", {}, {}, false));
    } else {
        return fetchJson("/api/users/me", {}, {}, false);
    }
}

export function refreshUser() {
    return fetchJson("/api/users/refresh");
}

export function other(uid) {
    return fetchJson(`/api/users/other?uid=${encodeURIComponent(uid)}`);
}

export function findUserById(id) {
    return fetchJson(`/api/users/find_by_id?id=${id}`);
}

export function searchUsers(q, organisationId, collaborationId, limitToOrganisationAdmins, limitToCollaborationAdmins) {
    const organisationIdPart = isEmpty(organisationId) ? "" : `&organisation_id=${organisationId}`;
    const collaborationIdPart = isEmpty(collaborationId) ? "" : `&collaboration_id=${collaborationId}`;
    const organisationAdminsPart = limitToOrganisationAdmins ? "&organisation_admins=true" : "";
    const collaborationAdminsPart = limitToCollaborationAdmins ? "&collaboration_admins=true" : "";
    return fetchJson(`/api/users/search?q=${encodeURIComponent(q)}${organisationIdPart}${collaborationIdPart}${organisationAdminsPart}${collaborationAdminsPart}`);
}

export function updateUser(body) {
    return postPutJson("/api/users", body, "put");
}

export function reportError(error) {
    return postPutJson("/api/users/error", error, "post");
}

export function activateUserForCollaboration(collaborationId, userId) {
    return postPutJson("/api/users/activate", {collaboration_id: collaborationId, user_id: userId}, "put");
}

export function activateUserForOrganisation(organisationId, userId) {
    return postPutJson("/api/users/activate", {organisation_id: organisationId, user_id: userId}, "put");
}

export function logoutUser() {
    return fetchJson("/api/users/logout");
}

export function deleteUser() {
    return fetchDelete("/api/users")
}

export function platformAdmins() {
    return fetchJson("/api/users/platform_admins");
}

export function queryForUsers(q) {
    return fetchJson(`/api/users/query?q=${encodeURIComponent(q)}`);
}

//MFA
export function get2fa() {
    return fetchJson("/api/mfa/get2fa");
}

export function verify2fa(totp) {
    return postPutJson("/api/mfa/verify2fa", {totp}, "POST", false);
}

export function update2fa(new_totp_value, current_totp) {
    return postPutJson("/api/mfa/update2fa", {new_totp_value, current_totp}, "POST", false);
}

export function tokenResetRespondents() {
    return fetchJson("/api/mfa/token_reset_request");
}

export function tokenResetRequest(admin, message) {
    return postPutJson("/api/mfa/token_reset_request", {email: admin.email, message}, "POST", false);
}

export function reset2fa(token) {
    return postPutJson("/api/mfa/reset2fa", {token}, "POST", false);
}

//Services
export function serviceNameExists(name, existingService = null) {
    return fetchJson(`/api/services/name_exists?name=${encodeURIComponent(name)}&existing_service=${encodeURIComponent(existingService)}`);
}

export function serviceEntityIdExists(entityId, existingService = null) {
    return fetchJson(`/api/services/entity_id_exists?entity_id=${encodeURIComponent(entityId)}&existing_service=${encodeURIComponent(existingService)}`);
}

export function serviceById(id) {
    return fetchJson(`/api/services/${id}`, {}, {}, false);
}

export function serviceByEntityId(entityid) {
    return fetchJson(`/api/services/find_by_entity_id?entity_id=${encodeURIComponent(entityid)}`, {}, {}, false);
}

export function allServices() {
    return fetchJson("/api/services/all");
}

export function createService(service) {
    return postPutJson("/api/services", service, "post");
}

export function updateService(service) {
    return postPutJson("/api/services", service, "put");
}

export function allowedOrganisations(serviceId, allowedOrganisations = {"allowed_organisations": []}) {
    return postPutJson(`/api/services/allowed_organisations/${serviceId}`, allowedOrganisations, "put")
}

export function deleteService(id) {
    return fetchDelete(`/api/services/${id}`)
}

//Collaborations
export function collaborationByIdentifier(identifier) {
    return fetchJson(`/api/collaborations/find_by_identifier?identifier=${encodeURIComponent(identifier)}`, {}, {}, false);
}

export function collaborationAccessAllowed(id) {
    return fetchJson(`/api/collaborations/access_allowed/${id}`, {}, {}, false);
}

export function collaborationById(id) {
    return fetchJson(`/api/collaborations/${id}`, {}, {}, false);
}

export function collaborationLiteById(id) {
    return fetchJson(`/api/collaborations/lite/${id}`, {}, {}, false);
}

export function myCollaborations(includeServices = false) {
    const query = includeServices ? "?includeServices=true" : "";
    return fetchJson(`/api/collaborations${query}`);
}

export function allCollaborations() {
    return fetchJson(`/api/collaborations/all`);
}

export function createCollaboration(collaboration) {
    return postPutJson("/api/collaborations", collaboration, "post");
}

export function collaborationNameExists(name, organisationId, existingCollaboration = null) {
    return fetchJson(`/api/collaborations/name_exists?name=${encodeURIComponent(name)}&organisation_id=${organisationId}&existing_collaboration=${encodeURIComponent(existingCollaboration)}`);
}

export function collaborationShortNameExists(shortName, organisationId, existingCollaboration = null) {
    return fetchJson(`/api/collaborations/short_name_exists?short_name=${encodeURIComponent(shortName)}&organisation_id=${organisationId}&existing_collaboration=${encodeURIComponent(existingCollaboration)}`);
}

export function collaborationInvitations(body) {
    return postPutJson("/api/collaborations/invites", body, "put");
}

export function collaborationInvitationsPreview(body) {
    return postPutJson("/api/collaborations/invites-preview", body, "post");
}

export function searchCollaborations(q) {
    return fetchJson(`/api/collaborations/search?q=${encodeURIComponent(q)}`);
}

export function updateCollaboration(collaboration) {
    return postPutJson("/api/collaborations", collaboration, "put");
}

export function deleteCollaboration(id) {
    return fetchDelete(`/api/collaborations/${id}`);
}

export function mayRequestCollaboration() {
    return fetchJson("/api/collaborations/may_request_collaboration");
}

export function unsuspendCollaboration(collaborationId) {
    return postPutJson("/api/collaborations/unsuspend", {collaboration_id: collaborationId}, "put");
}

//Organisations
export function myOrganisationsLite() {
    return fetchJson(`/api/organisations/mine_lite`);
}

export function organisationByUserSchacHomeOrganisation() {
    return fetchJson(`/api/organisations/find_by_schac_home_organisation`);
}

export function identityProviderDisplayName() {
    return fetchJson(`/api/organisations/identity_provider_display_name?lang=${I18n.locale}`)
}

export function myOrganisations() {
    return fetchJson(`/api/organisations`);
}

export function allOrganisations() {
    return fetchJson(`/api/organisations/all`);
}

export function organisationSchacHomeOrganisationExists(schacHome, existingOrganisationId = null) {
    let path = `/api/organisations/schac_home_exists?schac_home=${encodeURIComponent(schacHome)}`;
    if (existingOrganisationId) {
        path += `&existing_organisation_id=${existingOrganisationId}`;
    }
    return fetchJson(path);
}

export function organisationNameExists(name, existingOrganisation = null) {
    return fetchJson(`/api/organisations/name_exists?name=${encodeURIComponent(name)}&existing_organisation=${encodeURIComponent(existingOrganisation)}`);
}

export function organisationShortNameExists(short_name, existingOrganisation = null) {
    return fetchJson(`/api/organisations/short_name_exists?short_name=${encodeURIComponent(short_name)}&existing_organisation=${encodeURIComponent(existingOrganisation)}`);
}

export function organisationById(id) {
    return fetchJson(`/api/organisations/${id}`, {}, {}, false);
}

export function searchOrganisations(q) {
    return fetchJson(`/api/organisations/search?q=${encodeURIComponent(q)}`);
}

export function createOrganisation(organisation) {
    return postPutJson("/api/organisations", organisation, "post");
}

export function updateOrganisation(organisation) {
    return postPutJson("/api/organisations", organisation, "put");
}

export function organisationInvitations(body) {
    return postPutJson("/api/organisations/invites", body, "put");
}

export function organisationInvitationsPreview(body) {
    return postPutJson("/api/organisations/invites-preview", body, "post");
}

export function deleteOrganisation(id) {
    return fetchDelete(`/api/organisations/${id}`)
}

//JoinRequests
export function joinRequestForCollaboration(clientData) {
    return postPutJson("/api/join_requests", clientData, "post", false);
}

export function joinRequestAlreadyMember(clientData) {
    return postPutJson("/api/join_requests/already-member", clientData, "post", false);
}

export function joinRequestAccept(joinRequest) {
    return postPutJson("/api/join_requests/accept", joinRequest, "put", false);
}

export function joinRequestDecline(joinRequest, rejectionReason) {
    return postPutJson("/api/join_requests/decline", {...joinRequest, rejection_reason: rejectionReason}, "put", false);
}

export function joinRequestDelete(joinRequest) {
    return fetchDelete(`/api/join_requests/${joinRequest.id}`);
}

//OrganisationInvitations
export function organisationInvitationByHash(hash) {
    return fetchJson(`/api/organisation_invitations/find_by_hash?hash=${hash}`, {}, {}, false);
}

export function organisationInvitationAccept(organisationInvitation) {
    return fetchJson("/api/organisation_invitations/accept", {
        method: "put",
        body: JSON.stringify(organisationInvitation)
    }, {}, false);
}

export function organisationInvitationDecline(organisationInvitation) {
    return postPutJson("/api/organisation_invitations/decline", organisationInvitation, "put");
}

export function organisationInvitationResend(organisationInvitation, showErrorDialog = true) {
    return postPutJson("/api/organisation_invitations/resend", organisationInvitation, "put", showErrorDialog);
}

export function organisationInvitationDelete(organisationInvitationId, showErrorDialog = true) {
    return fetchDelete(`/api/organisation_invitations/${organisationInvitationId}`, showErrorDialog);
}

//Invitations
export function invitationByHash(hash) {
    return fetchJson(`/api/invitations/find_by_hash?hash=${hash}`, {}, {}, false);
}

export function invitationAccept(invitation) {
    return fetchJson("/api/invitations/accept",
        {method: "put", body: JSON.stringify(invitation)}, {}, false);
}

export function invitationDecline(invitation) {
    return postPutJson("/api/invitations/decline", invitation, "put");
}

export function invitationResend(invitation, showErrorDialog = true) {
    return postPutJson("/api/invitations/resend", invitation, "put", showErrorDialog);
}

export function invitationDelete(invitationId, showErrorDialog = true) {
    return fetchDelete(`/api/invitations/${invitationId}`, showErrorDialog);
}

//Organisation Memberships
export function deleteOrganisationMembership(organisationId, userId, showErrorDialog = true) {
    return fetchDelete(`/api/organisation_memberships/${organisationId}/${userId}`, showErrorDialog)
}

export function updateOrganisationMembershipRole(organisationId, userId, role, showErrorDialog = true) {
    return postPutJson("/api/organisation_memberships", {
        organisationId: organisationId,
        userId: userId,
        role: role
    }, "put", showErrorDialog)
}

//Collaboration Memberships
export function deleteCollaborationMembership(collaborationId, userId, showErrorDialog = true) {
    return fetchDelete(`/api/collaboration_memberships/${collaborationId}/${userId}`, showErrorDialog)
}

export function updateCollaborationMembershipRole(collaborationId, userId, role, showErrorDialog = true) {
    return postPutJson("/api/collaboration_memberships", {
        collaborationId: collaborationId,
        userId: userId,
        role: role
    }, "put", showErrorDialog)
}

export function createCollaborationMembershipRole(collaborationId) {
    return postPutJson("/api/collaboration_memberships", {
        collaborationId: collaborationId
    }, "post")
}

//OrganisationServices
export function addOrganisationServices(organisationId, serviceId) {
    return postPutJson(`/api/organisations_services`, {
        organisation_id: organisationId,
        service_id: serviceId
    }, "put", false)
}

export function deleteOrganisationServices(organisationId, serviceId) {
    return fetchDelete(`/api/organisations_services/${organisationId}/${serviceId}`)
}

//CollaborationServices
export function addCollaborationServices(collaborationId, serviceId) {
    return postPutJson(`/api/collaborations_services`, {
        collaboration_id: collaborationId,
        service_id: serviceId
    }, "put", false)
}

export function deleteCollaborationServices(collaborationId, serviceId) {
    return fetchDelete(`/api/collaborations_services/${collaborationId}/${serviceId}`)
}

//Groups
export function groupNameExists(name, collaborationId, existingGroup = null) {
    return fetchJson(`/api/groups/name_exists?name=${encodeURIComponent(name)}&collaboration_id=${collaborationId}&existing_group=${encodeURIComponent(existingGroup)}`);
}

export function groupShortNameExists(shortName, collaborationId, existingGroup = null) {
    return fetchJson(`/api/groups/short_name_exists?short_name=${encodeURIComponent(shortName)}&collaboration_id=${collaborationId}&existing_group=${encodeURIComponent(existingGroup)}`);
}

export function createGroup(group) {
    return postPutJson("/api/groups", group, "post");
}

export function updateGroup(group) {
    return postPutJson("/api/groups", group, "put");
}

export function deleteGroup(id) {
    return fetchDelete(`/api/groups/${id}`)
}

//GroupMembers
export function addGroupMembers({groupId, collaborationId, memberIds}) {
    memberIds = Array.isArray(memberIds) ? memberIds : [memberIds];
    return postPutJson("/api/group_members", {
        group_id: groupId,
        collaboration_id: collaborationId,
        members_ids: memberIds
    }, "put")
}

export function deleteGroupMembers(groupId, memberId, collaborationId) {
    return fetchDelete(`/api/group_members/${groupId}/${memberId}/${collaborationId}`)
}

//ApiKeys
export function apiKeyValue() {
    return fetchJson(`/api/api_keys`);
}

export function createApiKey(apiKey) {
    return postPutJson("/api/api_keys", apiKey, "post");
}

export function deleteApiKey(id) {
    return fetchDelete(`/api/api_keys/${id}`)
}

//Aup
export function aupLinks() {
    return fetchJson("/api/aup");
}

export function agreeAup() {
    return postPutJson("/api/aup/agree", {}, "post");
}

//CollaborationRequest
export function collaborationRequestById(id) {
    return fetchJson(`/api/collaboration_requests/${id}`);
}

export function requestCollaboration(collaboration) {
    return postPutJson("/api/collaboration_requests", collaboration, "post");
}

export function approveRequestCollaboration(body) {
    return postPutJson(`/api/collaboration_requests/approve/${body.id}`, body, "put");
}

export function denyRequestCollaboration(id, rejectionReason) {
    return postPutJson(`/api/collaboration_requests/deny/${id}`, {rejection_reason: rejectionReason}, "put");
}

export function deleteRequestCollaboration(id) {
    return fetchDelete(`/api/collaboration_requests/${id}`);
}


//ServiceConnectionRequest
export function serviceConnectionRequestsOutstanding(serviceId) {
    return postPutJson(`/api/service_connection_requests/by_service/${serviceId}`);
}

export function deleteServiceConnectionRequest(serviceConnectionRequestId) {
    return fetchDelete(`/api/service_connection_requests/${serviceConnectionRequestId}`);
}

export function requestServiceConnection(body, showErrorDialog = true) {
    return postPutJson("/api/service_connection_requests", body, "post", showErrorDialog);
}

export function serviceConnectionRequestByHash(hash) {
    return fetchJson(`/api/service_connection_requests/find_by_hash/${hash}`);
}

export function approveServiceConnectionRequestByHash(hash) {
    return postPutJson(`/api/service_connection_requests/approve/${hash}`, {}, "put");
}

export function denyServiceConnectionRequestByHash(hash) {
    return postPutJson(`/api/service_connection_requests/deny/${hash}`, {}, "put");
}

export function resendServiceConnectionRequests(serviceConnectionRequestId) {
    return fetchJson(`/api/service_connection_requests/resend/${serviceConnectionRequestId}`);
}

export function allServiceConnectionRequests(serviceId) {
    return fetchJson(`/api/service_connection_requests/all/${serviceId}`);
}

//AuditLog
export function auditLogsMe() {
    return fetchJson("/api/audit_logs/me");
}

export function auditLogsUser(id) {
    return fetchJson(`/api/audit_logs/other/${id}`);
}

export function auditLogsInfo(objectId, collectionNames) {
    return fetchJson(`/api/audit_logs/info/${objectId}/${collectionNames}`);
}

export function auditLogsActivity(limit, tableNames) {
    const tables = isEmpty(tableNames) ? null : tableNames.map(s => s.value).join(",");
    const params = {limit, tables};
    const queryString = Object.keys(params)
        .filter(key => params[key])
        .map(key => `${key}=${params[key]}`).join("&");
    return fetchJson(`/api/audit_logs/activity?${queryString}`);
}

//IP-networks
export function ipNetworks(address, id) {
    return fetchJson(`/api/ipaddress/info?address=${address}&id=${id}`, {}, {}, false);
}

//System
export function suspendUsers() {
    return postPutJson("/api/system/suspend_users", {}, "PUT");
}

export function outstandingRequests() {
    return fetchJson("/api/system/outstanding_requests");
}

export function cleanupNonOpenRequests() {
    return postPutJson("/api/system/cleanup_non_open_requests", {}, "PUT");
}

export function dbStats() {
    return fetchJson("/api/system/db_stats");
}

export function dbSeed() {
    return fetchJson("/api/system/seed");
}

export function clearAuditLogs() {
    return fetchDelete("/api/system/clear-audit-logs");
}

export function cleanSlate() {
    return fetchDelete("/api/system/clean_slate");
}

export function feedback(message) {
    return postPutJson("/api/system/feedback", {message}, "POST");
}
