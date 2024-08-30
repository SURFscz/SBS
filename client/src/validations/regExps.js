import {isEmpty} from "../utils/Utils";

export const validEmailRegExp = /^[+a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.?[a-zA-Z]*$/;///^\S+@\S+$/;

export const validSchacHomeRegExp = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,6}$/;

export const validUrlRegExp = /(https?|ssh|ftp):\/\/(.+)/i

export const validRedirectUrlRegExp = /(https:\/\/|http:\/\/localhost)(.+)/i

const validPrefixes = [
    "---- BEGIN SSH2 PUBLIC KEY ----",
    "-----BEGIN PUBLIC KEY-----",
    "-----BEGIN RSA PUBLIC KEY-----",
    "ecdsa-sha2-nistp256",
    "ecdsa-sha2-nistp384",
    "ecdsa-sha2-nistp521",
    "sk-ecdsa-sha2-nistp256@openssh.com",
    "sk-ssh-ed25519@openssh.com",
    "ssh-dss",
    "ssh-ed25519",
    "ssh-ed25519",
    "ssh-rsa"
]

export const validateSSHKey = sshKey => {
    return isEmpty(sshKey) || validPrefixes.some(prefix => sshKey.startsWith(prefix));
}


const shortNameRegexp = /^[^a-z]*|[^a-z_0-9]+/gi

export const sanitizeShortName = shortName => {
    return shortName ? shortName.replace(shortNameRegexp, "").substring(0, 16).toLowerCase() : shortName;
}

export const sanitizeTagName = tagName => {
    return tagName ? tagName.trim().substring(0, 32).toLowerCase() : tagName;
}

export const CO_SHORT_NAME = "{co_short_name}";
export const SRAM_USERNAME = "{username}";

const uuid4RegExp = /[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}/

export const isUuid4 = value => {
    return value && uuid4RegExp.test(value);
}
