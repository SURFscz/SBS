import spinner from "../utils/Spin";

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

function postPutJson(path, body, method) {
    return fetchJson(path, {method: method, body: JSON.stringify(body)});
}

function fetchDelete(path) {
    return validFetch(path, {method: "delete"});
}

//API
export function me() {
    //TODO - remove this after integration with mod_mellon
    const headers = window.location.pathname.startsWith("/login") ? {"MELLON_cmuid": "urn:john"} : {};
    return fetchJson("/api/users/me", {}, headers, false);
}

export function health() {
    return fetchJson("/health");
}

export function reportError(error) {
    return postPutJson("/api/users/error", error, "post");
}

export function deleteCollaboration(id) {
    return fetchDelete(`/api/collaborations/${id}`)
}

export function inviteForCollaboration(clientData) {
    return postPutJson(`/api/users/send_invitation`, clientData, "post")
}

export function serviceByEntityId(entityId) {
    return fetchJson(`/api/services/find_by_entity?entity_id=${encodeURIComponent(entityId)}`, {}, {}, false);
}

export function collaborationByName(name) {
    return fetchJson(`/api/collaborations/find_by_name?name=${encodeURIComponent(name)}`, {}, {}, false);
}

export function collaborationById(id) {
    return fetchJson(`/api/collaborations/${id}`, {}, {}, false);
}

export function myCollaborations() {
    return fetchJson(`/api/collaborations`);
}

export function searchCollaborations(q) {
    return fetchJson(`/api/collaborations/search?q=${encodeURIComponent(q)}`);
}

export function myOrganisations() {
    return fetchJson(`/api/organisations`);
}

export function organisationById(id) {
    return fetchJson(`/api/organisations/${id}`, {}, {}, false);
}

export function searchOrganisations(q) {
    return fetchJson(`/api/organisations/search?q=${encodeURIComponent(q)}`);
}

export function createOrganisations(organisation) {
    return postPutJson("/api/organisations", organisation, "post");
}

export function updateOrganisation(organisation) {
    return postPutJson("/api/organisations", organisation, "put");
}