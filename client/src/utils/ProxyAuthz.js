const CONTINUE_URL = "continue_url";

const isValidContinueURL = (config, continueUrl) => {
    const continueUrlEduTeamsTrusted = config.continue_eduteams_redirect_uri;
    const continueUrlEBTrusted = config.continue_eb_redirect_uri;
    return continueUrl && (continueUrl.toLowerCase().startsWith(continueUrlEduTeamsTrusted.toLowerCase()) ||
        new RegExp(continueUrlEBTrusted, "i").test(continueUrl));
}


export function saveContinueURL(config, continueUrl) {
    if (!isValidContinueURL(config, continueUrl)) {
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
    if (isValidContinueURL(config, location)) {
        localStorage.removeItem(CONTINUE_URL);
        window.location.href = location;
    } else {
        const url = new URL(location);
        history.push(url.pathname + url.search);
    }
}
