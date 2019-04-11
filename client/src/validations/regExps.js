export const validEmailRegExp = /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
export const validNameRegExp = /^[\w \-']{1,255}$/;
export const validPublicSSHKeyRegExp = /ssh-rsa AAAA[0-9A-Za-z+/]+[=]{0,3}( [^@]+@[^@]+)?/;
export const validPublicSSH2KeyRegExp = /---- BEGIN SSH2 PUBLIC KEY ----.*/;