import {isEmpty} from "../utils/Utils";

export const validEmailRegExp = /^\S+@\S+$/;///^[ \S]*<?\S+@\S+>?$/

export const validSchacHomeRegExp = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,6}$/;

export const validUrlRegExp = /(https?|ssh|ftp):\/\/(((www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.?[a-z]{0,63})|(localhost))\b([-a-zA-Z0-9@:%_+.~#?&/=]*)/i


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
const tagNameRegexp = /^[^a-z0-9]*|[^a-z_0-9-]+/gi

export const sanitizeShortName = shortName => {
    return shortName ? shortName.replace(shortNameRegexp, "").substring(0, 16).toLowerCase() : shortName;
}

export const sanitizeTagName = tagName => {
    return tagName ? tagName.replace(tagNameRegexp, "").substring(0, 32).toLowerCase() : tagName;
}

export const CO_SHORT_NAME = "{co_short_name}";
export const SRAM_USERNAME = "{username}";
