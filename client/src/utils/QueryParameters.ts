export function replaceQueryParameter(windowLocationSearch: string, name: string, value: string) {
    const urlSearchParams = new URLSearchParams(windowLocationSearch);
    urlSearchParams.set(name, value);
    return "?" + urlSearchParams.toString();
}

export function getParameterByName(name: string, windowLocationSearch: string) {
    const urlSearchParams = new URLSearchParams(windowLocationSearch);
    return urlSearchParams.get(name);
}

export function dictToQueryParams(dict: Record<string, string | number | boolean>) {
    return Object.entries(dict).reduce((acc, item) =>
        acc + `${item[0]}=${encodeURIComponent(item[1])}&`, "?")
}
