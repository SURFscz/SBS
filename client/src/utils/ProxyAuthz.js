export const CONTINUE_URL = "continue_url";

export function saveContinueURL(config, continueUrl) {
    const continueUrlTrusted = config.continue_eduteams_redirect_uri;
    if (!continueUrl || !continueUrl.toLowerCase().startsWith(continueUrlTrusted.toLowerCase())) {
        throw new Error(`Invalid continue url: '${continueUrl}'`)
    }
    localStorage.setItem(CONTINUE_URL, continueUrl);
}

export function doRedirectToProxyLocation() {
    const continueUrl = localStorage.getItem(CONTINUE_URL);
    localStorage.removeItem(CONTINUE_URL);
    window.location.href = continueUrl;
}

export function redirectToProxyLocation(location, history, config) {
    const url = new URL(location);
    const urlTrusted = config.continue_eduteams_redirect_uri;
    if (location.toLowerCase().startsWith(urlTrusted.toLowerCase())) {
        localStorage.removeItem(CONTINUE_URL);
        window.location.href = location;
    } else {
        history.push(url.pathname + url.search);
    }
}
