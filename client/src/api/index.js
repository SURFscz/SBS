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

function validFetch(path, options, headers = {}, showErrorDialog = true) {
    const contentHeaders = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        ...headers
    };
    if (impersonator) {
        impersonation_attributes.forEach(attr =>
            contentHeaders[`X-IMPERSONATE-${attr.toUpperCase()}`] = impersonator[attr]);
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
export function me(config) {
    const headers = (config.local) ? {
        "OIDC_CLAIM_cmuid": "urn:john",
        // "OIDC_CLAIM_cmuid": "urn:temp",
        "OIDC_CLAIM_Nickname": "jëhny",
        "OIDC_CLAIM_Edumember-Is-Member-Of": "Release 0.6:CO:members:all,Release 0.6:CO:members:active",
        "OIDC_CLAIM_Eduperson-Affiliation": "librarywalkin",
        "OIDC_CLAIM_Schac-Home-Organisation": "scz.lab.surf.nl",
        "OIDC_CLAIM_Family-Name": "Doe",
        "OIDC_CLAIM_Given-Name": "John",
        "OIDC_CLAIM_Email": "jdoe@example.org"
    } : {};
    return fetchJson("/api/users/me", {}, headers, false);
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

export function searchServices(q) {
    return fetchJson(`/api/services/search?q=${encodeURIComponent(q)}`);
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
export function collaborationByName(name) {
    return fetchJson(`/api/collaborations/find_by_name?name=${encodeURIComponent(name)}`, {}, {}, false);
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

export function collaborationAuthorisationGroups(collaborationId) {
    return fetchJson(`/api/collaborations/authorisation_groups/${collaborationId}`);
}

//Organisations
export function myOrganisationsLite() {
    return fetchJson(`/api/organisations/mine_lite`);
}

export function myOrganisations() {
    return fetchJson(`/api/organisations`);
}

export function organisationNameExists(name, existingOrganisation = null) {
    return fetchJson(`/api/organisations/name_exists?name=${encodeURIComponent(name)}&existing_organisation=${encodeURIComponent(existingOrganisation)}`);
}

export function organisationIdentifierExists(identifier, existingOrganisation = null) {
    return fetchJson(`/api/organisations/identifier_exists?identifier=${encodeURIComponent(identifier)}&existing_organisation=${encodeURIComponent(existingOrganisation)}`);
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
export function joinRequestByHash(hash) {
    return fetchJson(`/api/join_requests/${hash}`,{},{}, false);
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

//CollaborationServices
export function addCollaborationServices({collaborationId, serviceIds}) {
    serviceIds = Array.isArray(serviceIds) ? serviceIds : [serviceIds];
    return postPutJson(`/api/collaborations_services`, {
        collaboration_id: collaborationId,
        service_ids: serviceIds
    }, "put")
}

export function deleteCollaborationServices(collaborationId, serviceId) {
    return fetchDelete(`/api/collaborations_services/${collaborationId}/${serviceId}`)
}

// AuthorisationGroups
export function authorisationGroupNameExists(name, collaborationId, existingAuthorisationGroup = null) {
    return fetchJson(`/api/authorisation_groups/name_exists?name=${encodeURIComponent(name)}&collaboration_id=${collaborationId}&existing_authorisation_group=${encodeURIComponent(existingAuthorisationGroup)}`);
}

export function authorisationGroupShortNameExists(shortName, collaborationId, existingAuthorisationGroup = null) {
    return fetchJson(`/api/authorisation_groups/short_name_exists?short_name=${encodeURIComponent(shortName)}&collaboration_id=${collaborationId}&existing_authorisation_group=${encodeURIComponent(existingAuthorisationGroup)}`);
}

export function authorisationGroupById(id, collaborationId) {
    return fetchJson(`/api/authorisation_groups/${id}/${collaborationId}`, {}, {}, false);
}

export function createAuthorisationGroup(authorisationGroup) {
    return postPutJson("/api/authorisation_groups", authorisationGroup, "post");
}

export function updateAuthorisationGroup(authorisationGroup) {
    return postPutJson("/api/authorisation_groups", authorisationGroup, "put");
}

export function deleteAuthorisationGroup(id) {
    return fetchDelete(`/api/authorisation_groups/${id}`)
}

export function myAuthorisationGroups() {
    return fetchJson("/api/authorisation_groups")
}


//AuthorisationGroupServices
export function addAuthorisationGroupServices({authorisationGroupId, collaborationId, serviceIds}) {
    serviceIds = Array.isArray(serviceIds) ? serviceIds : [serviceIds];
    return postPutJson("/api/authorisation_group_services", {
        authorisation_group_id: authorisationGroupId,
        collaboration_id: collaborationId,
        service_ids: serviceIds
    }, "put")
}

export function deleteAuthorisationGroupServices(authorisationGroupId, serviceId, collaborationId) {
    return fetchDelete(`/api/authorisation_group_services/${authorisationGroupId}/${serviceId}/${collaborationId}`)
}

export function preFlightDeleteAuthorisationGroupService({authorisation_group_id, service_id, collaboration_id}) {
    const query = queryParam(arguments);
    return fetchJson(`/api/authorisation_group_services/delete_pre_flight${query}`);
}

//AuthorisationGroupMembers
export function addAuthorisationGroupMembers({authorisationGroupId, collaborationId, memberIds}) {
    memberIds = Array.isArray(memberIds) ? memberIds : [memberIds];
    return postPutJson("/api/authorisation_group_members", {
        authorisation_group_id: authorisationGroupId,
        collaboration_id: collaborationId,
        members_ids: memberIds
    }, "put")
}

export function deleteAuthorisationGroupMembers(authorisationGroupId, memberId, collaborationId) {
    return fetchDelete(`/api/authorisation_group_members/${authorisationGroupId}/${memberId}/${collaborationId}`)
}

export function preFlightDeleteAuthorisationGroupMember({authorisation_group_id, collaboration_membership_id, collaboration_id}) {
    const query = queryParam(arguments);
    return fetchJson(`/api/authorisation_group_members/delete_pre_flight${query}`);
}

//AuthorisationGroupInvitations
export function addAuthorisationGroupInvitations({authorisationGroupId, collaborationId, invitationIds}) {
    invitationIds = Array.isArray(invitationIds) ? invitationIds : [invitationIds];
    return postPutJson("/api/authorisation_group_invitations", {
        authorisation_group_id: authorisationGroupId,
        collaboration_id: collaborationId,
        invitations_ids: invitationIds
    }, "put")
}

export function deleteAuthorisationGroupInvitations(authorisationGroupId, invitationId, collaborationId) {
    return fetchDelete(`/api/authorisation_group_invitations/${authorisationGroupId}/${invitationId}/${collaborationId}`)
}

//UserServiceProfiles
export function userServiceProfileById(id) {
    return fetchJson(`/api/user_service_profiles/${id}`);
}

export function myUserServiceProfiles() {
    return fetchJson("/api/user_service_profiles")
}

export function updateUserServiceProfiles(profile) {
    return postPutJson("/api/user_service_profiles", profile, "put");
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
