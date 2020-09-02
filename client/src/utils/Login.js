import {pseudoGuid, stopEvent} from "./Utils";
import {getParameterByName} from "./QueryParameters";
import {authorizationUrl} from "../api";

export function login(e, currentUrl = window.location.href) {
    stopEvent(e);
    const state = getParameterByName("state", window.location.search) || currentUrl;
    authorizationUrl(state).then(res => {
        window.location.href = res.authorization_endpoint;
    });
}

export function logout(e) {
    stopEvent(e);
    const baseUrl = this.props.config.base_url;
    const guid = pseudoGuid();
    window.location.href = `/redirect_uri?logout=${baseUrl}&guid=${guid}`;
}

