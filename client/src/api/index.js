import {capitalize, isEmpty} from "../utils/Utils";
import {emitter} from "../utils/Events";
import I18n from "../locale/I18n";
import {getCsrfToken} from "../stores/AppStore";
import Cookies from "js-cookie";

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
                return;
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
        "CSRFToken": getCsrfToken(),
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
    const subscriptionId = sessionStorage.getItem("subscription_id");
    const cookieOptions = {secure: document.location.protocol.startsWith("https"), sameSite: "Lax"};
    Cookies.set("subscription_id", subscriptionId, cookieOptions);
    return fetch(path, fetchOptions).then(validateResponse(showErrorDialog))
}

function fetchJson(path, options = {}, headers = {}, showErrorDialog = true) {
    return validFetch(path, options, headers, showErrorDialog)
        .then(res => res.json());
}

function postPutJson(path, body, method, showErrorDialog = true, headers = {}) {
    const jsonBody = JSON.stringify(body);
    return fetchJson(path, {method: method, body: jsonBody}, headers, showErrorDialog);
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
    if (config.local && 1 == 1) {
        let sub = "urn:service_admin";
        sub = "urn:john";
       // sub = "urn:paul";
        const second_factor_confirmed = true;
        const rate_limited = false;
        // const second_factor_confirmed = false;
        // sub = "urn:unknown";
        // Need to mock a login
        const part = sub.substring(sub.indexOf(":") + 1);
        return postPutJson("/api/mock", {
            sub,
            "name": `${capitalize(part)} Doe`,
            "email": `${part}@example.org`,
            "given_name": "Doe",
            "second_factor_confirmed": second_factor_confirmed,
            "rate_limited": rate_limited
            // "voperson_external_id": "john@example.com"
        }, "PUT")
            .then(() => fetchJson("/api/users/me", {}, {}, false));
    } else {
        return fetchJson("/api/users/me", {}, {}, false);
    }
}

// Mock
export function ebInterruptData(userUid) {
    return fetchJson(`/api/mock/interrupt_data?user_uid=${userUid}`)
}

