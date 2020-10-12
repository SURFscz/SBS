import spinner from "../utils/Spin";
import {isEmpty} from "../utils/Utils";
import {emitter} from "../utils/Events";

let impersonator = null;
emitter.addListener("impersonation", selectedUser => {
    impersonator = selectedUser;
});

const impersonation_attributes = ["id", "uid", "name", "email"];

//Internal API
function validateResponse(showErrorDialog) {
    return res => {
        spinner.stop();

        if (!res.ok) {
            if (res.type === "opaqueredirect") {
                setTimeout(() => window.location.reload(true), 100);
                return res;
            }
            const error = new Error(res.statusText);
            error.response = res;

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
    spinner.start();
    return fetch(path, fetchOptions)
        .then(validateResponse(showErrorDialog))
        .catch(err => {
            spinner.stop();
            throw err;
        });
}

function fetchJson(path, options = {}, headers = {}, showErrorDialog = true) {
    return validFetch(path, options, headers, showErrorDialog)
        .then(res => res.json());
}

function postPutJson(path, body, method, showErrorDialog = true) {
    return fetchJson(path, {method: method, body: JSON.stringify(body)}, {}, showErrorDialog);
}

function fetchDelete(path) {
    return validFetch(path, {method: "delete"});
}

function queryParam(options) {
    const entries = Object.entries(options[0]);
    return entries.reduce((acc, entry) => isEmpty(entry[1]) ? acc : acc + `${entry[0]}=${entry[1]}&`, "?");
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
    if (config.local && true) {
        let sub = "urn:john";
        //sub = "urn:suspended";
        //Need to mock a login
        return postPutJson("/api/mock", {sub}, "PUT")
            .then(() => fetchJson("/api/users/me",{},{}, false));
    } else {
        return fetchJson("/api/users/me",{},{}, false);
    }
}

export function refreshUser() {
    return fetchJson("/api/users/refresh");
}

export function other(uid) {
    return fetchJson(`/api/users/other?uid=${encodeURIComponent(uid)}`);
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

export function searchServices(q) {
    return fetchJson(`/api/services/search?q=${encodeURIComponent(q)}`);
}

export function myServices() {
    return fetchJson("/api/services/my_services");
}

export function createService(service) {
    return postPutJson("/api/services", service, "post");
}

export function updateService(service) {
    return postPutJson("/api/services", service, "put");
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

export function myCollaborations() {
    return fetchJson("/api/collaborations");
}

export function myCollaborationsLite() {
    return fetchJson("/api/collaborations/my_lite");
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

export function collaborationServices(collaborationId, includeMemberships = false) {
    return fetchJson(`/api/collaborations/services/${collaborationId}?include_memberships=${includeMemberships}`);
}

export function collaborationGroups(collaborationId) {
    return fetchJson(`/api/collaborations/groups/${collaborationId}`);
}

//Organisations
export function myOrganisationsLite() {
    return fetchJson(`/api/organisations/mine_lite`);
}

export function organisationByUserSchacHomeOrganisation() {
    return fetchJson(`/api/organisations/find_by_schac_home_organisation`);
}

export function myOrganisations() {
    return fetchJson(`/api/organisations`);
}

export function organisationSchacHomeOrganisationExists(schacHome, existingOrganisation = null) {
    return fetchJson(`/api/organisations/schac_home_exists?schac_home=${encodeURIComponent(schacHome)}&existing_organisation=${encodeURIComponent(existingOrganisation)}`);
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

export function organisationByIdLite(id) {
    return fetchJson(`/api/organisations/lite/${id}`, {}, {}, false);
}

export function organisationServices(id) {
    return fetchJson(`/api/organisations/services/${id}`);
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
export function joinRequestByHash(hash) {
    return fetchJson(`/api/join_requests/${hash}`, {}, {}, false);
}

export function joinRequestForCollaboration(clientData) {
    return postPutJson("/api/join_requests", clientData, "post", false);
}

export function joinRequestAlreadyMember(clientData) {
    return postPutJson("/api/join_requests/already-member", clientData, "post", false);
}

export function joinRequestAccept(joinRequest) {
    return postPutJson("/api/join_requests/accept", joinRequest, "put", false);
}

export function joinRequestDecline(joinRequest) {
    return postPutJson("/api/join_requests/decline", joinRequest, "put", false);
}

//OrganisationInvitations
export function organisationInvitationById(id) {
    return fetchJson(`/api/organisation_invitations/${id}`, {}, {}, false);
}

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

export function organisationInvitationResend(organisationInvitation) {
    return postPutJson("/api/organisation_invitations/resend", organisationInvitation, "put");
}

export function organisationInvitationDelete(organisationInvitationId) {
    return fetchDelete(`/api/organisation_invitations/${organisationInvitationId}`);
}

//Invitations
export function invitationById(id) {
    return fetchJson(`/api/invitations/${id}`, {}, {}, false);
}

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

export function invitationResend(invitation) {
    return postPutJson("/api/invitations/resend", invitation, "put");
}

export function invitationDelete(invitationId) {
    return fetchDelete(`/api/invitations/${invitationId}`);
}

//Organisation Memberships
export function deleteOrganisationMembership(organisationId, userId) {
    return fetchDelete(`/api/organisation_memberships/${organisationId}/${userId}`)
}

export function updateOrganisationMembershipRole(organisationId, userId, role) {
    return postPutJson("/api/organisation_memberships", {
        organisationId: organisationId,
        userId: userId,
        role: role
    }, "put")
}

//Collaboration Memberships
export function deleteCollaborationMembership(collaborationId, userId) {
    return fetchDelete(`/api/collaboration_memberships/${collaborationId}/${userId}`)
}

export function updateCollaborationMembershipRole(collaborationId, userId, role) {
    return postPutJson("/api/collaboration_memberships", {
        collaborationId: collaborationId,
        userId: userId,
        role: role
    }, "put")
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

export function groupById(id, collaborationId) {
    return fetchJson(`/api/groups/${id}/${collaborationId}`, {}, {}, false);
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

export function myGroups() {
    return fetchJson("/api/groups")
}

export function groupAccessAllowed(id, collaborationId) {
    return fetchJson(`/api/groups/access_allowed/${id}/${collaborationId}`, {}, {}, false);
}

export function groupsByCollaboration(collaboration_id) {
    return fetchJson(`/api/groups/all/${collaboration_id}`)
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

export function preFlightDeleteGroupMember({group_id, collaboration_membership_id, collaboration_id}) {
    const query = queryParam(arguments);
    return fetchJson(`/api/group_members/delete_pre_flight${query}`);
}

//GroupInvitations
export function addGroupInvitations({groupId, collaborationId, invitationIds}) {
    invitationIds = Array.isArray(invitationIds) ? invitationIds : [invitationIds];
    return postPutJson("/api/group_invitations", {
        group_id: groupId,
        collaboration_id: collaborationId,
        invitations_ids: invitationIds
    }, "put")
}

export function deleteGroupInvitations(groupId, invitationId, collaborationId) {
    return fetchDelete(`/api/group_invitations/${groupId}/${invitationId}/${collaborationId}`)
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

export function denyRequestCollaboration(id) {
    return postPutJson(`/api/collaboration_requests/deny/${id}`, {}, "put");
}

//ServiceConnectionRequest
export function serviceConnectionRequests(collaborationId) {
    return postPutJson(`/api/service_connection_requests/by_collaboration/${collaborationId}`);
}

export function serviceConnectionRequestsOutstanding(serviceId) {
    return postPutJson(`/api/service_connection_requests/by_service/${serviceId}`);
}

export function resendServiceConnectionRequest(serviceConnectionRequestId) {
    return fetchJson(`/api/service_connection_requests/resend/${serviceConnectionRequestId}`, {}, {}, false);
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

//AuditLog
export function auditLogsMe() {
    return fetchJson("/api/audit_logs/me");
}

export function auditLogsInfo(objectId, collectionNames) {
    return fetchJson(`/api/audit_logs/info/${objectId}/${collectionNames}`);
}

//IP-networks
export function ipNetworks(address, id) {
    return fetchJson(`/api/ipaddress/info?address=${address}&id=${id}`, {}, {}, false);
}

//System
export function suspendUsers() {
    return postPutJson("/api/system/suspend_users", {}, "PUT");
}

export function dbStats() {
    return fetchJson("/api/system/db_stats");
}
