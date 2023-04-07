export function replaceQueryParameter(windowLocationSearch, name, value) {
    const urlSearchParams = new URLSearchParams(windowLocationSearch);
    urlSearchParams.set(name, value);
    return "?" + urlSearchParams.toString();
}

export function getParameterByName(name, windowLocationSearch) {
    const urlSearchParams = new URLSearchParams(windowLocationSearch);
    return urlSearchParams.get(name);
}