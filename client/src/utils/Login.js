import {stopEvent} from "./Utils";
import {getParameterByName} from "./QueryParameters";
import {authorizationUrl, logoutUser} from "../api";

export function login(e, currentUrl = window.location.href) {
    stopEvent(e);
    const state = getParameterByName("state", window.location.search) || currentUrl;
    const noSecondRateLimitState = state.replace("rate-limited=true", "")
    authorizationUrl(noSecondRateLimitState).then(res => {
        window.location.href = res.authorization_endpoint
    });
}

export function logout(e) {
    stopEvent(e);
    logoutUser().then(() => window.location.href = "/landing?logout=true")
}
