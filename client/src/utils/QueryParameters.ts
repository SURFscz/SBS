export function replaceQueryParameter(windowLocationSearch: string, name: string, value: string): string {
    const urlSearchParams = new URLSearchParams(windowLocationSearch);
    urlSearchParams.set(name, value);
    return "?" + urlSearchParams.toString();
}

export function getParameterByName(name: string, windowLocationSearch: string): string | null {
    const urlSearchParams = new URLSearchParams(windowLocationSearch);
    return urlSearchParams.get(name);
}

export function dictToQueryParams(dict: Record<string, string | number | boolean>): string {
    return Object.entries(dict).reduce((acc, item) =>
        acc + `${item[0]}=${encodeURIComponent(item[1])}&`, "?")
}
