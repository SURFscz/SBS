import {isEmpty} from "../utils/Utils";

export const validEmailRegExp = /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;

export const validSchacHomeRegExp = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,6}$/;

export const validUrlRegExp = /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)$/;

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


const shirtNameRegexp = /^[0-9]*|[^a-zA-Z_0-9]+/g;

export const sanitizeShortName = shortName => {
    return shortName ? shortName.replace(shirtNameRegexp, "").substring(0, 16).toLowerCase() : shortName;
}

export const CO_SHORT_NAME = "{co_short_name}";
export const SRAM_USERNAME = "{username}";
