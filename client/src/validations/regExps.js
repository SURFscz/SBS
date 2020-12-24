export const validEmailRegExp = /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;

export const validSchacHomeRegExp = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,6}$/;

export const validPublicSSHKeyRegExp = /ssh-rsa AAAA[0-9A-Za-z+/]+[=]{0,3}( [^@]+@[^@]+)?/;

export const validPublicSSHEd25519KeyRegExp = /ssh-ed25519 AAAA[0-9A-Za-z+/]+[=]{0,3}( [^@]+@[^@]+)?/;

export const validPublicSSH2KeyRegExp = /---- BEGIN SSH2 PUBLIC KEY ----.*/;

export const sanitizeShortName = shortName => {
    if (!shortName) {
        return shortName;
    }
    while (!isNaN(shortName.charAt(0))) {
        shortName = shortName.substring(1);
    }
    return shortName.replace(/[^a-zA-Z_0-9]+/g, "").substring(0, 16).toLowerCase();
}

export const shortNameDisabled = (user, isNew, adminOfEntity) => !(user.admin || (isNew && adminOfEntity));