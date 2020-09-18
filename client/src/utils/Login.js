import {stopEvent} from "./Utils";
import {getParameterByName} from "./QueryParameters";
import {authorizationUrl, logoutUser} from "../api";

export function login(e, currentUrl = window.location.href) {
    stopEvent(e);
    const state = getParameterByName("state", window.location.search) || currentUrl;
    authorizationUrl(state).then(res => {
        setTimeout(() => window.location.href = res.authorization_endpoint, 5);
    });
}

export function logout(e) {
    stopEvent(e);
    logoutUser().then(() => window.location.href = "/landing")
}

