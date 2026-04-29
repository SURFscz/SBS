export const validEmailRegExp = /^(?:(?:"[^"]+"|[A-Za-z0-9 .!#$%&'*+/=?^_`{|}~^-]+)\s)?<([A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*)>$|^([A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*)$/;

export const validSchacHomeRegExp = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,6}$/;

export const validUrlRegExp = /(https?|ssh|ftp):\/\/(.+)/i

export const validRedirectUrlRegExp = /(https:\/\/(.+)|http:\/\/localhost(.*)|http:\/\/127\.(.*))/i
export const validTagNameRegExp = /^[a-z][a-z0-9_-]{0,31}$/;

const shortNameRegexp = /^[^a-z]*|[^a-z_0-9]+/gi

export const sanitizeShortName = shortName => {
    return shortName ? shortName.replace(shortNameRegexp, "").substring(0, 16).toLowerCase() : shortName;
}

export const sanitizeTagName = tagName => {
    return tagName ? tagName.trim().substring(0, 32).toLowerCase() : tagName;
}

export const validTagName = tagName => {
    return typeof tagName === "string" && validTagNameRegExp.test(tagName);
}

export const CO_SHORT_NAME = "{co_short_name}";
export const SRAM_USERNAME = "{username}";

const uuid4RegExp = /[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}/

export const isUuid4 = value => {
    return value && uuid4RegExp.test(value);
}
