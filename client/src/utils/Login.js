import {stopEvent} from "./Utils";
import {authorizationUrl, logoutUser} from "../api";

export function login(e, currentUrl = window.location.href) {
    stopEvent(e);
    const urlSearchParams = new URLSearchParams(window.location.search);
    const state = urlSearchParams.get("state") || currentUrl;
    //We can get more queries parameters and add them to the authorizationUrl endpoint for IdP hints
    const idpHint = urlSearchParams.get("aarc_idp_hint");
    const noSecondRateLimitState = state.replace("rate-limited=true", "")
    authorizationUrl(noSecondRateLimitState, idpHint).then(res => {
        window.location.href = res.authorization_endpoint
    });
}

export function logout(e) {
    stopEvent(e);
    logoutUser().then(() => window.location.href = "/landing?logout=true")
}
