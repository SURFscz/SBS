import {isEmpty, pseudoGuid, stopEvent} from "./Utils";
import {getParameterByName} from "./QueryParameters";
import {authorizationUrl} from "../api";

export function login(e, currentUrl) {
    debugger;
    stopEvent(e);
    const state = getParameterByName("state", window.location.search);
    const guid = pseudoGuid();
    // window.location.href = `/login?state=${encodeURIComponent(res.location.pathname)}`
    // const queryParameter = isEmpty(state) ? `guid=${guid}` : `guid=${guid}&state=${encodeURIComponent(state)}`;
    // window.location.href = `/login?${queryParameter}`;
    authorizationUrl().then(res => {
        debugger;
        window.location.href = res.authorization_endpoint;
    });
}

export function logout(e) {
    stopEvent(e);
    const baseUrl = this.props.config.base_url;
    const guid = pseudoGuid();
    window.location.href = `/redirect_uri?logout=${baseUrl}&guid=${guid}`;
}

