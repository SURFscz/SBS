import {isEmpty} from "../utils/Utils";

export const validEmailRegExp = /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;

export const validSchacHomeRegExp = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,6}$/;

const validPrefixes = [
    "ssh-rsa", "ssh-ed25519", "ecdsa-sha2-nistp256", "ecdsa-sha2-nistp384", "ecdsa-sha2-nistp521",
    "---- BEGIN SSH2 PUBLIC KEY ----", "-----BEGIN PUBLIC KEY-----", "-----BEGIN RSA PUBLIC KEY-----"
]

export const validateSSHKey = sshKey => {
    return isEmpty(sshKey) || validPrefixes.some(prefix => sshKey.startsWith(prefix));
}


export const sanitizeShortName = shortName => {
    if (!shortName) {
        return shortName;
    }
    while (!isNaN(shortName.charAt(0))) {
        shortName = shortName.substring(1);
    }
    return shortName.replace(/[^a-zA-Z_0-9]+/g, "").substring(0, 16).toLowerCase();
}