// Mock
export function ebStopInterruptFlow() {
    return fetchDelete("/api/mock/stop_interrupt_flow")
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

export function serviceInfo(entityId, uid) {
    return fetchJson(`/api/users/service_info?uid=${encodeURIComponent(uid)}&entity_id=${encodeURIComponent(entityId)}`,
        {}, {}, false);
}

export function logoutUser() {
    return fetchJson("/api/users/logout");
}

export function deleteUser() {
    return fetchDelete("/api/users")
}

export function deleteOtherUser(userId) {
    return fetchDelete(`/api/users/delete_other/${userId}`)
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

export function preUpdate2fa(totp_value) {
    return postPutJson("/api/mfa/pre-update2fa", {totp_value: totp_value}, "POST", false);
}

export function update2fa(new_totp_value) {
    return postPutJson("/api/mfa/update2fa", {new_totp_value: new_totp_value}, "POST", false);
}

export function tokenResetRespondents() {
    return fetchJson(`/api/mfa/token_reset_request`);
}

export function tokenResetRequest(admin, message) {
    const body = {email: admin.email, message};
    return postPutJson("/api/mfa/token_reset_request", body, "POST", false);
}

export function reset2fa(token) {
    return postPutJson("/api/mfa/reset2fa", {token: token}, "POST", false);
}

export function reset2faOther(userId) {
    return postPutJson("/api/mfa/reset2fa_other", {user_id: userId}, "PUT", false);
}

//Services
export function serviceNameExists(name, existingService = null) {
    return fetchJson(`/api/services/name_exists?name=${encodeURIComponent(name)}&existing_service=${encodeURIComponent(existingService)}`);
}

export function serviceEntityIdExists(entityId, existingService = null) {
    return fetchJson(`/api/services/entity_id_exists?entity_id=${encodeURIComponent(entityId)}&existing_service=${encodeURIComponent(existingService)}`);
}

export function serviceAbbreviationExists(abbreviation, existingService = null) {
    return fetchJson(`/api/services/abbreviation_exists?abbreviation=${encodeURIComponent(abbreviation)}&existing_service=${encodeURIComponent(existingService)}`);
}

export function serviceById(id) {
    return fetchJson(`/api/services/${id}`, {}, {}, false);
}

export function serviceLdapIdentifier() {
    return fetchJson("/api/services/ldap_identifier");
}

export function serviceByUuid4(uuid4) {
    return fetchJson(`/api/services/find_by_uuid4?uuid4=${encodeURIComponent(uuid4)}`, {}, {}, false);
}

export function serviceByEntityId(entityid) {
    return fetchJson(`/api/services/find_by_entity_id?entity_id=${encodeURIComponent(entityid)}`, {}, {}, false);
}

export function allServices(includeCounts) {
    const query = includeCounts ? "?include_counts=true" : "";
    return fetchJson(`/api/services/all${query}`, {}, {}, false);
}

export function allServicesOptimized() {
    return fetchJson("/api/services/all_optimized", {}, {}, false);
}

export function mineServicesOptimized() {
    return fetchJson("/api/services/mine_optimized");
}

export function mineServices() {
    return fetchJson("/api/services/mine");
}


export function createService(service) {
    return postPutJson("/api/services", service, "post", false);
}

export function updateService(service) {
    //We need to limit the size soo we delete the relations-ships that are not used server-side
    ["service_groups", "automatic_connection_allowed_organisations", "organisations", "allowed_organisations",
        "collaborations", "service_invitations", "service_memberships", "service_organisation_collaborations"]
        .forEach(relation => delete service[relation])
    return postPutJson("/api/services", service, "put", false);
}

export function toggleReset(serviceId) {
    return postPutJson(`/api/services/toggle_access_property/${serviceId}`, {reset: true}, "put")
}

export function toggleAccessAllowedForAll(serviceId, value) {
    return postPutJson(`/api/services/toggle_access_property/${serviceId}`, {access_allowed_for_all: value}, "put")
}

export function toggleNonMemberUsersAccessAllowed(serviceId, nonMemberUsersAccessAllowed) {
    return postPutJson(`/api/services/toggle_access_property/${serviceId}`,
        {non_member_users_access_allowed: nonMemberUsersAccessAllowed}, "put")
}

export function toggleCRMOrganisationUsersAccessAllowed(serviceId, access_allowed_for_crm_organisation) {
    return postPutJson(`/api/services/toggle_access_property/${serviceId}`,
        {access_allowed_for_crm_organisation: access_allowed_for_crm_organisation}, "put")
}

export function toggleOverrideAccessAllowedAllConnections(serviceId, overrideAccessAllowedAllConnections) {
    return postPutJson(`/api/services/toggle_access_property/${serviceId}`,
        {override_access_allowed_all_connections: overrideAccessAllowedAllConnections}, "put")
}

export function toggleAutomaticConnectionAllowed(serviceId, value, connectionSetting) {
    return postPutJson(`/api/services/toggle_access_property/${serviceId}?connection_setting=${connectionSetting}`,
        {automatic_connection_allowed: value}, "put")
}

export function disallowOrganisation(serviceId, organisationId) {
    const path = `/api/services/disallow_organisation/${serviceId}/${organisationId}`;
    return postPutJson(path, {}, "put")
}

export function onRequestOrganisation(serviceId, organisationId) {
    const path = `/api/services/on_request_organisation/${serviceId}/${organisationId}`;
    return postPutJson(path, {}, "put")
}

export function trustOrganisation(serviceId, organisationId) {
    const path = `/api/services/trust_organisation/${serviceId}/${organisationId}`;
    return postPutJson(path, {}, "put")
}

export function deleteService(id) {
    return fetchDelete(`/api/services/${id}`)
}

export function requestDeleteService(id) {
    return fetchDelete(`/api/services/request_delete/${id}`)
}

export function resetLdapPassword(service) {
    return fetchJson(`/api/services/reset_ldap_password/${service.id}`);
}

export function resetOidcClientSecret(service) {
    return fetchJson(`/api/services/reset_oidc_client_secret/${service.id}`);
}

export function resetScimBearerToken(service, scim_bearer_token) {
    const body = {
        scim_bearer_token: scim_bearer_token,
        scim_url: service.scim_url
    };
    return postPutJson(`/api/services/reset_scim_bearer_token/${service.id}`, body, "put");
}

export function hasMemberAccessToService(service) {
    return fetchJson(`/api/services/member_access_to_service/${service.id}`);
}

export function hintServiceShortName(name) {
    return postPutJson("/api/services/hint_short_name", {name: name}, "post");
}

//ServiceRequest
export function createServiceRequest(serviceRequest) {
    return postPutJson("/api/service_requests", serviceRequest, "post", false);
}

export function findAllServiceRequests() {
    return fetchJson("/api/service_requests/all");
}

export function serviceRequestById(id) {
    return fetchJson(`/api/service_requests/${id}`);
}

export function approveServiceRequest(body) {
    return postPutJson(`/api/service_requests/approve/${body.id}`, body, "put");
}

export function denyServiceRequest(id, rejectionReason) {
    return postPutJson(`/api/service_requests/deny/${id}`, {rejection_reason: rejectionReason}, "put");
}

export function deleteServiceRequest(id) {
    return fetchDelete(`/api/service_requests/${id}`);
}

export function parseSAMLMetaData(metaDataXML, metaDataURL) {
    const body = {meta_data_xml: metaDataXML, meta_data_url: metaDataURL};
    return postPutJson("/api/service_requests/metadata/parse", body, "post", false);
}

export function generateOidcClientSecret() {
    return fetchJson("/api/service_requests/generate_oidc_client_secret");
}

//Collaborations
export function collaborationByIdentifier(identifier) {
    return fetchJson(`/api/collaborations/find_by_identifier?identifier=${encodeURIComponent(identifier)}`, {}, {}, false);
}

export function collaborationIdByIdentifier(identifier) {
    return fetchJson(`/api/collaborations/id_by_identifier?identifier=${encodeURIComponent(identifier)}`, {}, {}, false);
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

export function myCollaborationsOptimized() {
    return fetchJson(`/api/collaborations/mine_optimized`);
}

export function allCollaborations() {
    return fetchJson(`/api/collaborations/all`);
}

export function allCollaborationsOptimized() {
    return fetchJson(`/api/collaborations/all_optimized`);
}

export function createCollaboration(collaboration) {
    return postPutJson("/api/collaborations", collaboration, "post", false);
}

export function collaborationNameExists(name, organisationId, existingCollaboration = "") {
    if (isEmpty(existingCollaboration)) {
        existingCollaboration = "";
    }
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
    //We need to limit the size soo we delete the relations-ships that are not used server-side
    ["service_connection_requests", "invitations", "join_requests", "groups", "services", "collaboration_memberships"]
        .forEach(relation => delete collaboration[relation])
    return postPutJson("/api/collaborations", collaboration, "put", false);
}

export function deleteCollaboration(id) {
    return fetchDelete(`/api/collaborations/${id}`);
}

export function collaborationAdmins(service) {
    return service ? fetchJson(`/api/collaborations/admins/${service.id}`) : Promise.resolve([]);
}

export function unsuspendCollaboration(collaborationId) {
    return postPutJson("/api/collaborations/unsuspend", {collaboration_id: collaborationId}, "put");
}

export function activateCollaboration(collaborationId) {
    return postPutJson("/api/collaborations/activate", {collaboration_id: collaborationId}, "put");
}

export function hintCollaborationShortName(name) {
    return postPutJson("/api/collaborations/hint_short_name", {name: name}, "post");
}

//Organisations
export function myOrganisationsLite() {
    return fetchJson(`/api/organisations/mine_lite`);
}

export function identityProviderDisplayName(userId) {
    const userIdPart = userId ? `&user_id=${userId}` : "";
    return fetchJson(`/api/organisations/identity_provider_display_name?lang=${I18n.locale}${userIdPart}`)
}

export function myOrganisations() {
    return fetchJson(`/api/organisations`);
}

export function schacHome(organisationId) {
    return fetchJson(`/api/organisations/schac_home/${organisationId}`);
}

export function schacHomes(joinRequests) {
    if (isEmpty(joinRequests)) {
        return Promise.resolve({});
    }
    const body = joinRequests.map(joinRequest => ({
        "join_request_id": joinRequest.id,
        "organisation_id": joinRequest.collaboration.organisation_id
    }))
    return postPutJson("/api/organisations/schac_homes", body, "POST");
}

export function organisationNames(joinRequests) {
    if (isEmpty(joinRequests)) {
        return Promise.resolve({});
    }
    const body = joinRequests.map(joinRequest => ({
        "join_request_id": joinRequest.id,
        "organisation_id": joinRequest.collaboration.organisation_id
    }))
    return postPutJson("/api/organisations/names", body, "POST");
}

export function allCRMOrganisations() {
    return fetchJson("/api/organisations/crm_organisations");
}

export function allOrganisations() {
    return fetchJson("/api/organisations/all");
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
    return postPutJson("/api/organisations", organisation, "post", false);
}

export function updateOrganisation(organisation) {
    //We need to limit the size soo we delete the relations-ships that are not used server-side
    ["organisation_invitations", "organisation_memberships", "collaboration_requests", "services", "collaborations", "organisation_invitations",
        "organisation_memberships"]
        .forEach(relation => delete organisation[relation])
    return postPutJson("/api/organisations", organisation, "put", false);
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

export function queryForOrganisationUsers(organisationId, q) {
    return fetchJson(`/api/organisations/${organisationId}/users?q=${encodeURIComponent(q)}`);
}

export function queryForOrganisationInvites(organisationId, q) {
    return fetchJson(`/api/organisations/${organisationId}/invites?q=${encodeURIComponent(q)}`);
}

export function organisationNameById(organisationId) {
    return fetchJson(`/api/organisations/name_by_id/${organisationId}`);
}

//JoinRequests
export function joinRequestForCollaboration(clientData) {
    return postPutJson("/api/join_requests", clientData, "post", false);
}

export function joinRequestAccept(joinRequest) {
    return postPutJson("/api/join_requests/accept", {hash: joinRequest.hash}, "put", false);
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
        body: JSON.stringify({hash: organisationInvitation.hash})
    }, {}, false);
}

export function organisationInvitationResend(organisationInvitation, showErrorDialog = true) {
    return postPutJson("/api/organisation_invitations/resend", organisationInvitation, "put", showErrorDialog);
}

export function organisationInvitationBulkResend(organisationInvitations, showErrorDialog = true) {
    return postPutJson("/api/organisation_invitations/resend_bulk", organisationInvitations, "put", showErrorDialog);
}

export function organisationInvitationDelete(organisationInvitationId, showErrorDialog = true) {
    return fetchDelete(`/api/organisation_invitations/${organisationInvitationId}`, showErrorDialog);
}

export function organisationInvitationExists(emails, organisationId) {
    const body = {emails: emails, organisation_id: organisationId}
    return postPutJson("/api/organisation_invitations/exists_email", body, "POST");
}

//Invitations
export function invitationByHash(hash, expand = false) {
    return fetchJson(`/api/invitations/find_by_hash?hash=${hash}${expand ? "&expand=True" : ""}`, {}, {}, false);
}

export function deleteInvitationByHash(hash) {
    return fetchDelete(`/api/invitations/delete_by_hash/${hash}`);
}

export function invitationAccept(invitation) {
    return fetchJson("/api/invitations/accept",
        {method: "put", body: JSON.stringify({hash: invitation.hash})}, {}, false);
}

export function invitationDecline(invitation) {
    return postPutJson("/api/invitations/decline", invitation, "put");
}

export function invitationResend(invitation, showErrorDialog = true) {
    return postPutJson("/api/invitations/resend", invitation, "put", showErrorDialog);
}

export function invitationBulkResend(invitations, showErrorDialog = true) {
    return postPutJson("/api/invitations/resend_bulk", invitations, "put", showErrorDialog);
}

export function invitationDelete(invitationId, showErrorDialog = true) {
    return fetchDelete(`/api/invitations/${invitationId}`, showErrorDialog);
}

export function invitationExists(emails, collaborationId) {
    const body = {emails: emails, collaboration_id: collaborationId}
    return postPutJson("/api/invitations/exists_email", body, "POST");
}


//Organisation Memberships
export function deleteOrganisationMembership(organisationId, userId, showErrorDialog = true) {
    return fetchDelete(`/api/organisation_memberships/${organisationId}/${userId}`, showErrorDialog)
}

export function updateOrganisationMembershipRole(organisationId, userId, role, units, showErrorDialog = true) {
    return postPutJson("/api/organisation_memberships", {
        organisationId: organisationId,
        userId: userId,
        role: role,
        units: units
    }, "put", showErrorDialog)
}

//Collaboration Memberships
export function deleteCollaborationMembership(collaborationId, userId, showErrorDialog = true) {
    return fetchDelete(`/api/collaboration_memberships/${collaborationId}/${userId}`, showErrorDialog)
}

export function expireCollaborationMemberships() {
    return postPutJson("/api/system/expire_memberships", {}, "PUT");
}

export function invitationReminders() {
    return postPutJson("/api/system/invitation_reminders", {}, "PUT");
}

export function invitationExpirations() {
    return postPutJson("/api/system/invitation_expirations", {}, "PUT");
}

export function openRequests() {
    return fetchJson("/api/system/open_requests");
}

export function parseMetaData() {
    return fetchJson("/api/system/parse_metadata");
}

export function deleteOrphanUsers() {
    return postPutJson("/api/system/orphan_users", {}, "PUT");
}

export function updateCollaborationMembershipRole(collaborationId, userId, role, showErrorDialog = true) {
    return postPutJson("/api/collaboration_memberships", {
        collaborationId: collaborationId,
        userId: userId,
        role: role
    }, "put", showErrorDialog)
}

export function updateCollaborationMembershipExpiryDate(collaborationId, membershipId, expiryDate) {
    return postPutJson("/api/collaboration_memberships/expiry", {
        collaboration_id: collaborationId,
        membership_id: membershipId,
        expiry_date: expiryDate
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

export function createGroup(group) {
    return postPutJson("/api/groups", group, "post", false);
}

export function updateGroup(group) {
    return postPutJson("/api/groups", group, "put", false);
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
    return fetchJson("/api/aup/info");
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

export function approveServiceConnectionRequest(serviceConnectionRequest) {
    return postPutJson(`/api/service_connection_requests/approve`, {id: serviceConnectionRequest.id}, "put");
}

export function denyServiceConnectionRequest(serviceConnectionRequest, rejectionReason) {
    const body = {id: serviceConnectionRequest.id, rejection_reason: rejectionReason};
    return postPutJson(`/api/service_connection_requests/deny`, body, "put");
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

export function auditLogsActivity(limit, tableNames, query) {
    const tables = isEmpty(tableNames) ? null : tableNames.map(s => s.value).join(",");
    const params = {limit, tables, query};
    const queryString = Object.keys(params)
        .filter(key => params[key])
        .map(key => `${key}=${encodeURIComponent(params[key])}`).join("&");
    return fetchJson(`/api/audit_logs/activity?${queryString}`);
}

//IP-networks
export function ipNetworks(address, id) {
    const ipQueryParam = id ? `&id=${id}` : "";
    return fetchJson(`/api/ipaddress/info?address=${address}${ipQueryParam}`, {}, {}, false);
}

//System
export function suspendUsers() {
    return postPutJson("/api/system/suspend_users", {}, "PUT");
}

export function getSuspendedUsers() {
    return fetchJson("/api/users/suspended");
}

export function getResetTOTPRequestedUsers() {
    return fetchJson("/api/users/reset_totp_requested");
}

export function suspendCollaborations() {
    return postPutJson("/api/system/suspend_collaborations", {}, "PUT");
}

export function expireCollaborations() {
    return postPutJson("/api/system/expire_collaborations", {}, "PUT");
}

export function scheduledJobs() {
    return fetchJson("/api/system/scheduled_jobs");
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

export function userLoginsSummary() {
    return fetchJson("/api/user_logins/summary");
}

export function composition() {
    return fetchJson("/api/system/composition");
}

export function dbSeed() {
    return fetchJson("/api/system/seed");
}

export function dbDemoSeed() {
    return fetchJson("/api/system/demo_seed");
}

export function clearAuditLogs() {
    return fetchDelete("/api/system/clear-audit-logs");
}

export function cleanSlate() {
    return fetchDelete("/api/system/clean_slate");
}

export function validations() {
    return fetchJson("/api/system/validations");
}

export function feedback(message) {
    return postPutJson("/api/system/feedback", {message}, "POST");
}

export function sweepAllServices() {
    return fetchJson("/api/system/sweep");
}

export function plscSync() {
    return fetchJson("/api/plsc/syncing");
}

export function proxyAuthzEngineBlock(userUid, serviceEntityId, idpEntityId) {
    const body = {user_id: userUid.trim(), service_id: serviceEntityId.trim(), issuer_id: idpEntityId.trim()};
    return postPutJson("/api/users/proxy_authz_eb", body, "post", false);
}

export function proxyAuthzEduTeams(userUid, serviceEntityId, idpEntityId) {
    const body = {user_id: userUid.trim(), service_id: serviceEntityId.trim(), issuer_id: idpEntityId.trim()};
    return postPutJson("/api/users/proxy_authz", body, "post", false);
}

//Service groups
export function serviceGroupsByServiceUuid4(serviceUuid4) {
    return fetchJson(`/api/servicegroups/find_by_service_uuid/${serviceUuid4}`);
}

export function serviceGroupNameExists(name, serviceId, existingGroup = null) {
    return fetchJson(`/api/servicegroups/name_exists?name=${encodeURIComponent(name)}&service_id=${serviceId}&existing_service_group=${encodeURIComponent(existingGroup)}`);
}

export function serviceGroupShortNameExists(shortName, serviceId, existingGroup = null) {
    return fetchJson(`/api/servicegroups/short_name_exists?short_name=${encodeURIComponent(shortName)}&service_id=${serviceId}&existing_service_group=${encodeURIComponent(existingGroup)}`);
}

export function createServiceGroup(group) {
    return postPutJson("/api/servicegroups", group, "post", false);
}

export function updateServiceGroup(group) {
    return postPutJson("/api/servicegroups", group, "put", false);
}

export function deleteServiceGroup(id) {
    return fetchDelete(`/api/servicegroups/${id}`)
}

export function serviceInvitations(body) {
    return postPutJson("/api/services/invites", body, "put");
}


//ServiceMemberships
export function deleteServiceMembership(serviceId, userId, showErrorDialog = true) {
    return fetchDelete(`/api/service_memberships/${serviceId}/${userId}`, showErrorDialog)
}

export function createServiceMembershipRole(serviceId) {
    return postPutJson("/api/service_memberships", {
        serviceId: serviceId
    }, "post")
}

export function updateServiceMembershipRole(serviceId, userId, role) {
    return postPutJson("/api/service_memberships", {
        serviceId: serviceId,
        userId: userId,
        role: role
    }, "put")
}

//ServiceInvitations
export function serviceInvitationByHash(hash) {
    return fetchJson(`/api/service_invitations/find_by_hash?hash=${hash}`, {}, {}, false);
}

export function serviceInvitationAccept(serviceInvitation) {
    return fetchJson("/api/service_invitations/accept", {
        method: "put",
        body: JSON.stringify({hash: serviceInvitation.hash})
    }, {}, false);
}

export function serviceInvitationBulkResend(serviceInvitations, showErrorDialog = true) {
    return postPutJson("/api/service_invitations/resend_bulk", serviceInvitations, "put", showErrorDialog);
}

export function serviceInvitationDelete(serviceInvitationId, showErrorDialog = true) {
    return fetchDelete(`/api/service_invitations/${serviceInvitationId}`, showErrorDialog);
}

export function serviceInvitationExists(emails, serviceId) {
    const body = {emails: emails, service_id: serviceId}
    return postPutJson("/api/service_invitations/exists_email", body, "POST");
}

//ServiceAups
export function serviceAupCreate(service) {
    return postPutJson("/api/service_aups", {"service_id": service.id}, "post");
}

export function serviceAupBulkCreate(services) {
    const serviceIdentifiers = services.map(service => service.id);
    return postPutJson("/api/service_aups/bulk", {"service_identifiers": serviceIdentifiers}, "post");
}

export function serviceAupDelete(service) {
    return postPutJson("/api/service_aups/delete_by_service", {"service_id": service.id}, "put", false);
}

//User Tokens
export function userTokensOfUser(serviceId) {
    const queryPart = serviceId ? `?service_id=${serviceId}` : "";
    return fetchJson(`/api/user_tokens${queryPart}`);
}

export function userTokenGenerateValue() {
    return fetchJson("/api/user_tokens/generate_token");
}

export function createUserToken(userToken) {
    return postPutJson("/api/user_tokens", userToken, "post");
}

export function updateUserToken(userToken) {
    return postPutJson("/api/user_tokens", userToken, "put");
}

export function reactivateUserToken(userToken) {
    return postPutJson("/api/user_tokens/renew_lease", userToken, "put");
}

export function deleteUserToken(userToken) {
    return fetchDelete(`/api/user_tokens/${userToken.id}`);
}

//tags
export function tagsByOrganisation(organisationId) {
    return fetchJson(`/api/tags?organisation_id=${organisationId}`);
}

//pam-weblogin
export function pamServices() {
    return fetchJson("/api/system/pam-services");
}

export function pamStart(token, userAttribute, userIdentifier) {
    const headers = {Authorization: `bearer ${token}`};
    const body = {user_id: userIdentifier, attribute: userAttribute};
    return postPutJson("/pam-weblogin/start", body, "POST", false, headers);
}

export function pamWebSSOSession(serviceAbbreviation, sessionId) {
    return fetchJson(`/pam-weblogin/${serviceAbbreviation}/${sessionId}`, {}, {}, false);
}

export function pollPamWebSSO(sessionId) {
    return fetchJson(`/pam-weblogin/status/success/${sessionId}`, {}, {}, false);
}

export function checkPamPin(token, sessionId, pin) {
    const headers = {Authorization: `bearer ${token}`};
    const body = {session_id: sessionId, pin: pin};
    return postPutJson("/pam-weblogin/check-pin", body, "POST", true, headers);
}

//ServiceTokens
export function serviceTokenValue() {
    return fetchJson(`/api/service_tokens`);
}

export function createServiceToken(serviceToken) {
    return postPutJson("/api/service_tokens", serviceToken, "post");
}

export function deleteServiceToken(id) {
    return fetchDelete(`/api/service_tokens/${id}`)
}

//Units
export function unitUsage(unit) {
    return fetchJson(`/api/units/usages/${unit.organisation_id}/${unit.id}`)
}

//Mock-SCIM
export function allMockScimServices() {
    return fetchJson("/api/scim/v2/scim-services")
}

export function mockScimStatistics() {
    return fetchJson("/api/scim_mock/statistics")
}

export function clearMockScimStatistics() {
    return fetchDelete("/api/scim_mock/clear")
}

//SCIM
export function sweep(service) {
    return postPutJson(`/api/scim/v2/sweep?service_id=${service.id}`, {}, "PUT", false);
}

//Stats
export function allStats() {
    return fetchJson("/api/system/statistics")
}

