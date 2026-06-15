import {AppConfig} from "@/api/config";

const CONTINUE_URL = "continue_url";

const isValidContinueURL = (config: AppConfig, continueUrl: string | null): continueUrl is string => {
    const continueUrlEduTeamsTrusted = config.continue_eduteams_redirect_uri;
    const continueUrlEBTrusted = config.continue_eb_redirect_uri;
    return continueUrl !== null && (continueUrl.toLowerCase().startsWith(continueUrlEduTeamsTrusted.toLowerCase()) ||
        new RegExp(continueUrlEBTrusted, "i").test(continueUrl) || continueUrl.startsWith("http://localhost"));
}

export function saveContinueURL(config: AppConfig, continueUrl: string | null): void {
    if (!isValidContinueURL(config, continueUrl)) {
        throw new Error(`Invalid continue url: '${continueUrl}'`)
    }
    localStorage.setItem(CONTINUE_URL, continueUrl);
}

export function doRedirectToProxyLocation(): void {
    const continueUrl = localStorage.getItem(CONTINUE_URL);
    localStorage.removeItem(CONTINUE_URL);
    if (!continueUrl) {
        throw new Error("No continue url found");
    }
    window.location.href = continueUrl;
}

export function redirectToProxyLocation(location: string, history: { push: (path: string) => void }, config: AppConfig): void {
    if (isValidContinueURL(config, location)) {
        localStorage.removeItem(CONTINUE_URL);
        window.location.href = location;
    } else {
        const url = new URL(location);
        history.push(url.pathname + url.search);
    }
}
